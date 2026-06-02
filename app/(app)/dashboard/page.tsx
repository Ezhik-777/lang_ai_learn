import Link from "next/link";
import { redirect } from "next/navigation";
import {
  requireUserId,
  getUserLanguages,
  userStats,
  recentSentences,
  recentPronunciation,
  recentListening,
} from "@/lib/db/queries";
import {
  getDueDrillsCount,
  getDueDrills,
} from "@/lib/mistake-notebook";
import { getWeakTopics } from "@/lib/db/topic-queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScorePill } from "@/components/ui/badge";
import { t } from "@/lib/i18n/ru";
import {
  LANGUAGES,
  LEVEL_DESCRIPTIONS_RU,
  type CefrLevel,
} from "@/lib/cefr";

export default async function Dashboard() {
  const userId = await requireUserId();
  const langs = await getUserLanguages(userId);
  if (langs.length === 0) redirect("/onboarding");

  const primary = langs[0];
  const stats = await userStats(userId, primary.language);
  const [sentences, pronunciation, listening, dueCount, weakTopics, dueDrills] =
    await Promise.all([
      recentSentences(userId, primary.language, 5),
      recentPronunciation(userId, primary.language, 5),
      recentListening(userId, primary.language, 5),
      getDueDrillsCount(userId, primary.language),
      getWeakTopics(userId, primary.language, 5),
      getDueDrills(userId, primary.language, 5),
    ]);

  const langMeta = LANGUAGES[primary.language];
  const level = primary.cefrLevel as CefrLevel | null;

  const greeting = greetingFor(new Date());
  const recommended = recommendAction({
    hasLevel: !!level,
    sentencesCount: stats.sentencesCount,
    pronCount: stats.pronCount,
  });

  return (
    <div className="space-y-8">
      {/* Hero card */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        {/* decorative indigo halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-[var(--accent)]/8 blur-3xl"
        />
        <div className="relative grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">{greeting.label}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting.message}
              {langMeta && (
                <span className="ml-2 inline-block text-2xl leading-none align-middle">
                  {langMeta.flag}
                </span>
              )}
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-[1.6] text-[var(--fg-secondary)]">
              {level
                ? `Продолжаем ${langMeta.nameRu.toLowerCase()} на уровне ${level}. Двадцать минут сегодня — лучше двух часов в воскресенье.`
                : "Чтобы начать практику, пройдите короткий тест уровня — это займёт около 8 минут."}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {level && (
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/practice/daily">
                    Практика на сегодня
                    {dueCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 font-mono text-xs tabular-nums">
                        {dueCount}
                      </span>
                    )}
                    <span aria-hidden>→</span>
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant={level ? "outline" : "primary"}
                className="w-full sm:w-auto"
              >
                <Link href={recommended.href}>
                  {recommended.label}
                  <span aria-hidden>→</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Today panel */}
          {level && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-5">
              <p className="eyebrow">Сегодня</p>
              <ul className="mt-3 space-y-3">
                <TodayRow
                  label="К повторению"
                  value={dueCount}
                  hint={dueCount === 0 ? "всё чисто" : "тем для drill"}
                  tone={dueCount > 0 ? "accent" : "muted"}
                />
                <TodayRow
                  label="Streak"
                  value={stats.streak}
                  hint="дней подряд"
                  tone={stats.streak > 0 ? "default" : "muted"}
                />
                <TodayRow
                  label="Слабых тем"
                  value={weakTopics.length}
                  hint={
                    weakTopics.length === 0
                      ? "пока нечего подтягивать"
                      : "ниже 80%"
                  }
                  tone={weakTopics.length > 0 ? "warning" : "muted"}
                />
              </ul>
              {dueDrills.length > 0 && (
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="text-xs text-[var(--fg-muted)]">Сегодня вспоминаем</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {dueDrills.slice(0, 4).map((d) => (
                      <span
                        key={d.topicKey}
                        className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs text-[var(--fg-secondary)]"
                      >
                        {d.topicLabel}
                      </span>
                    ))}
                    {dueDrills.length > 4 && (
                      <span className="text-xs text-[var(--fg-muted)]">
                        +{dueDrills.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Stats row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile
          label={t.dashboard.yourLevel}
          hint={level ? LEVEL_DESCRIPTIONS_RU[level] : undefined}
          icon={<IconLevel />}
        >
          {level ? (
            <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
              {level}
            </span>
          ) : (
            <Link
              href={`/test?lang=${primary.language}`}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {t.dashboard.takeTest} →
            </Link>
          )}
        </StatTile>

        <StatTile
          label={t.dashboard.streak}
          hint="дней подряд"
          icon={<IconFlame />}
        >
          <span className="text-3xl font-semibold tabular-nums tracking-tight">
            {stats.streak}
          </span>
        </StatTile>

        <StatTile
          label={t.dashboard.sentencesDone}
          hint={`средняя ${stats.avgScore}`}
          icon={<IconQuill />}
        >
          <span className="text-3xl font-semibold tabular-nums tracking-tight">
            {stats.sentencesCount}
          </span>
        </StatTile>

        <StatTile
          label={t.dashboard.pronunciationAvg}
          hint={`записей ${stats.pronCount}`}
          icon={<IconWave />}
        >
          <span className="text-3xl font-semibold tabular-nums tracking-tight">
            {stats.avgSimilarity}
          </span>
        </StatTile>
      </section>

      {/* Weak topics — surface only if any */}
      {weakTopics.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              Что подтянуть
            </h2>
            <p className="text-xs text-[var(--fg-muted)]">
              ниже 80% — нажмите, чтобы тренировать
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {weakTopics.map((wt) => (
              <Link
                key={wt.topicKey}
                href={`/practice/sentences?focus=${encodeURIComponent(wt.topicLabel)}`}
                className="group inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm shadow-[var(--shadow-sm)] transition-all hover:-translate-y-px hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)]"
              >
                <span className="font-medium text-[var(--fg)]">
                  {wt.topicLabel}
                </span>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    wt.avgScore >= 50
                      ? "text-[var(--warning)]"
                      : "text-[var(--danger)]"
                  }`}
                >
                  {Math.round(wt.avgScore)}
                </span>
                <span
                  className="text-[var(--fg-muted)] transition-colors group-hover:text-[var(--accent)]"
                  aria-hidden
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActionCard
          title={t.sentences.title}
          description="Перевод и разбор грамматики"
          href="/practice/sentences"
          icon={<IconQuill />}
          disabled={!level}
        />
        <ActionCard
          title={t.pronunciation.title}
          description="Голос → оценка звуков"
          href="/practice/pronunciation"
          icon={<IconMic />}
          disabled={!level}
        />
        <ActionCard
          title="Аудирование"
          description="Слушать и записывать"
          href="/practice/listening"
          icon={<IconEar />}
          disabled={!level}
        />
      </section>

      {/* Recent activity */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentBlock
          title={t.dashboard.recentSentences}
          href="/practice/sentences"
        >
          {sentences.length === 0 ? (
            <EmptyRow text={t.dashboard.nothingYet} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {sentences.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-3 px-5 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[var(--fg)]">{s.prompt}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--fg-muted)]">
                      «{s.userAnswer}»
                    </p>
                  </div>
                  <ScorePill score={s.score} />
                </li>
              ))}
            </ul>
          )}
        </RecentBlock>

        <RecentBlock
          title={t.dashboard.recentPronunciation}
          href="/practice/pronunciation"
        >
          {pronunciation.length === 0 ? (
            <EmptyRow text={t.dashboard.nothingYet} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {pronunciation.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start gap-3 px-5 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[var(--fg)]">{p.targetText}</p>
                    <p className="mt-0.5 truncate text-xs italic text-[var(--fg-muted)]">
                      «{p.recognizedText}»
                    </p>
                  </div>
                  <ScorePill score={p.pronunciationScore} />
                </li>
              ))}
            </ul>
          )}
        </RecentBlock>

        <RecentBlock title="Последнее аудирование" href="/practice/listening">
          {listening.length === 0 ? (
            <EmptyRow text={t.dashboard.nothingYet} />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {listening.map((l) => (
                <li
                  key={l.id}
                  className="flex items-start gap-3 px-5 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[var(--fg)]">{l.target}</p>
                    <p className="mt-0.5 truncate text-xs italic text-[var(--fg-muted)]">
                      «{l.userInput}»
                    </p>
                  </div>
                  <ScorePill score={l.score} />
                </li>
              ))}
            </ul>
          )}
        </RecentBlock>
      </section>

    </div>
  );
}

function TodayRow({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "default" | "accent" | "warning" | "muted";
}) {
  const valueClass =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : tone === "muted"
          ? "text-[var(--fg-muted)]"
          : "text-[var(--fg)]";
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-[var(--fg-secondary)]">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={`font-mono text-lg font-semibold tabular-nums ${valueClass}`}
        >
          {value}
        </span>
        <span className="text-xs text-[var(--fg-muted)]">{hint}</span>
      </span>
    </li>
  );
}

function StatTile({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]">
      {/* Accent stripe on hover */}
      <span
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2">
        <div className="eyebrow">{label}</div>
        {icon && (
          <span className="text-[var(--fg-muted)] transition-colors group-hover:text-[var(--accent)]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2 text-[var(--fg)]">
        {children}
      </div>
      {hint && (
        <div className="mt-0.5 truncate text-xs text-[var(--fg-muted)]">
          {hint}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
  disabled,
}: {
  title: string;
  description: string;
  href: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/60 p-5">
        {icon && (
          <span className="text-[var(--fg-muted)] opacity-50">{icon}</span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--fg-secondary)]">
            {title}
          </div>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
            Сначала тест уровня
          </p>
        </div>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-px hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)]"
    >
      {icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-base font-semibold tracking-tight">{title}</div>
          <span
            className="text-[var(--fg-muted)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
            aria-hidden
          >
            →
          </span>
        </div>
        <p className="mt-0.5 text-sm leading-[1.5] text-[var(--fg-secondary)]">
          {description}
        </p>
      </div>
    </Link>
  );
}

function RecentBlock({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <Link
          href={href}
          className="text-xs font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--accent)]"
        >
          открыть →
        </Link>
      </div>
      {children}
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-8">
      <div className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--fg-muted)]">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M5.5 8.5l1.5 1.5 3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-xs text-[var(--fg-muted)]">{text}</p>
    </div>
  );
}

function greetingFor(now: Date) {
  const hour = now.getHours();
  const label = now.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const message =
    hour < 5
      ? "Доброй ночи"
      : hour < 12
        ? "Доброе утро"
        : hour < 18
          ? "Добрый день"
          : "Добрый вечер";
  return { label, message };
}

function recommendAction({
  hasLevel,
  sentencesCount,
  pronCount,
}: {
  hasLevel: boolean;
  sentencesCount: number;
  pronCount: number;
}) {
  if (!hasLevel) return { label: "Пройти тест уровня", href: "/test" };
  if (sentencesCount <= pronCount)
    return { label: "Составить предложение", href: "/practice/sentences" };
  return { label: "Записать произношение", href: "/practice/pronunciation" };
}

/* Icons — 16px line */
function IconLevel() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 13h3V8H2v5zm4.5 0H9.5V5h-3v8zM11 13h3V2h-3v11z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconFlame() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5c1.5 2 3 3.5 3 6a3 3 0 11-6 0c0-1 .5-1.7 1-2.3-.2 1.6.5 2.3 1 2.3.6 0 .8-.6.5-1.5C7 4.5 7 3 8 1.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M11 11a3 3 0 11-6 0c0-.7.3-1.3.7-1.8"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}
function IconQuill() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 13.5l2-.5 8-8a1.8 1.8 0 00-2.5-2.5l-8 8-.5 2 1 1z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9 4l2.5 2.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="6"
        y="1.5"
        width="4"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M3.5 7.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5M8 12.5v2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconWave() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 8h1.5M5 5v6M7.5 3v10M10 5v6M12.5 7v2M14.5 8h-.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconEar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5.5 13.5c-1.4 0-2-1.3-2-2.7 0-1 .7-2 .7-3.3a3.8 3.8 0 117.6 0c0 2-2 2.7-2.7 3.3-.7.7-.7 2.7-2 2.7-.7 0-1.3-.7-2-.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
