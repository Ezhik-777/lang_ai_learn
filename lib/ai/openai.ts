import OpenAI from "openai";

declare global {
  var __openai: OpenAI | undefined;
}

/**
 * Lazy proxy: реальный OpenAI клиент создаётся при первом обращении,
 * а не на module init. Это нужно, чтобы Next.js build не падал когда
 * OPENAI_API_KEY доступен только в runtime (типичная конфигурация Coolify).
 */
function getClient(): OpenAI {
  if (!global.__openai) {
    global.__openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return global.__openai;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const MODELS = {
  smart: "gpt-4o",
  fast: "gpt-4o-mini",
  whisper: "whisper-1",
} as const;
