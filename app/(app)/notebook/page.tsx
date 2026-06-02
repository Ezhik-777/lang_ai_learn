import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, isNull, sql, desc, isNotNull } from "drizzle-orm";
import { requireUserId, getPrimaryLanguage } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { topicProgress, mistakeDrills } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LANGUAGES } from "@/lib/cefr";

function daysAgo(d: Date | null): string {
  if (!d) return "—";
  const diff = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) return "сегодня";
  if (diff === 1) return "вчера";
  if (diff < 7) return `${diff} дн назад`;
  if (diff < 30) return `${Math.floor(diff / 7)} нед назад`;
  return `${Math.floor(diff / 30)} мес назад`;
}

function daysUntil(d: Date): string {
  const diff = Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) return "сейчас";
  if (diff === 1) return "завтра";
  return `через ${diff} дн`;
}

export default async function NotebookPage() {
  const userId = await requireUserId();
  const language = await getPrimaryLanguage(userId);
  if (!language) redirect("/onboarding");
  const meta = LANGUAGES[language];

  const [topics, drills, graduated, summary] = await Promise.all([
    // Все темы пользователя (для общей сводки)
    db
      .select()
      .from(topicProgress)
      .where(
        and(
          eq(topicProgress.userId, userId),
          eq(topicProgress.language, language),
        ),
      )
      .orderBy(asc(topicProgress.avgScore)),
    // Активные drill'ы (не graduated)
    db
      .select()
      .from(mistakeDrills)
      .where(
        and(
          eq(mistakeDrills.userId, userId),
          eq(mistakeDrills.language, language),
          isNull(mistakeDrills.graduatedAt),
        ),
      )
      .orderBy(asc(mistakeDrills.nextDueAt)),
    // Освоенные темы
    db
      .select()
      .from(mistakeDrills)
      .where(
        and(
          eq(mistakeDrills.userId, userId),
          eq(mistakeDrills.language, language),
          isNotNull(mistakeDrills.graduatedAt),
        ),
      )
      .orderBy(desc(mistakeDrills.graduatedAt))
      .limit(10),
    // Агрегаты
    db
      .select({
        total: sql<number>`count(*)::int`,
        weak: sql<number>`sum(case when ${topicProgress.avgScore} < 60 then 1 else 0 end)::int`,
        avg: sql<number>`coalesce(avg(${topicProgress.avgScore}), 0)::int`,
      })
      .from(topicProgress)
      .where(
        and(
          eq(topicProgress.userId, userId),
          eq(topicProgress.language, language),
        ),
      ),
  ]);

  const due = drills.filter((d) => d.nextDueAt <= new Date());
  const dueCount = due.length;
  const totalTopics = summary[0]?.total ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          {meta.flag} {meta.nameRu} · тетрадь ошибок
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Mistake Notebook
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Здесь собираются темы и типы ошибок из ваших заданий. Тренируйтесь над
          слабыми местами адресно — каждая успешная попытка двигает тему по
          интервалам 1 → 3 → 7 → 14 дней.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCell label="Всего тем" value={totalTopics} />
        <SummaryCell
          label="Готово повторить"
          value={dueCount}
          accent={dueCount > 0}
        />
        <SummaryCell
          label="Слабые (< 60)"
          value={summary[0]?.weak ?? 0}
          warn={(summary[0]?.weak ?? 0) > 0}
        />
        <SummaryCell label="Средний скор" value={summary[0]?.avg ?? 0} />
      </div>

      {dueCount > 0 && (
        <Link href="/practice/daily" className="block">
          <Card className="border-emerald-200 bg-emerald-50 p-5 transition hover:bg-emerald-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  {dueCount} тем{dueCount === 1 ? "а" : ""} ждут повторения сегодня
                </div>
                <p className="mt-0.5 text-xs text-emerald-700">
                  Запустите «Практику на сегодня» — соберём план из ошибок,
                  нового задания, произношения и аудирования.
                </p>
              </div>
              <span className="text-emerald-700">→</span>
            </div>
          </Card>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          К повторению ({drills.length})
        </h2>
        {drills.length === 0 ? (
          <Card className="text-sm text-zinc-500">
            Пока пусто. Сделайте несколько заданий в{" "}
            <Link href="/practice/sentences" className="underline">
              «Предложениях»
            </Link>{" "}
            — ошибки попадут сюда автоматически.
          </Card>
        ) : (
          <ul className="space-y-2">
            {drills.map((d) => {
              const isDue = d.nextDueAt <= new Date();
              const topic = topics.find((t) => t.topicKey === d.topicKey);
              return (
                <li key={d.topicKey}>
                  <Card className="flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {d.topicLabel}
                        </span>
                        {isDue && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                            готово
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                        <span>
                          серия: <b>{d.streak}</b>/4
                        </span>
                        <span>интервал: {d.intervalDays} дн</span>
                        <span>
                          след: {isDue ? "сейчас" : daysUntil(d.nextDueAt)}
                        </span>
                        {topic && (
                          <>
                            <span>попыток: {topic.attempts}</span>
                            <span>
                              скор:{" "}
                              <b
                                className={
                                  topic.avgScore >= 80
                                    ? "text-emerald-700"
                                    : topic.avgScore >= 60
                                      ? "text-amber-700"
                                      : "text-red-700"
                                }
                              >
                                {Math.round(topic.avgScore)}
                              </b>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant={isDue ? "primary" : "outline"}
                    >
                      <Link
                        href={`/practice/sentences?focus=${encodeURIComponent(d.topicLabel)}`}
                      >
                        Потренировать
                      </Link>
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {graduated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Освоенные темы
          </h2>
          <Card>
            <ul className="divide-y divide-zinc-200">
              {graduated.map((g) => (
                <li
                  key={g.topicKey}
                  className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-sm">{g.topicLabel}</span>
                  <span className="text-xs text-zinc-500">
                    {daysAgo(g.graduatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {topics.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Все темы ({topics.length})
          </h2>
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left">Тема</th>
                  <th className="px-4 py-2 text-right">Попыток</th>
                  <th className="px-4 py-2 text-right">Средний скор</th>
                  <th className="px-4 py-2 text-right">Последний раз</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr
                    key={t.topicKey}
                    className="border-t border-zinc-100"
                  >
                    <td className="px-4 py-2">{t.topicLabel}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {t.attempts}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-medium ${
                        t.avgScore >= 80
                          ? "text-emerald-700"
                          : t.avgScore >= 60
                            ? "text-amber-700"
                            : "text-red-700"
                      }`}
                    >
                      {Math.round(t.avgScore)}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-500">
                      {daysAgo(t.lastSeenAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          accent
            ? "text-emerald-600"
            : warn
              ? "text-red-600"
              : "text-zinc-900"
        }`}
      >
        {value}
      </div>
    </Card>
  );
}
