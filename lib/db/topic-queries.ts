import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { topicProgress } from "./schema";
import type { Language } from "@/lib/cefr";

export interface WeakTopic {
  topicKey: string;
  topicLabel: string;
  attempts: number;
  correct: number;
  avgScore: number;
  lastSeenAt: Date;
}

/**
 * Возвращает топ-5 слабых тем — где avg_score низкий, при условии что есть хотя бы 2 попытки.
 * Сортирует: сначала самые слабые (низкий score), потом самые свежие.
 */
export async function getWeakTopics(
  userId: string,
  language: Language,
  limit = 5,
): Promise<WeakTopic[]> {
  const rows = await db
    .select()
    .from(topicProgress)
    .where(
      and(
        eq(topicProgress.userId, userId),
        eq(topicProgress.language, language),
        sql`${topicProgress.attempts} >= 2`,
        sql`${topicProgress.avgScore} < 80`,
      ),
    )
    .orderBy(asc(topicProgress.avgScore))
    .limit(limit);
  return rows;
}

/**
 * Возвращает все темы, по которым пользователь работал — для общей сводки.
 */
export async function getAllTopics(
  userId: string,
  language: Language,
): Promise<WeakTopic[]> {
  return db
    .select()
    .from(topicProgress)
    .where(
      and(
        eq(topicProgress.userId, userId),
        eq(topicProgress.language, language),
      ),
    )
    .orderBy(asc(topicProgress.avgScore));
}
