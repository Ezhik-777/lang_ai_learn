import OpenAI from "openai";

declare global {
  var __openai: OpenAI | undefined;
}

export const openai =
  global.__openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

if (process.env.NODE_ENV !== "production") global.__openai = openai;

export const MODELS = {
  smart: "gpt-4o",
  fast: "gpt-4o-mini",
  whisper: "whisper-1",
} as const;
