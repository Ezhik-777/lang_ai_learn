import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { listeningAttempts, listeningSessions } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { openai, MODELS } from "@/lib/ai/openai";
import { parseAiJson } from "@/lib/ai/parse";
import { ListeningCheckSchema } from "@/lib/ai/schemas";
import { listeningCheckPrompt } from "@/lib/ai/prompts/listening";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  userInput: z.string().min(1).max(400),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "listening:check", req);
  if (rl) return rl;

  const { sessionId, userInput } = bodySchema.parse(await req.json());

  // Атомарно claim
  const claimed = await db
    .update(listeningSessions)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(listeningSessions.id, sessionId),
        eq(listeningSessions.userId, userId),
        isNull(listeningSessions.consumedAt),
      ),
    )
    .returning();

  if (claimed.length === 0) {
    return NextResponse.json(
      { error: "Сессия не найдена или уже завершена" },
      { status: 409 },
    );
  }
  const session = claimed[0];

  let result;
  try {
    result = await parseAiJson(
      ListeningCheckSchema,
      () => {
        const { system, user } = listeningCheckPrompt(
          session.language as "de" | "en",
          session.targetText,
          userInput,
        );
        return openai.chat.completions.create({
          model: MODELS.smart,
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });
      },
      "listening/check",
    );
  } catch (e) {
    // не съели сессию зря
    await db
      .update(listeningSessions)
      .set({ consumedAt: null })
      .where(eq(listeningSessions.id, sessionId));
    throw e;
  }

  await db.insert(listeningAttempts).values({
    userId,
    sessionId,
    language: session.language,
    target: session.targetText,
    userInput,
    score: result.score,
    feedbackRu: result.feedback_ru,
  });

  return NextResponse.json({
    target: session.targetText,
    translation: session.translationRu,
    score: result.score,
    wrong_words: result.wrong_words,
    missed_words: result.missed_words,
    feedback_ru: result.feedback_ru,
  });
}
