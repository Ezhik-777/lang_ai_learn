import "server-only";

const VOICES: Record<"de" | "en", string> = {
  de: "de-DE-KatjaNeural",
  en: "en-US-JennyNeural",
};

const LOCALES: Record<"de" | "en", string> = {
  de: "de-DE",
  en: "en-US",
};

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// LRU-style in-memory cache (ключ → mp3 ArrayBuffer)
const MAX_CACHE = 200;
const cache = new Map<string, Buffer>();

function cacheGet(key: string): Buffer | undefined {
  const v = cache.get(key);
  if (v) {
    // LRU touch
    cache.delete(key);
    cache.set(key, v);
  }
  return v;
}
function cacheSet(key: string, buf: Buffer) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, buf);
}

export async function synthesize(params: {
  text: string;
  language: "de" | "en";
  rate?: "slow" | "normal";
}): Promise<Buffer> {
  const region = process.env.AZURE_SPEECH_REGION;
  const key = process.env.AZURE_SPEECH_KEY;
  if (!region || !key) {
    throw new Error("AZURE_SPEECH_REGION/AZURE_SPEECH_KEY не заданы");
  }

  const voice = VOICES[params.language];
  const locale = LOCALES[params.language];
  const rate = params.rate === "slow" ? "-15%" : "0%";

  const cacheKey = `${params.language}:${rate}:${params.text}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const ssml = `<speak version="1.0" xml:lang="${locale}"><voice name="${voice}"><prosody rate="${rate}">${escapeXml(params.text)}</prosody></voice></speak>`;

  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "lang-ai-learn",
      },
      body: ssml,
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Azure TTS ${res.status}: ${body.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  cacheSet(cacheKey, buf);
  return buf;
}
