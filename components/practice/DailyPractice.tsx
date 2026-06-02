"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SentencePractice } from "@/components/practice/SentencePractice";
import { PronunciationPractice } from "@/components/practice/PronunciationPractice";
import { ListeningPractice } from "@/components/practice/ListeningPractice";
import type { Language } from "@/lib/cefr";

interface DailyStep {
  kind: "sentence" | "pronunciation" | "listening";
  label: string;
  focus?: string;
  reason: "drill" | "new" | "speak" | "listen";
}
interface DailyPlan {
  language: Language;
  level: string;
  steps: DailyStep[];
  dueDrillsTotal: number;
}

interface StepResult {
  kind: DailyStep["kind"];
  score?: number;
}

export function DailyPractice() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [results, setResults] = useState<StepResult[]>([]);
  const [stepDone, setStepDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/practice/today");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!cancelled) setPlan(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 text-red-700">
        <div>{error}</div>
        <div className="mt-2 text-sm">
          <Link href="/dashboard" className="underline">
            Назад в дашборд
          </Link>
        </div>
      </Card>
    );
  }
  if (!plan) {
    return (
      <Card className="text-zinc-500">Собираем план на сегодня…</Card>
    );
  }

  const total = plan.steps.length;
  const isComplete = stepIndex >= total;

  if (isComplete) return <Summary plan={plan} results={results} />;

  const step = plan.steps[stepIndex];

  const advance = (score?: number) => {
    setResults((r) => [...r, { kind: step.kind, score }]);
    setStepIndex((i) => i + 1);
    setStepDone(false);
  };

  return (
    <div className="space-y-6">
      <ProgressBar current={stepIndex} total={total} />
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              Шаг {stepIndex + 1} из {total} ·{" "}
              {step.reason === "drill"
                ? "Повторение"
                : step.reason === "new"
                  ? "Новое"
                  : step.reason === "speak"
                    ? "Голос"
                    : "Слух"}
            </div>
            <div className="mt-0.5 text-base font-medium">{step.label}</div>
          </div>
          <Button onClick={() => advance()} variant="ghost" size="sm">
            Пропустить →
          </Button>
        </div>
      </Card>

      {/* Каждый шаг — отдельный компонент. key={stepIndex} → новый mount при смене шага */}
      <div key={stepIndex}>
        {step.kind === "sentence" && (
          <SentencePractice
            language={plan.language}
            level={plan.level}
            focus={step.focus}
            onComplete={() => setStepDone(true)}
          />
        )}
        {step.kind === "pronunciation" && (
          <PronunciationPractice language={plan.language} level={plan.level} />
        )}
        {step.kind === "listening" && (
          <ListeningPractice language={plan.language} level={plan.level} />
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => advance()} disabled={!stepDone && step.kind === "sentence"}>
          {stepIndex + 1 === total ? "Завершить сессию" : "Дальше →"}
        </Button>
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-500">
        <span>Прогресс сессии</span>
        <span>
          {current}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-zinc-900 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Summary({
  plan,
  results,
}: {
  plan: DailyPlan;
  results: StepResult[];
}) {
  const sentenceScores = results.filter((r) => r.score != null).map((r) => r.score!);
  const avg =
    sentenceScores.length > 0
      ? Math.round(
          sentenceScores.reduce((a, b) => a + b, 0) / sentenceScores.length,
        )
      : null;

  return (
    <Card className="space-y-4 text-center">
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        Сессия завершена
      </div>
      <div className="text-3xl font-semibold">🎉 Отлично</div>
      <div className="text-zinc-600">
        Прошли {results.length} из {plan.steps.length} упражнений.
      </div>
      {avg != null && (
        <div className="text-sm text-zinc-700">
          Средний скор по предложениям:{" "}
          <span className="font-semibold">{avg}</span>
        </div>
      )}
      <div className="flex justify-center gap-3 pt-2">
        <Button asChild>
          <Link href="/dashboard">В дашборд</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/notebook">Тетрадь ошибок</Link>
        </Button>
      </div>
    </Card>
  );
}
