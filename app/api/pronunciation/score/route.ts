import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { pronunciationAttempts, pronunciationSessions } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { openai, MODELS } from "@/lib/ai/openai";
import { pronunciationTipPrompt } from "@/lib/ai/prompts/pronunciation";
import { assessPronunciation } from "@/lib/azure/speech";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 МБ

const idSchema = z.string().uuid();

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "pronunciation:score", req);
  if (rl) return rl;

  const form = await req.formData();
  const audio = form.get("audio");
  const rawSessionId = form.get("sessionId");

  const parsedId = idSchema.safeParse(rawSessionId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Невалидный sessionId" }, { status: 400 });
  }
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Нет аудио" }, { status: 400 });
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Аудио пустое или слишком большое (макс 5 МБ)" },
      { status: 400 },
    );
  }

  const sessionId = parsedId.data;

  // АТОМАРНО: помечаем consumed только если ещё не consumed и владелец совпадает.
  // RETURNING вернёт строку только если апдейт реально произошёл.
  const claimed = await db
    .update(pronunciationSessions)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(pronunciationSessions.id, sessionId),
        eq(pronunciationSessions.userId, userId),
        isNull(pronunciationSessions.consumedAt),
      ),
    )
    .returning();

  if (claimed.length === 0) {
    return NextResponse.json(
      { error: "Сессия не найдена или уже использована" },
      { status: 409 },
    );
  }

  const session = claimed[0];
  const contentType = audio.type || "audio/webm";

  let result;
  try {
    const buf = await audio.arrayBuffer();
    result = await assessPronunciation({
      audio: buf,
      contentType,
      language: session.language as "de" | "en",
      referenceText: session.targetText,
    });
  } catch (e) {
    // не "съели" сессию зря: откатываем consume
    await db
      .update(pronunciationSessions)
      .set({ consumedAt: null })
      .where(eq(pronunciationSessions.id, sessionId));
    const msg = e instanceof Error ? e.message : "Ошибка анализа";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // AI-совет
  let aiTip = "";
  try {
    const { system, user } = pronunciationTipPrompt(
      session.language as "de" | "en",
      session.targetText,
      result.recognized,
      result,
      result.words,
    );
    const completion = await openai.chat.completions.create({
      model: MODELS.fast,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    aiTip = completion.choices[0].message.content?.trim() || "";
  } catch {
    // не критично
  }

  await db.insert(pronunciationAttempts).values({
    userId,
    sessionId,
    language: session.language,
    targetText: session.targetText,
    recognizedText: result.recognized,
    pronunciationScore: result.pronunciationScore,
    accuracyScore: result.accuracyScore,
    fluencyScore: result.fluencyScore,
    completenessScore: result.completenessScore,
    prosodyScore: result.prosodyScore,
    words: result.words,
    aiTipRu: aiTip || null,
  });

  return NextResponse.json({
    pronunciationScore: result.pronunciationScore,
    accuracyScore: result.accuracyScore,
    fluencyScore: result.fluencyScore,
    completenessScore: result.completenessScore,
    prosodyScore: result.prosodyScore,
    recognized: result.recognized,
    words: result.words,
    aiTip,
  });
}
