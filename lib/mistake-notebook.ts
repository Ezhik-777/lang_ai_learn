import "server-only";
import { and, eq, sql, lte, isNull, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { topicProgress, mistakeDrills } from "@/lib/db/schema";
import type { Language } from "@/lib/cefr";

/**
 * Нормализация grammar_focus в стабильный ключ.
 * "Perfekt с haben/sein" → "perfekt-haben-sein"
 */
export function normalizeTopicKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// SRS-интервалы: учим через 1, 3, 7, 14 дней, затем graduated
export const SRS_INTERVALS = [1, 3, 7, 14] as const;
const GRADUATION_STREAK = SRS_INTERVALS.length;

interface ErrorItem {
  type: string;
}

interface RecordParams {
  userId: string;
  language: Language;
  topicLabel: string;
  score: number;
  errors: ErrorItem[];
}

async function upsertTopicProgress(
  userId: string,
  language: Language,
  topicKey: string,
  topicLabel: string,
  score: number,
) {
  const isCorrect = score >= 80 ? 1 : 0;
  await db
    .insert(topicProgress)
    .values({
      userId,
      language,
      topicKey,
      topicLabel,
      attempts: 1,
      correct: isCorrect,
      avgScore: score,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        topicProgress.userId,
        topicProgress.language,
        topicProgress.topicKey,
      ],
      set: {
        attempts: sql`${topicProgress.attempts} + 1`,
        correct: sql`${topicProgress.correct} + ${isCorrect}`,
        avgScore: sql`(${topicProgress.avgScore} * ${topicProgress.attempts} + ${score}) / (${topicProgress.attempts} + 1)`,
        lastSeenAt: new Date(),
        topicLabel: sql`coalesce(nullif(${topicProgress.topicLabel}, ''), ${topicLabel})`,
      },
    });
}

/**
 * SRS update:
 * - score < 60 → срыв: streak=0, interval=1 день, due через 1 день
 * - score 60-79 → не сдвигаем, due через 1 день
 * - score >= 80 → streak++, interval = SRS_INTERVALS[streak], due через interval дней
 * - streak >= 4 → graduated_at, тема "освоена" (но если снова провал — drill восстановится)
 */
async function upsertDrill(
  userId: string,
  language: Language,
  topicKey: string,
  topicLabel: string,
  score: number,
) {
  const [existing] = await db
    .select()
    .from(mistakeDrills)
    .where(
      and(
        eq(mistakeDrills.userId, userId),
        eq(mistakeDrills.language, language),
        eq(mistakeDrills.topicKey, topicKey),
      ),
    )
    .limit(1);

  const now = new Date();
  let streak: number;
  let intervalDays: number;
  let graduatedAt: Date | null;

  if (score < 60) {
    streak = 0;
    intervalDays = 1;
    graduatedAt = null;
  } else if (score < 80) {
    streak = existing?.streak ?? 0;
    intervalDays = existing?.intervalDays ?? 1;
    graduatedAt = existing?.graduatedAt ?? null;
  } else {
    streak = (existing?.streak ?? 0) + 1;
    intervalDays =
      SRS_INTERVALS[Math.min(streak, SRS_INTERVALS.length - 1)] ?? 14;
    graduatedAt = streak >= GRADUATION_STREAK ? now : null;
  }
  const nextDue = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  await db
    .insert(mistakeDrills)
    .values({
      userId,
      language,
      topicKey,
      topicLabel,
      streak,
      intervalDays,
      nextDueAt: nextDue,
      graduatedAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        mistakeDrills.userId,
        mistakeDrills.language,
        mistakeDrills.topicKey,
      ],
      set: {
        streak,
        intervalDays,
        nextDueAt: nextDue,
        graduatedAt,
        topicLabel: sql`coalesce(nullif(${mistakeDrills.topicLabel}, ''), ${topicLabel})`,
        updatedAt: now,
      },
    });
}

/**
 * Записать результат практики в Mistake Notebook + обновить SRS-расписание.
 */
export async function recordSentenceProgress(params: RecordParams) {
  const { userId, language, topicLabel, score, errors } = params;

  const entries: Array<{ key: string; label: string }> = [];
  if (topicLabel && topicLabel.trim().length > 1) {
    entries.push({
      key: normalizeTopicKey(topicLabel),
      label: topicLabel,
    });
  }
  if (errors.length > 0) {
    const uniqueTypes = new Set(errors.map((e) => e.type));
    for (const t of uniqueTypes) {
      const label =
        t === "grammar"
          ? "Грамматика"
          : t === "vocabulary"
            ? "Лексика"
            : t === "spelling"
              ? "Орфография"
              : t === "word_order"
                ? "Порядок слов"
                : t === "punctuation"
                  ? "Пунктуация"
                  : t;
      entries.push({ key: `type:${t}`, label });
    }
  }

  for (const { key, label } of entries) {
    await upsertTopicProgress(userId, language, key, label, score);
    await upsertDrill(userId, language, key, label, score);
  }
}

/**
 * Темы для drill, у которых nextDueAt <= now и тема не graduated.
 * Сортирует от самого "просроченного" к свежему.
 */
export async function getDueDrills(
  userId: string,
  language: Language,
  limit = 10,
) {
  return db
    .select()
    .from(mistakeDrills)
    .where(
      and(
        eq(mistakeDrills.userId, userId),
        eq(mistakeDrills.language, language),
        isNull(mistakeDrills.graduatedAt),
        lte(mistakeDrills.nextDueAt, new Date()),
      ),
    )
    .orderBy(asc(mistakeDrills.nextDueAt))
    .limit(limit);
}

export async function getDueDrillsCount(userId: string, language: Language) {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(mistakeDrills)
    .where(
      and(
        eq(mistakeDrills.userId, userId),
        eq(mistakeDrills.language, language),
        isNull(mistakeDrills.graduatedAt),
        lte(mistakeDrills.nextDueAt, new Date()),
      ),
    );
  return row?.c ?? 0;
}
