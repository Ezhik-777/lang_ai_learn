import "server-only";
import { z } from "zod";

export const AZURE_LOCALES: Record<"de" | "en", string> = {
  de: "de-DE",
  en: "en-US",
};

const AzureWordSchema = z.object({
  Word: z.string(),
  PronunciationAssessment: z
    .object({
      AccuracyScore: z.number().optional(),
      ErrorType: z.string().optional(),
    })
    .optional(),
  Phonemes: z
    .array(
      z.object({
        Phoneme: z.string(),
        PronunciationAssessment: z
          .object({ AccuracyScore: z.number().optional() })
          .optional(),
      }),
    )
    .optional(),
});

const AzureNBestSchema = z.object({
  Display: z.string().optional(),
  Lexical: z.string().optional(),
  PronunciationAssessment: z
    .object({
      PronScore: z.number().optional(),
      AccuracyScore: z.number().optional(),
      FluencyScore: z.number().optional(),
      CompletenessScore: z.number().optional(),
      ProsodyScore: z.number().optional(),
    })
    .optional(),
  Words: z.array(AzureWordSchema).optional(),
});

const AzureResponseSchema = z.object({
  RecognitionStatus: z.string(),
  DisplayText: z.string().optional(),
  NBest: z.array(AzureNBestSchema).optional(),
});

export interface PronunciationAssessmentResult {
  recognized: string;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  words: Array<{
    word: string;
    accuracyScore: number;
    errorType: string;
    phonemes: Array<{ phoneme: string; accuracyScore: number }>;
  }>;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Вызывает Azure REST short-form endpoint с Pronunciation-Assessment header.
 * Принимает аудио как ArrayBuffer + mime type.
 * Возвращает нормализованный результат с clamp [0,100] на все скоры.
 */
export async function assessPronunciation(params: {
  audio: ArrayBuffer;
  contentType: string;
  language: "de" | "en";
  referenceText: string;
}): Promise<PronunciationAssessmentResult> {
  const region = process.env.AZURE_SPEECH_REGION;
  const key = process.env.AZURE_SPEECH_KEY;
  if (!region || !key) {
    throw new Error("AZURE_SPEECH_REGION/AZURE_SPEECH_KEY не заданы");
  }

  const locale = AZURE_LOCALES[params.language];
  const paConfig = {
    ReferenceText: params.referenceText,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
    EnableMiscue: true,
    EnableProsodyAssessment: true,
    PhonemeAlphabet: "IPA",
  };
  const paHeader = Buffer.from(JSON.stringify(paConfig)).toString("base64");

  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(locale)}&format=detailed`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": params.contentType,
      Accept: "application/json",
      "Pronunciation-Assessment": paHeader,
    },
    body: params.audio,
    // Streamed audio — без duplex 'half' Node 24 нормально работает с ArrayBuffer
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Azure ${res.status}: ${body.slice(0, 200)}`);
  }

  const raw = await res.json();
  const parsed = AzureResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Azure вернул неожиданный формат ответа");
  }
  const data = parsed.data;

  if (data.RecognitionStatus !== "Success") {
    throw new Error(
      data.RecognitionStatus === "InitialSilenceTimeout" ||
      data.RecognitionStatus === "BabbleTimeout"
        ? "Не слышу речи — попробуйте ещё раз ближе к микрофону"
        : `Распознавание не удалось: ${data.RecognitionStatus}`,
    );
  }

  const nbest = data.NBest?.[0];
  if (!nbest) throw new Error("Azure не вернул NBest");

  const pa = nbest.PronunciationAssessment ?? {};
  const words = (nbest.Words ?? []).slice(0, 60).map((w) => ({
    word: w.Word,
    accuracyScore: clamp(w.PronunciationAssessment?.AccuracyScore ?? 0),
    errorType: w.PronunciationAssessment?.ErrorType ?? "None",
    phonemes: (w.Phonemes ?? []).slice(0, 30).map((p) => ({
      phoneme: p.Phoneme,
      accuracyScore: clamp(p.PronunciationAssessment?.AccuracyScore ?? 0),
    })),
  }));

  return {
    recognized: nbest.Display ?? data.DisplayText ?? "",
    pronunciationScore: clamp(pa.PronScore ?? 0),
    accuracyScore: clamp(pa.AccuracyScore ?? 0),
    fluencyScore: clamp(pa.FluencyScore ?? 0),
    completenessScore: clamp(pa.CompletenessScore ?? 0),
    prosodyScore: pa.ProsodyScore != null ? clamp(pa.ProsodyScore) : null,
    words,
  };
}
