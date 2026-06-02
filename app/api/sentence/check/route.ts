import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { sentenceAttempts, sentenceTasks } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { openai, MODELS } from "@/lib/ai/openai";
import { parseAiJson } from "@/lib/ai/parse";
import { SentenceFeedbackSchema } from "@/lib/ai/schemas";
import { sentenceFeedbackPrompt } from "@/lib/ai/prompts/sentence-feedback";
import { recordSentenceProgress } from "@/lib/mistake-notebook";

const bodySchema = z.object({
  taskId: z.string().uuid(),
  userAnswer: z.string().min(1).max(600),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "sentence:check", req);
  if (rl) return rl;

  const { taskId, userAnswer } = bodySchema.parse(await req.json());

  // АТОМАРНО claim задачу: только владелец, только если не consumed.
  const claimed = await db
    .update(sentenceTasks)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(sentenceTasks.id, taskId),
        eq(sentenceTasks.userId, userId),
        isNull(sentenceTasks.consumedAt),
      ),
    )
    .returning();

  if (claimed.length === 0) {
    return NextResponse.json(
      { error: "Задание не найдено или уже отвечено" },
      { status: 409 },
    );
  }
  const task = claimed[0];

  let result;
  try {
    result = await parseAiJson(
      SentenceFeedbackSchema,
      () => {
        const { system, user } = sentenceFeedbackPrompt(
          task.language as "de" | "en",
          task.level,
          task.prompt,
          userAnswer,
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
      "sentence/check",
    );
  } catch (e) {
    // Не съели задачу зря: откатываем consume
    await db
      .update(sentenceTasks)
      .set({ consumedAt: null })
      .where(eq(sentenceTasks.id, taskId));
    throw e;
  }

  await db.insert(sentenceAttempts).values({
    userId,
    language: task.language,
    prompt: task.prompt,
    userAnswer,
    aiFeedback: result,
    errorsCount: result.errors.length,
    score: result.score,
  });

  // Mistake Notebook — обновляем прогресс по грамматическим темам и типам ошибок
  try {
    await recordSentenceProgress({
      userId,
      language: task.language as "de" | "en",
      topicLabel: task.grammarFocus ?? "",
      score: result.score,
      errors: result.errors,
    });
  } catch {
    // не критично для ответа пользователю
  }

  return NextResponse.json(result);
}
