"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SpeakButton } from "@/components/practice/SpeakButton";
import { t } from "@/lib/i18n/ru";
import type { Language } from "@/lib/cefr";

interface Task {
  taskId: string;
  prompt: string;
  grammarFocus?: string;
  vocabularyHint?: string;
}

interface ErrorItem {
  fragment: string;
  type: string;
  explanation_ru: string;
  suggestion: string;
}

interface Feedback {
  corrected: string;
  score: number;
  errors: ErrorItem[];
  next_focus_ru: string;
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

function highlightAnswer(answer: string, errors: ErrorItem[]) {
  if (errors.length === 0) return <span>{answer}</span>;
  let remaining = answer;
  const parts: React.ReactNode[] = [];
  errors.forEach((err, i) => {
    const idx = remaining.indexOf(err.fragment);
    if (idx === -1) return;
    if (idx > 0) parts.push(remaining.slice(0, idx));
    parts.push(
      <mark
        key={i}
        className="rounded bg-[var(--danger-soft)] px-0.5 text-[var(--danger)] underline decoration-[var(--danger)]/60 decoration-wavy underline-offset-[3px]"
      >
        {err.fragment}
      </mark>,
    );
    remaining = remaining.slice(idx + err.fragment.length);
  });
  if (remaining) parts.push(remaining);
  return <>{parts}</>;
}

export function SentencePractice({
  language,
  level,
  focus,
  onComplete,
}: {
  language: Language;
  level: string;
  focus?: string;
  onComplete?: (result: { score: number }) => void;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTask = async () => {
    setLoadingTask(true);
    setError(null);
    setFeedback(null);
    setAnswer("");
    try {
      const data = await postJson<Task>("/api/sentence/generate", {
        language,
        level,
        ...(focus ? { focus } : {}),
      });
      setTask(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoadingTask(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = async () => {
    if (!task || !answer.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const data = await postJson<Feedback>("/api/sentence/check", {
        taskId: task.taskId,
        userAnswer: answer,
      });
      setFeedback(data);
      onComplete?.({ score: data.score });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Task bar */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Переведите фразу</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {task?.grammarFocus && (
              <Badge tone="accent">{task.grammarFocus}</Badge>
            )}
            {task?.vocabularyHint && (
              <Badge tone="warning">{task.vocabularyHint}</Badge>
            )}
          </div>
        </div>
        {loadingTask || !task ? (
          <SkeletonLine />
        ) : (
          <p className="text-xl font-medium leading-snug tracking-tight sm:text-2xl">
            {task.prompt}
          </p>
        )}
      </Card>

      {/* Editor */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Ваш перевод</p>
          <span className="font-mono text-xs tabular-nums text-[var(--fg-muted)]">
            {answer.length}/600
          </span>
        </div>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t.sentences.placeholder}
          disabled={checking || !!feedback}
          maxLength={600}
          autoFocus
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--fg-muted)]">
            <kbd className="kbd">⌘</kbd> <kbd className="kbd">↵</kbd> чтобы
            проверить
          </p>
          {feedback ? (
            <Button onClick={loadTask}>
              {t.sentences.nextTask}
              <span aria-hidden>→</span>
            </Button>
          ) : (
            <Button
              onClick={check}
              disabled={checking || !answer.trim() || !task}
            >
              {checking ? t.sentences.checking : t.sentences.check}
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <Card className="border-[var(--danger)]/40 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
          {error}
        </Card>
      )}

      {feedback && (
        <FeedbackView
          feedback={feedback}
          answer={answer}
          language={language}
        />
      )}
    </div>
  );
}

function FeedbackView({
  feedback,
  answer,
  language,
}: {
  feedback: Feedback;
  answer: string;
  language: Language;
}) {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Score header */}
      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="eyebrow">{t.sentences.score}</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-4xl font-semibold tabular-nums tracking-tight ${
                feedback.score >= 80
                  ? "text-[var(--success)]"
                  : feedback.score >= 50
                    ? "text-[var(--warning)]"
                    : "text-[var(--danger)]"
              }`}
            >
              {feedback.score}
            </span>
            <span className="text-sm text-[var(--fg-muted)]">/100</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {feedback.errors.length > 0 ? (
            <Badge tone="danger">
              {feedback.errors.length} ошибк
              {feedback.errors.length === 1 ? "а" : "и"}
            </Badge>
          ) : (
            <Badge tone="success">без ошибок</Badge>
          )}
        </div>
      </Card>

      {/* Split: your answer vs corrected */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="space-y-2 p-5">
          <p className="eyebrow">{t.sentences.yourAnswer}</p>
          <p className="text-base leading-[1.6]">
            {highlightAnswer(answer, feedback.errors)}
          </p>
        </Card>
        <Card className="space-y-2 border-[var(--success)]/40 bg-[var(--success-soft)] p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow !text-[var(--success)]">
              {t.sentences.correctedAnswer}
            </p>
            <SpeakButton text={feedback.corrected} language={language} size="sm" />
          </div>
          <p className="text-base font-medium leading-[1.6] text-[var(--fg)]">
            {feedback.corrected}
          </p>
        </Card>
      </div>

      {/* Errors */}
      {feedback.errors.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border)] px-5 py-3">
            <p className="eyebrow">{t.sentences.errors}</p>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {feedback.errors.map((err, i) => (
              <li key={i} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-mono text-sm text-[var(--danger)] line-through decoration-[var(--danger)]/50">
                    {err.fragment}
                  </span>
                  <span className="text-[var(--fg-muted)]">→</span>
                  <span className="font-mono text-sm font-medium text-[var(--success)]">
                    {err.suggestion}
                  </span>
                  {err.type && (
                    <Badge tone="neutral" className="ml-auto">
                      {err.type}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm leading-[1.6] text-[var(--fg-secondary)]">
                  {err.explanation_ru}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {feedback.next_focus_ru && (
        <Card className="flex items-start gap-3 border-[var(--accent)]/30 bg-[var(--accent-soft)]/40 p-5">
          <span
            className="mt-0.5 text-[var(--accent)]"
            aria-hidden
          >
            ◐
          </span>
          <div className="min-w-0">
            <p className="eyebrow !text-[var(--accent)]">
              {t.sentences.nextFocus}
            </p>
            <p className="mt-1 text-sm leading-[1.6] text-[var(--fg)]">
              {feedback.next_focus_ru}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function SkeletonLine() {
  return (
    <div className="h-7 w-2/3 animate-pulse-dot rounded bg-[var(--surface-hover)]" />
  );
}
