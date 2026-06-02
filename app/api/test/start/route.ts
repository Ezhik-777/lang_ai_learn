import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { testSessions } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { openai, MODELS } from "@/lib/ai/openai";
import { parseAiJson } from "@/lib/ai/parse";
import { TestQuestionSchema } from "@/lib/ai/schemas";
import {
  nextQuestionPrompt,
  TOTAL_QUESTIONS,
  TOTAL_AUDIO,
  TOTAL_SPEAK,
} from "@/lib/ai/prompts/level-test";
import type { TestSessionState, PendingMcq } from "@/lib/test-session";

const bodySchema = z.object({ language: z.enum(["de", "en"]) });

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "test:start", req);
  if (rl) return rl;

  const { language } = bodySchema.parse(await req.json());

  // Сначала генерим первый MCQ — если упадёт, старая сессия не теряется.
  const first = await parseAiJson(
    TestQuestionSchema,
    () => {
      const { system, user } = nextQuestionPrompt(language, []);
      return openai.chat.completions.create({
        model: MODELS.smart,
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
    },
    "test/start question",
  );

  const pending: PendingMcq = {
    kind: "mcq",
    question: first.question,
    options: first.options,
    correct: first.correct,
    targetingLevel: first.targetingLevel,
    type: first.type,
  };
  const state: TestSessionState = {
    phase: "mcq",
    history: [],
    audioHistory: [],
    speakHistory: [],
    pending,
    audioPlayCount: 0,
  };

  let sessionId: string;
  await db.transaction(async (tx) => {
    await tx
      .update(testSessions)
      .set({ finishedAt: new Date() })
      .where(
        and(
          eq(testSessions.userId, userId),
          eq(testSessions.language, language),
          isNull(testSessions.finishedAt),
        ),
      );
    const [created] = await tx
      .insert(testSessions)
      .values({
        userId,
        language,
        history: state as unknown as object,
      })
      .returning({ id: testSessions.id });
    sessionId = created.id;
  });

  return NextResponse.json({
    sessionId: sessionId!,
    phase: "mcq" as const,
    questionIndex: 0,
    total: TOTAL_QUESTIONS,
    totalAudio: TOTAL_AUDIO,
    totalSpeak: TOTAL_SPEAK,
    question: {
      question: first.question,
      options: first.options,
      targetingLevel: first.targetingLevel,
    },
  });
}
