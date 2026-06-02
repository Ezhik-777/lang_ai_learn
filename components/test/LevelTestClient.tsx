"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n/ru";
import {
  LEVEL_DESCRIPTIONS_RU,
  type CefrLevel,
  type Language,
} from "@/lib/cefr";
import { cn } from "@/lib/utils";

interface Question {
  question: string;
  options: string[];
  targetingLevel: string;
}

interface StartResponse {
  sessionId: string;
  questionIndex: number;
  total: number;
  question: Question;
}

interface AnswerResponseNext {
  done: false;
  questionIndex: number;
  total: number;
  lastAnswerCorrect: boolean;
  correctAnswerIndex: number;
  question: Question;
}

interface AnswerResponseDone {
  done: true;
  level: CefrLevel;
  comment: string;
  lastAnswerCorrect: boolean;
  correctAnswerIndex: number;
}

type AnswerResponse = AnswerResponseNext | AnswerResponseDone;

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

export function LevelTestClient({ language }: { language: Language }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [total, setTotal] = useState(12);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    level: CefrLevel;
    comment: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<StartResponse>("/api/test/start", {
        language,
      });
      setSessionId(data.sessionId);
      setCurrent(data.question);
      setQuestionIndex(data.questionIndex);
      setTotal(data.total);
      setSelected(null);
      setRevealed(false);
      setCorrectIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = async () => {
    if (selected === null || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<AnswerResponse>("/api/test/answer", {
        sessionId,
        answerIndex: selected,
      });
      setRevealed(true);
      setCorrectIndex(data.correctAnswerIndex);

      setTimeout(() => {
        if (data.done) {
          setResult({ level: data.level, comment: data.comment });
        } else {
          setCurrent(data.question);
          setQuestionIndex(data.questionIndex);
          setTotal(data.total);
          setSelected(null);
          setRevealed(false);
          setCorrectIndex(null);
        }
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Card className="mx-auto max-w-xl space-y-5 p-8 text-center">
        <p className="eyebrow">{t.levelTest.result}</p>
        <div className="font-mono text-6xl font-semibold tracking-tight tabular-nums">
          {result.level}
        </div>
        <p className="text-sm font-medium text-[var(--fg-secondary)]">
          {LEVEL_DESCRIPTIONS_RU[result.level]}
        </p>
        {result.comment && (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left text-sm text-[var(--fg-secondary)] leading-relaxed">
            {result.comment}
          </p>
        )}
        <Button onClick={() => router.push("/dashboard")} size="lg">
          {t.levelTest.goToDashboard}
          <span aria-hidden>→</span>
        </Button>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-xl space-y-3 p-6 text-center">
        <p className="text-sm text-[var(--danger)]">{error}</p>
        <Button onClick={start} variant="secondary">
          {t.common.retry}
        </Button>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center text-sm text-[var(--fg-muted)]">
        {t.levelTest.starting}
      </Card>
    );
  }

  const progress = Math.round((questionIndex / total) * 100);

  return (
    <Card className="mx-auto max-w-2xl space-y-6 p-6 sm:p-8">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
          <span>{t.levelTest.questionOf(questionIndex + 1, total)}</span>
          <span className="font-mono tabular-nums">
            уровень {current.targetingLevel}
          </span>
        </div>
        <div className="relative h-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h2 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
        {current.question}
      </h2>

      {/* Options */}
      <ol className="space-y-2">
        {current.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = revealed && correctIndex === i;
          const isWrong = revealed && isSelected && correctIndex !== i;
          const letter = String.fromCharCode(65 + i);

          const state = isCorrect
            ? "correct"
            : isWrong
              ? "wrong"
              : isSelected
                ? "selected"
                : "idle";

          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => !revealed && !loading && setSelected(i)}
                disabled={revealed || loading}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all disabled:cursor-not-allowed",
                  {
                    "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]":
                      state === "idle",
                    "border-[var(--accent)] bg-[var(--accent-soft)]":
                      state === "selected",
                    "border-[var(--success)] bg-[var(--success-soft)]":
                      state === "correct",
                    "border-[var(--danger)] bg-[var(--danger-soft)]":
                      state === "wrong",
                  },
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold tabular-nums",
                    {
                      "border-[var(--border)] bg-[var(--surface)] text-[var(--fg-secondary)]":
                        state === "idle",
                      "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]":
                        state === "selected",
                      "border-[var(--success)] bg-[var(--success)] text-white":
                        state === "correct",
                      "border-[var(--danger)] bg-[var(--danger)] text-white":
                        state === "wrong",
                    },
                  )}
                >
                  {letter}
                </span>
                <span className="flex-1 text-[var(--fg)]">{opt}</span>
                {state === "correct" && (
                  <span className="text-xs font-medium text-[var(--success)]">
                    верно
                  </span>
                )}
                {state === "wrong" && (
                  <span className="text-xs font-medium text-[var(--danger)]">
                    мимо
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Action */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <span className="text-xs text-[var(--fg-muted)]">
          Выберите вариант и подтвердите
        </span>
        <Button
          onClick={confirm}
          disabled={selected === null || loading || revealed}
        >
          {loading ? t.common.loading : revealed ? "Далее…" : t.levelTest.next}
          <span aria-hidden>→</span>
        </Button>
      </div>
    </Card>
  );
}
