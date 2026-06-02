"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n/ru";
import type { Language } from "@/lib/cefr";
import { cn } from "@/lib/utils";

interface CheckResult {
  target: string;
  translation: string | null;
  score: number;
  wrong_words: string[];
  missed_words: string[];
  feedback_ru: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export function ListeningPractice({
  language,
  level,
}: {
  language: Language;
  level: string;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingRate, setPlayingRate] = useState<"normal" | "slow" | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrls = useRef<{ normal?: string; slow?: string }>({});

  const startNew = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUserInput("");
    setPlayCount(0);
    audioUrls.current = {};
    try {
      const data = await postJson<{ sessionId: string }>(
        "/api/listening/start",
        { language, level },
      );
      setSessionId(data.sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startNew();
    return () => {
      if (audioRef.current) audioRef.current.pause();
      Object.values(audioUrls.current).forEach(
        (u) => u && URL.revokeObjectURL(u),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = async (rate: "normal" | "slow") => {
    if (!sessionId) return;
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    try {
      let url = audioUrls.current[rate];
      if (!url) {
        const res = await fetch(
          `/api/listening/audio?sessionId=${sessionId}&rate=${rate}`,
        );
        if (!res.ok) throw new Error("Не удалось получить аудио");
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        audioUrls.current[rate] = url;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingRate(rate);
      audio.onended = () => setPlayingRate(null);
      audio.onerror = () => setPlayingRate(null);
      await audio.play();
      if (rate === "normal") setPlayCount((c) => c + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
      setPlayingRate(null);
    }
  };

  const check = async () => {
    if (!sessionId || !userInput.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const data = await postJson<CheckResult>("/api/listening/check", {
        sessionId,
        userInput,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Прослушайте фразу</p>
          {playCount > 0 && !result && (
            <Badge tone="neutral">прослушано {playCount}×</Badge>
          )}
        </div>
        {loading || !sessionId ? (
          <div className="h-7 w-2/3 animate-pulse-dot rounded bg-[var(--surface-hover)]" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => play("normal")}
                disabled={playingRate !== null || !!result}
                size="lg"
              >
                <PlayIcon />
                {playingRate === "normal" ? "Играет…" : "Воспроизвести"}
              </Button>
              <Button
                onClick={() => play("slow")}
                disabled={playingRate !== null || !!result}
                variant="secondary"
              >
                <SlowIcon />
                {playingRate === "slow" ? "Играет…" : "Медленно"}
              </Button>
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              Совет: послушайте 1–2 раза целиком, потом по фрагментам на
              медленной скорости.
            </p>
          </>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Запишите что услышали</p>
          <span className="font-mono text-xs tabular-nums text-[var(--fg-muted)]">
            {userInput.length}/400
          </span>
        </div>
        <Textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Запишите что услышали…"
          disabled={checking || !!result}
          maxLength={400}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--fg-muted)]">
            Сначала прослушайте хотя бы раз
          </p>
          {result ? (
            <Button onClick={startNew}>
              Следующая фраза
              <span aria-hidden>→</span>
            </Button>
          ) : (
            <Button
              onClick={check}
              disabled={
                checking || !userInput.trim() || !sessionId || playCount === 0
              }
            >
              {checking ? "Проверяю…" : "Проверить"}
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <Card className="border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
          {error}
        </Card>
      )}

      {result && <ListeningResult result={result} userInput={userInput} />}
    </div>
  );
}

function ListeningResult({
  result,
  userInput,
}: {
  result: CheckResult;
  userInput: string;
}) {
  return (
    <div className="space-y-3 animate-fade-in">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="eyebrow">Оценка</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-4xl font-semibold tabular-nums tracking-tight",
                result.score >= 80
                  ? "text-[var(--success)]"
                  : result.score >= 50
                    ? "text-[var(--warning)]"
                    : "text-[var(--danger)]",
              )}
            >
              {result.score}
            </span>
            <span className="text-sm text-[var(--fg-muted)]">/100</span>
          </div>
        </div>
        {(result.wrong_words.length > 0 || result.missed_words.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {result.wrong_words.length > 0 && (
              <Badge tone="danger">
                {result.wrong_words.length} неверно
              </Badge>
            )}
            {result.missed_words.length > 0 && (
              <Badge tone="warning">
                {result.missed_words.length} пропущено
              </Badge>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="space-y-2 p-5">
          <p className="eyebrow">Ваш ответ</p>
          <p className="text-base italic leading-[1.6] text-[var(--fg-secondary)]">
            «{userInput}»
          </p>
        </Card>
        <Card className="space-y-2 border-[var(--success)]/40 bg-[var(--success-soft)] p-5">
          <p className="eyebrow !text-[var(--success)]">Произнесено</p>
          <p className="text-base font-medium leading-[1.6]">{result.target}</p>
          {result.translation && (
            <p className="text-xs text-[var(--fg-muted)]">
              {result.translation}
            </p>
          )}
        </Card>
      </div>

      {(result.wrong_words.length > 0 || result.missed_words.length > 0) && (
        <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {result.wrong_words.length > 0 && (
            <div>
              <p className="eyebrow !text-[var(--danger)]">Неверно</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.wrong_words.map((w, i) => (
                  <Badge key={i} tone="danger">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {result.missed_words.length > 0 && (
            <div>
              <p className="eyebrow !text-[var(--warning)]">Пропустили</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.missed_words.map((w, i) => (
                  <Badge key={i} tone="warning">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {result.feedback_ru && (
        <Card className="flex items-start gap-3 border-[var(--accent)]/30 bg-[var(--accent-soft)]/40 p-5">
          <span className="mt-0.5 text-[var(--accent)]" aria-hidden>
            ◐
          </span>
          <div>
            <p className="eyebrow !text-[var(--accent)]">Что подтянуть</p>
            <p className="mt-1 text-sm leading-[1.6]">{result.feedback_ru}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="currentColor">
      <path d="M3 1.5v11l9-5.5z" />
    </svg>
  );
}

function SlowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="currentColor">
      <path d="M2 1.5v11l5-5.5z" />
      <path d="M7 1.5v11l5-5.5z" />
    </svg>
  );
}
