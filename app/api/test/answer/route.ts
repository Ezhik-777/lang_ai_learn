import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireUserId, setUserLanguage } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { testSessions } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { openai, MODELS } from "@/lib/ai/openai";
import { parseAiJson } from "@/lib/ai/parse";
import { TestQuestionSchema, TestFinalSchema } from "@/lib/ai/schemas";
import {
  nextQuestionPrompt,
  finalLevelPrompt,
  TOTAL_QUESTIONS,
  type TestAnswer,
} from "@/lib/ai/prompts/level-test";
import {
  readState,
  type PendingQuestion,
  type TestSessionState,
} from "@/lib/test-session";
import type { Language, CefrLevel } from "@/lib/cefr";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  answerIndex: z.number().int().min(0).max(3),
});

interface ClaimedAnswer {
  isCorrect: boolean;
  correctIndex: number;
  language: Language;
  newHistory: TestAnswer[];
  done: boolean;
  previousPending: PendingQuestion; // для rollback при сбое AI
  previousHistory: TestAnswer[];
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "test:answer", req);
  if (rl) return rl;

  const { sessionId, answerIndex } = bodySchema.parse(await req.json());

  // ШАГ 1: атомарно "забрать" ответ.
  // Транзакция с FOR UPDATE блокирует строку — параллельный запрос будет ждать,
  // а потом увидит, что pending уже null (вопрос уже отвечен) и вернёт 409.
  // AI-вызов вне транзакции, чтобы не держать lock.
  let claim: ClaimedAnswer | null = null;
  let claimError: { status: number; error: string } | null = null;

  await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(testSessions)
      .where(eq(testSessions.id, sessionId))
      .for("update");

    if (!session || session.userId !== userId) {
      claimError = { status: 404, error: "Сессия не найдена" };
      return;
    }
    if (session.finishedAt) {
      claimError = { status: 409, error: "Сессия уже завершена" };
      return;
    }

    const state = readState(session.history);
    if (!state.pending) {
      claimError = { status: 409, error: "Нет активного вопроса в сессии" };
      return;
    }
    if (state.pending.kind !== "mcq") {
      // Этот endpoint обслуживает только MCQ-фазу. Audio/speak — отдельные роуты.
      claimError = {
        status: 409,
        error: "Текущий вопрос не MCQ — используйте соответствующий endpoint",
      };
      return;
    }

    const pending = state.pending;
    const isCorrect = pending.correct === answerIndex;
    const newHistory: TestAnswer[] = [
      ...state.history,
      {
        question: pending.question,
        options: pending.options,
        correct: pending.correct,
        targetingLevel: pending.targetingLevel,
        userAnswer: answerIndex,
        isCorrect,
      },
    ];

    const done = newHistory.length >= TOTAL_QUESTIONS;
    const intermediateState: TestSessionState = {
      phase: state.phase,
      history: newHistory,
      audioHistory: state.audioHistory,
      speakHistory: state.speakHistory,
      pending: null, // освобождаем "слот" — параллельный запрос увидит конфликт
      audioPlayCount: state.audioPlayCount ?? 0,
    };

    await tx
      .update(testSessions)
      .set({ history: intermediateState as unknown as object })
      .where(eq(testSessions.id, sessionId));

    claim = {
      isCorrect,
      correctIndex: pending.correct,
      language: session.language as Language,
      newHistory,
      done,
      previousPending: pending,
      previousHistory: state.history,
    };
  });

  if (claimError) {
    const e = claimError as { status: number; error: string };
    return NextResponse.json({ error: e.error }, { status: e.status });
  }
  if (!claim) {
    return NextResponse.json({ error: "Ошибка транзакции" }, { status: 500 });
  }

  const {
    isCorrect,
    correctIndex,
    language,
    newHistory,
    done,
    previousPending,
    previousHistory,
  } = claim as ClaimedAnswer;

  // Rollback helper: возвращает сессию в состояние ДО ответа, чтобы при сбое AI
  // пользователь мог нажать ещё раз, а не упирался в 409 "нет активного вопроса".
  const rollback = async () => {
    const rolled: TestSessionState = {
      phase: "mcq",
      history: previousHistory,
      audioHistory: [],
      speakHistory: [],
      pending: previousPending,
      audioPlayCount: 0,
    };
    await db
      .update(testSessions)
      .set({ history: rolled as unknown as object })
      .where(eq(testSessions.id, sessionId));
  };

  // ШАГ 2: AI-вызовы вне транзакции
  if (done) {
    let result;
    try {
      result = await parseAiJson(TestFinalSchema, () => {
        const { system, user } = finalLevelPrompt(language, newHistory);
        return openai.chat.completions.create({
          model: MODELS.smart,
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });
      }, "test/finish level");
    } catch (e) {
      await rollback();
      throw e;
    }

    const level = result.level as CefrLevel;
    const finalState: TestSessionState = {
      phase: "done",
      history: newHistory,
      audioHistory: [],
      speakHistory: [],
      pending: null,
      audioPlayCount: 0,
    };
    await db
      .update(testSessions)
      .set({
        history: finalState as unknown as object,
        finishedAt: new Date(),
        resultLevel: level,
      })
      .where(eq(testSessions.id, sessionId));
    await setUserLanguage(userId, language, level);

    return NextResponse.json({
      done: true,
      level,
      comment: result.comment_ru,
      lastAnswerCorrect: isCorrect,
      correctAnswerIndex: correctIndex,
    });
  }

  let nextQ;
  try {
    nextQ = await parseAiJson(TestQuestionSchema, () => {
      const { system, user } = nextQuestionPrompt(language, newHistory);
      return openai.chat.completions.create({
        model: MODELS.smart,
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
    }, "test/answer next question");
  } catch (e) {
    await rollback();
    throw e;
  }

  const nextPending: PendingQuestion = {
    kind: "mcq",
    question: nextQ.question,
    options: nextQ.options,
    correct: nextQ.correct,
    targetingLevel: nextQ.targetingLevel,
    type: nextQ.type,
  };
  const newState: TestSessionState = {
    phase: "mcq",
    history: newHistory,
    audioHistory: [],
    speakHistory: [],
    pending: nextPending,
    audioPlayCount: 0,
  };

  await db
    .update(testSessions)
    .set({ history: newState as unknown as object })
    .where(eq(testSessions.id, sessionId));

  return NextResponse.json({
    done: false,
    questionIndex: newHistory.length,
    total: TOTAL_QUESTIONS,
    lastAnswerCorrect: isCorrect,
    correctAnswerIndex: correctIndex,
    question: {
      question: nextQ.question,
      options: nextQ.options,
      targetingLevel: nextQ.targetingLevel,
    },
  });
}
