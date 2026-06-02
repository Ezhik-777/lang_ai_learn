import { NextResponse } from "next/server";
import { and, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  testSessions,
  sentenceTasks,
  pronunciationSessions,
  listeningSessions,
  rateLimits,
} from "@/lib/db/schema";

export const runtime = "nodejs";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * POST-only. Защищён CRON_SECRET в Authorization: Bearer <secret>.
 * Query-string не принимаем — он попадает в логи.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET не настроен" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  const provided = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS);
  const oneDayAgo = new Date(Date.now() - ONE_DAY);

  const [tests, tasks, prons, listens, ratesDeleted] = await Promise.all([
    db
      .delete(testSessions)
      .where(
        and(
          isNull(testSessions.finishedAt),
          lt(testSessions.createdAt, sevenDaysAgo),
        ),
      )
      .returning({ id: testSessions.id }),
    db
      .delete(sentenceTasks)
      .where(
        and(
          isNull(sentenceTasks.consumedAt),
          lt(sentenceTasks.createdAt, sevenDaysAgo),
        ),
      )
      .returning({ id: sentenceTasks.id }),
    db
      .delete(pronunciationSessions)
      .where(
        and(
          isNull(pronunciationSessions.consumedAt),
          lt(pronunciationSessions.createdAt, sevenDaysAgo),
        ),
      )
      .returning({ id: pronunciationSessions.id }),
    db
      .delete(listeningSessions)
      .where(
        and(
          isNull(listeningSessions.consumedAt),
          lt(listeningSessions.createdAt, sevenDaysAgo),
        ),
      )
      .returning({ id: listeningSessions.id }),
    db.execute(
      sql`delete from ${rateLimits} where window_start < ${oneDayAgo}`,
    ),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: {
      testSessions: tests.length,
      sentenceTasks: tasks.length,
      pronunciationSessions: prons.length,
      listeningSessions: listens.length,
      rateLimits:
        ((ratesDeleted as unknown as { rowCount?: number }).rowCount ?? 0),
    },
  });
}
