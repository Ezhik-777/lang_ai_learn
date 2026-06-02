import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/db/queries";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { synthesize } from "@/lib/azure/tts";

export const runtime = "nodejs";

const bodySchema = z.object({
  text: z.string().min(1).max(300),
  language: z.enum(["de", "en"]),
  rate: z.enum(["slow", "normal"]).default("normal"),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "tts:speak", req);
  if (rl) return rl;

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bad request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const audio = await synthesize(body);
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=86400",
        "Content-Length": String(audio.length),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TTS failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
