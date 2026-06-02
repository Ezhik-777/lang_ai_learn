import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { pronunciationSessions } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { openai, MODELS } from "@/lib/ai/openai";
import { parseAiJson } from "@/lib/ai/parse";
import { PronunciationPhraseSchema } from "@/lib/ai/schemas";
import { LANGUAGES } from "@/lib/cefr";

const bodySchema = z.object({
  language: z.enum(["de", "en"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("A2"),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "pronunciation:phrase", req);
  if (rl) return rl;

  const { language, level } = bodySchema.parse(await req.json());
  const lang = LANGUAGES[language].nameRu;
  const target = lang === "Немецкий" ? "немецкий" : "английский";

  const langInstructions =
    language === "de"
      ? `ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА для немецкого:
- ВСЕ умлауты на месте: ä, ö, ü, ß — никогда не пиши "Schone" вместо "Schöne", "fur" вместо "für", "uber" вместо "über".
- Существительные с заглавной буквы.
- Включай звуки сложные для русскоязычных: ü, ö, ä, ch [ç/x], r [ʁ], st-/sp- в начале, h в начале слога, длинные/короткие гласные.`
      : `ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА для английского:
- Корректная орфография.
- Включай сложные для русскоязычных звуки: θ/ð (th), w vs v, æ vs e, ɪ vs i:, ŋ, schwa.`;

  const result = await parseAiJson(
    PronunciationPhraseSchema,
    () =>
      openai.chat.completions.create({
        model: MODELS.smart,
        response_format: { type: "json_object" },
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: `Сгенерируй короткую фразу на ${target} для тренировки произношения русскоязычного студента уровня CEFR ${level}.

ТРЕБОВАНИЯ:
- Длина: 5-10 слов.
- Фраза БЫТОВАЯ, ПРАКТИЧЕСКАЯ (кафе, работа, маршрут, дружеский разговор, эмоция). НЕ философия, не абстрактная академщина.
- Подходит уровню: A1/A2 — простые повседневные ситуации; B1/B2 — обычная речь с разговорными оборотами; C1/C2 — сложнее лексически, но всё равно ЖИВЫЕ фразы.
- Содержит 2-3 фонетически сложных для русскоязычных звука.

${langInstructions}

ПЕРЕВОД на русский:
- Натуральный, разговорный русский — НЕ калька, НЕ дословный пословный перевод.
- Так чтобы человек реально мог это сказать по-русски.

Верни строго JSON: {"phrase": string, "translation_ru": string, "focus_sounds_ru": string}.
focus_sounds_ru — 1 короткая фраза: какие звуки тренируем (например: "звуки ü, ch, r").`,
          },
          { role: "user", content: `Уровень ${level}. Новая фраза.` },
        ],
      }),
    "pronunciation/phrase",
  );

  const [session] = await db
    .insert(pronunciationSessions)
    .values({
      userId,
      language,
      targetText: result.phrase,
      translationRu: result.translation_ru,
      focusSoundsRu: result.focus_sounds_ru,
    })
    .returning({ id: pronunciationSessions.id });

  return NextResponse.json({
    sessionId: session.id,
    phrase: result.phrase,
    translation: result.translation_ru,
    focus: result.focus_sounds_ru,
  });
}
