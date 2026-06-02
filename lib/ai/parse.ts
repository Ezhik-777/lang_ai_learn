import { z } from "zod";
import { openai } from "./openai";

/**
 * Парсит и валидирует JSON-ответ OpenAI через zod-схему.
 * При невалидном JSON или непрохождении схемы — один retry с уточнением.
 */
export async function parseAiJson<T>(
  schema: z.ZodType<T>,
  call: () => Promise<{ choices: { message: { content: string | null } }[] }>,
  context: string,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await call();
    const content = completion.choices[0]?.message?.content?.trim() || "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      if (attempt === 0) continue;
      throw new Error(`AI вернул невалидный JSON (${context})`);
    }
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    if (attempt === 0) continue;
    throw new Error(
      `AI вернул структуру вне схемы (${context}): ${result.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; ")}`,
    );
  }
  throw new Error("unreachable");
}

export { openai };
