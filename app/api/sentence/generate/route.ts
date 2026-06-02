import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { sentenceTasks } from "@/lib/db/schema";
import { rateLimitOrResponse } from "@/lib/rate-limit";
import { openai, MODELS } from "@/lib/ai/openai";
import { parseAiJson } from "@/lib/ai/parse";
import { SentenceGenSchema } from "@/lib/ai/schemas";
import { sentenceGeneratorPrompt } from "@/lib/ai/prompts/sentence-generator";

const bodySchema = z.object({
  language: z.enum(["de", "en"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("A2"),
  focus: z.string().min(2).max(150).optional(),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  const rl = await rateLimitOrResponse(userId, "sentence:generate", req);
  if (rl) return rl;

  const { language, level, focus } = bodySchema.parse(await req.json());

  const recent = await db
    .select({ prompt: sentenceTasks.prompt })
    .from(sentenceTasks)
    .where(eq(sentenceTasks.userId, userId))
    .orderBy(desc(sentenceTasks.createdAt))
    .limit(5);

  const result = await parseAiJson(
    SentenceGenSchema,
    () => {
      const { system, user } = sentenceGeneratorPrompt(
        language,
        level,
        recent.map((r) => r.prompt),
        focus,
      );
      return openai.chat.completions.create({
        model: MODELS.fast,
        response_format: { type: "json_object" },
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
    },
    "sentence/generate",
  );

  const [task] = await db
    .insert(sentenceTasks)
    .values({
      userId,
      language,
      level,
      prompt: result.prompt_ru,
      grammarFocus: result.grammar_focus,
      vocabularyHint: result.vocabulary_hint,
    })
    .returning({ id: sentenceTasks.id });

  return NextResponse.json({
    taskId: task.id,
    prompt: result.prompt_ru,
    grammarFocus: result.grammar_focus,
    vocabularyHint: result.vocabulary_hint,
  });
}
