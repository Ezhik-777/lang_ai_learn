import { auth } from "@clerk/nextjs/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./index";
import {
  users,
  userLanguages,
  sentenceAttempts,
  pronunciationAttempts,
  listeningAttempts,
} from "./schema";
import type { Language } from "@/lib/cefr";

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
  return userId;
}

export async function getUserLanguages(userId: string) {
  return db
    .select()
    .from(userLanguages)
    .where(eq(userLanguages.userId, userId))
    .orderBy(desc(userLanguages.updatedAt));
}

export async function getPrimaryLanguage(userId: string): Promise<Language | null> {
  const rows = await getUserLanguages(userId);
  if (rows.length === 0) return null;
  return rows[0].language;
}

export async function setUserLanguage(
  userId: string,
  language: Language,
  cefrLevel: string | null = null,
) {
  await db
    .insert(userLanguages)
    .values({ userId, language, cefrLevel: cefrLevel as never })
    .onConflictDoUpdate({
      target: [userLanguages.userId, userLanguages.language],
      set: { cefrLevel: cefrLevel as never, updatedAt: new Date() },
    });
}

export async function recentSentences(userId: string, language: Language, limit = 10) {
  return db
    .select()
    .from(sentenceAttempts)
    .where(
      and(
        eq(sentenceAttempts.userId, userId),
        eq(sentenceAttempts.language, language),
      ),
    )
    .orderBy(desc(sentenceAttempts.createdAt))
    .limit(limit);
}

export async function recentPronunciation(
  userId: string,
  language: Language,
  limit = 10,
) {
  return db
    .select()
    .from(pronunciationAttempts)
    .where(
      and(
        eq(pronunciationAttempts.userId, userId),
        eq(pronunciationAttempts.language, language),
      ),
    )
    .orderBy(desc(pronunciationAttempts.createdAt))
    .limit(limit);
}

export async function recentListening(
  userId: string,
  language: Language,
  limit = 10,
) {
  return db
    .select()
    .from(listeningAttempts)
    .where(
      and(
        eq(listeningAttempts.userId, userId),
        eq(listeningAttempts.language, language),
      ),
    )
    .orderBy(desc(listeningAttempts.createdAt))
    .limit(limit);
}

export async function userStats(userId: string, language: Language) {
  const [agg] = await db
    .select({
      sentencesCount: sql<number>`count(*)::int`,
      avgScore: sql<number>`coalesce(avg(${sentenceAttempts.score}), 0)::int`,
    })
    .from(sentenceAttempts)
    .where(
      and(
        eq(sentenceAttempts.userId, userId),
        eq(sentenceAttempts.language, language),
      ),
    );

  const [pron] = await db
    .select({
      pronCount: sql<number>`count(*)::int`,
      avgSimilarity: sql<number>`coalesce(avg(${pronunciationAttempts.pronunciationScore}), 0)::int`,
    })
    .from(pronunciationAttempts)
    .where(
      and(
        eq(pronunciationAttempts.userId, userId),
        eq(pronunciationAttempts.language, language),
      ),
    );

  const [listen] = await db
    .select({
      listenCount: sql<number>`count(*)::int`,
      avgListen: sql<number>`coalesce(avg(${listeningAttempts.score}), 0)::int`,
    })
    .from(listeningAttempts)
    .where(
      and(
        eq(listeningAttempts.userId, userId),
        eq(listeningAttempts.language, language),
      ),
    );

  // Streak теперь учитывает все 3 источника активности
  const streakResult = await db.execute<{ streak: number }>(sql`
    with days as (
      select distinct date(created_at at time zone 'UTC') as d
      from sentence_attempts
      where user_id = ${userId} and language = ${language}
      union
      select distinct date(created_at at time zone 'UTC') as d
      from pronunciation_attempts
      where user_id = ${userId} and language = ${language}
      union
      select distinct date(created_at at time zone 'UTC') as d
      from listening_attempts
      where user_id = ${userId} and language = ${language}
    ), ordered as (
      select d, row_number() over (order by d desc) as rn from days
    ), grp as (
      select d, rn, d + (rn || ' day')::interval as g from ordered
    )
    select count(*)::int as streak
    from grp
    where g = (select g from grp where d = current_date or d = current_date - interval '1 day' limit 1)
  `);

  return {
    sentencesCount: agg?.sentencesCount ?? 0,
    avgScore: agg?.avgScore ?? 0,
    pronCount: pron?.pronCount ?? 0,
    avgSimilarity: pron?.avgSimilarity ?? 0,
    listenCount: listen?.listenCount ?? 0,
    avgListen: listen?.avgListen ?? 0,
    streak: streakResult.rows[0]?.streak ?? 0,
  };
}
