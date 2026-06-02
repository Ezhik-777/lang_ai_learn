import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { listeningSessions } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { synthesize } from "@/lib/azure/tts";

export const runtime = "nodejs";

const idSchema = z.string().uuid();
const rateSchema = z.enum(["slow", "normal"]).default("normal");

export async function GET(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "listening:audio", req);
  if (rl) return rl;

  const url = new URL(req.url);
  const idRes = idSchema.safeParse(url.searchParams.get("sessionId"));
  if (!idRes.success) {
    return NextResponse.json({ error: "Bad sessionId" }, { status: 400 });
  }
  const rateRes = rateSchema.safeParse(url.searchParams.get("rate") || "normal");
  const rate = rateRes.success ? rateRes.data : "normal";

  const [session] = await db
    .select()
    .from(listeningSessions)
    .where(eq(listeningSessions.id, idRes.data))
    .limit(1);

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }
  if (session.consumedAt) {
    return NextResponse.json(
      { error: "Сессия завершена" },
      { status: 409 },
    );
  }

  try {
    const audio = await synthesize({
      text: session.targetText,
      language: session.language as "de" | "en",
      rate,
    });
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(audio.length),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TTS error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
