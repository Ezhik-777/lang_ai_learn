import { sql } from "drizzle-orm";
import { db } from "./db";
import { rateLimits } from "./db/schema";

export interface RateLimitConfig {
  bucket: string;
  limit: number;
  windowSec: number;
}

export class RateLimitError extends Error {
  constructor(
    public bucket: string,
    public limit: number,
    public retryAfterSec: number,
  ) {
    super(
      `Rate limit exceeded for "${bucket}": ${limit} per ${retryAfterSec}s`,
    );
  }
}

/**
 * Атомарный fixed-window rate limit на Postgres.
 * Окно — округлённый старт (например, текущая минута/час).
 * Возвращает текущий счётчик, бросает RateLimitError если превышен.
 */
export async function enforceRateLimit(
  userId: string,
  config: RateLimitConfig,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const windowStartSec = Math.floor(now / config.windowSec) * config.windowSec;
  const windowStart = new Date(windowStartSec * 1000);

  const [row] = await db
    .insert(rateLimits)
    .values({
      userId,
      bucket: config.bucket,
      windowStart,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [rateLimits.userId, rateLimits.bucket, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  if ((row?.count ?? 0) > config.limit) {
    const retryAfter = windowStartSec + config.windowSec - now;
    throw new RateLimitError(config.bucket, config.limit, retryAfter);
  }
}

/**
 * Применяет несколько rate-limit конфигов подряд (например, per-minute + per-day).
 */
export async function enforceRateLimits(
  userId: string,
  configs: RateLimitConfig[],
): Promise<void> {
  for (const c of configs) await enforceRateLimit(userId, c);
}

// Стандартные конфиги для AI endpoints
export const AI_LIMITS = {
  burst: (bucket: string): RateLimitConfig => ({
    bucket: `${bucket}:burst`,
    limit: 20,
    windowSec: 60,
  }),
  daily: (bucket: string): RateLimitConfig => ({
    bucket: `${bucket}:daily`,
    limit: 300,
    windowSec: 86_400,
  }),
};

/**
 * Удобный хелпер: применяет burst + daily лимиты к paircо двух ключей (userId + ip).
 * Возвращает Response при превышении, иначе null.
 */
export async function rateLimitOrResponse(
  userId: string,
  bucket: string,
  req?: Request,
): Promise<Response | null> {
  const keys = [`user:${userId}`];
  const ip = req ? getClientIp(req) : null;
  if (ip) keys.push(`ip:${ip}`);

  try {
    for (const key of keys) {
      await enforceRateLimits(key, [
        AI_LIMITS.burst(bucket),
        AI_LIMITS.daily(bucket),
      ]);
    }
    return null;
  } catch (e) {
    if (e instanceof RateLimitError) {
      return Response.json(
        {
          error: e.bucket.endsWith(":daily")
            ? "Дневной лимит запросов исчерпан. Попробуйте завтра."
            : "Слишком много запросов. Подождите минуту и попробуйте снова.",
          retryAfterSec: e.retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(e.retryAfterSec) },
        },
      );
    }
    throw e;
  }
}

/**
 * Достаёт client IP из заголовков прокси.
 * За Coolify/nginx/Vercel — x-forwarded-for. Берём первый IP в списке.
 */
export function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}
