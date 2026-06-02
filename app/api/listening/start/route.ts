import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { listeningSessions } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { openai, MODELS } from "@/lib/ai/openai";
import { parseAiJson } from "@/lib/ai/parse";
import { ListeningSentenceSchema } from "@/lib/ai/schemas";
import { listeningSentencePrompt } from "@/lib/ai/prompts/listening";

const bodySchema = z.object({
  language: z.enum(["de", "en"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("A2"),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "listening:start", req);
  if (rl) return rl;

  const { language, level } = bodySchema.parse(await req.json());

  const result = await parseAiJson(
    ListeningSentenceSchema,
    () => {
      const { system, user } = listeningSentencePrompt(language, level);
      return openai.chat.completions.create({
        model: MODELS.smart,
        response_format: { type: "json_object" },
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
    },
    "listening/start",
  );

  const [session] = await db
    .insert(listeningSessions)
    .values({
      userId,
      language,
      level,
      targetText: result.target,
      translationRu: result.translation_ru,
    })
    .returning({ id: listeningSessions.id });

  // target НЕ возвращаем — только sessionId. Клиент получит аудио по нему.
  return NextResponse.json({ sessionId: session.id });
}
