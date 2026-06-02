"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpeakButton } from "@/components/practice/SpeakButton";
import { t } from "@/lib/i18n/ru";
import type { Language } from "@/lib/cefr";
import { cn } from "@/lib/utils";

const MAX_DURATION_MS = 20_000;

interface Phrase {
  sessionId: string;
  phrase: string;
  translation: string;
  focus: string;
}

interface Phoneme {
  phoneme: string;
  accuracyScore: number;
}
interface WordResult {
  word: string;
  accuracyScore: number;
  errorType: string;
  phonemes: Phoneme[];
}
interface Assessment {
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  recognized: string;
  words: WordResult[];
  aiTip?: string;
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

function toneClass(s: number) {
  if (s >= 80) return "text-[var(--success)]";
  if (s >= 60) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}
function toneBg(s: number) {
  if (s >= 80) return "bg-[var(--success-soft)] text-[var(--success)]";
  if (s >= 60) return "bg-[var(--warning-soft)] text-[var(--warning)]";
  return "bg-[var(--danger-soft)] text-[var(--danger)]";
}

export function PronunciationPractice({
  language,
  level,
}: {
  language: Language;
  level: string;
}) {
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Assessment | null>(null);
  const [micDenied, setMicDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPhrase = async () => {
    setError(null);
    setResult(null);
    setPhrase(null);
    try {
      const data = await postJson<Phrase>("/api/pronunciation/phrase", {
        language,
        level,
      });
      setPhrase(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPhrase();
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      recorderRef.current?.stream
        .getTracks()
        .forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    if (!phrase) return;
    setError(null);
    setResult(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicDenied(true);
      return;
    }

    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "";
    const mr = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    recorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      recorderRef.current = null;
      setRecording(false);
      setAnalyzing(true);
      try {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        if (blob.size === 0) {
          throw new Error("Запись пустая — попробуйте ещё раз");
        }
        const form = new FormData();
        form.append(
          "audio",
          new File([blob], "audio.webm", { type: blob.type }),
        );
        form.append("sessionId", phrase.sessionId);
        const res = await fetch("/api/pronunciation/score", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as Assessment & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.common.error);
      } finally {
        setAnalyzing(false);
      }
    };

    mr.start();
    setRecording(true);
    stopTimerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, MAX_DURATION_MS);
  };

  const stopRecording = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  if (micDenied) {
    return (
      <Card className="border-[var(--danger)]/40 bg-[var(--danger-soft)] p-5 text-sm text-[var(--danger)]">
        {t.pronunciation.micDenied}
      </Card>
    );
  }

  const status = analyzing
    ? t.pronunciation.analyzing
    : recording
      ? "Запись идёт…"
      : result
        ? "Запись завершена"
        : phrase
          ? "Нажмите и произнесите фразу"
          : t.common.loading;

  return (
    <div className="space-y-5">
      {/* Target phrase */}
      <Card className="space-y-3 p-6 text-center sm:p-8">
        <p className="eyebrow">{t.pronunciation.target}</p>
        {phrase ? (
          <>
            <div className="flex items-start justify-center gap-3">
              <p className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {phrase.phrase}
              </p>
              <SpeakButton text={phrase.phrase} language={language} />
            </div>
            <p className="text-sm text-[var(--fg-secondary)]">
              {phrase.translation}
            </p>
            {phrase.focus && (
              <div className="flex justify-center pt-1">
                <Badge tone="accent">
                  <span className="inline-block size-1.5 rounded-full bg-[var(--accent)]" />
                  {phrase.focus}
                </Badge>
              </div>
            )}
          </>
        ) : (
          <div className="mx-auto h-7 w-2/3 animate-pulse-dot rounded bg-[var(--surface-hover)]" />
        )}
      </Card>

      {/* Recorder */}
      <Card className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "relative inline-flex size-2.5 rounded-full",
              recording
                ? "bg-[var(--danger)]"
                : analyzing
                  ? "bg-[var(--warning)]"
                  : result
                    ? "bg-[var(--success)]"
                    : "bg-[var(--fg-muted)]",
            )}
          >
            {recording && (
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--danger)] opacity-60" />
            )}
          </span>
          <span className="text-sm text-[var(--fg-secondary)]">{status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!recording ? (
            <Button
              onClick={startRecording}
              disabled={analyzing || !phrase || !!result}
              size="lg"
            >
              <span className="inline-block size-2 rounded-full bg-current" />
              {t.pronunciation.start}
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="danger" size="lg">
              <span className="inline-block size-2 rounded-sm bg-current" />
              {t.pronunciation.stop}
            </Button>
          )}
          {result && (
            <Button onClick={loadPhrase} variant="secondary">
              {t.pronunciation.newPhrase}
              <span aria-hidden>→</span>
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <Card className="border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
          {error}
        </Card>
      )}

      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }: { result: Assessment }) {
  const subScores: Array<{ label: string; value: number }> = [
    { label: "Точность", value: result.accuracyScore },
    { label: "Беглость", value: result.fluencyScore },
    { label: "Полнота", value: result.completenessScore },
  ];
  if (result.prosodyScore != null) {
    subScores.push({ label: "Просодия", value: result.prosodyScore });
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Score gauge */}
      <Card className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex justify-center sm:justify-start">
          <ScoreRing value={Math.round(result.pronunciationScore)} />
        </div>
        <div className="space-y-4">
          <div>
            <p className="eyebrow">Произношение · общий балл</p>
            <p className="mt-1 text-sm text-[var(--fg-secondary)]">
              На основе точности звуков, беглости и интонации
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {subScores.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              >
                <div className="text-[11px] text-[var(--fg-muted)]">
                  {s.label}
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-xl font-semibold tabular-nums tracking-tight",
                    toneClass(s.value),
                  )}
                >
                  {Math.round(s.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* What we heard */}
      <Card className="space-y-2 p-5">
        <p className="eyebrow">{t.pronunciation.youSaid}</p>
        <p className="text-lg italic text-[var(--fg)]">
          «{result.recognized}»
        </p>
      </Card>

      {/* Per-word */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <p className="eyebrow">По словам</p>
        </div>
        <div className="flex flex-wrap gap-2 p-5">
          {result.words.map((w, i) => (
            <details
              key={i}
              className="group rounded-lg border border-[var(--border)] bg-[var(--surface-2)] [&_summary::-webkit-details-marker]:hidden"
            >
              <summary
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium",
                  toneBg(w.accuracyScore),
                )}
              >
                <span>{w.word}</span>
                <span className="font-mono text-xs tabular-nums opacity-70">
                  {Math.round(w.accuracyScore)}
                </span>
                {w.phonemes.length > 0 && (
                  <span className="text-xs opacity-50 transition-transform group-open:rotate-180">
                    ▾
                  </span>
                )}
              </summary>
              {(w.phonemes.length > 0 || w.errorType !== "None") && (
                <div className="space-y-1.5 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  {w.phonemes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {w.phonemes.map((p, j) => (
                        <span
                          key={j}
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[11px]",
                            toneBg(p.accuracyScore),
                          )}
                        >
                          /{p.phoneme}/ {Math.round(p.accuracyScore)}
                        </span>
                      ))}
                    </div>
                  )}
                  {w.errorType !== "None" && (
                    <div className="text-[11px] text-[var(--fg-muted)]">
                      {w.errorType}
                    </div>
                  )}
                </div>
              )}
            </details>
          ))}
        </div>
      </Card>

      {result.aiTip && (
        <Card className="flex items-start gap-3 border-[var(--accent)]/30 bg-[var(--accent-soft)]/40 p-5">
          <span className="mt-0.5 text-[var(--accent)]" aria-hidden>
            ◐
          </span>
          <div>
            <p className="eyebrow !text-[var(--accent)]">
              {t.pronunciation.overall}
            </p>
            <p className="mt-1 text-sm leading-[1.6] text-[var(--fg)]">
              {result.aiTip}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const tone =
    value >= 80
      ? "stroke-[var(--success)]"
      : value >= 60
        ? "stroke-[var(--warning)]"
        : "stroke-[var(--danger)]";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-[var(--surface-hover)]"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          className={cn("transition-all duration-700 ease-out", tone)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-3xl font-semibold tabular-nums tracking-tight",
            toneClass(value),
          )}
        >
          {value}
        </span>
        <span className="text-[10px] tracking-wider text-[var(--fg-muted)] uppercase">
          из 100
        </span>
      </div>
    </div>
  );
}
