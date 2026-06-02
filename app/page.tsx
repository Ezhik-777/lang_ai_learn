import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/ru";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[var(--bg)] text-[var(--fg)]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold">
              L
            </span>
            {t.appName}
          </Link>
          <nav className="flex items-center gap-2">
            {userId ? (
              <Button asChild size="sm">
                <Link href="/dashboard">
                  {t.nav.dashboard}
                  <span aria-hidden>→</span>
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">{t.signIn}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">{t.start}</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28 lg:pt-32">
          <div className="flex items-center gap-2 text-sm text-[var(--fg-secondary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--accent)]" />
            AI-наставник по немецкому и английскому
          </div>

          <h1 className="mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-tight">
            Не зубрить слова —{" "}
            <span
              className="text-[var(--accent)]"
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontStyle: "italic",
                fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144',
                fontWeight: 500,
              }}
            >
              сочинять
            </span>{" "}
            предложения.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-[1.55] text-[var(--fg-secondary)]">
            Тест уровня по CEFR, разбор каждой фразы с объяснением на русском,
            оценка произношения и аудирование. Двадцать минут в день — и язык
            укладывается в речь, а не в память.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {userId ? (
              <Button asChild size="lg">
                <Link href="/dashboard">
                  {t.nav.dashboard}
                  <span aria-hidden>→</span>
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/sign-up">
                    Начать бесплатно
                    <span aria-hidden>→</span>
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/sign-in">У меня уже есть аккаунт</Link>
                </Button>
              </>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--fg-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <CheckMark /> Тест уровня — 8 минут
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckMark /> На русском
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckMark /> Без рекламы
            </span>
          </div>
        </div>

        {/* Subtle gradient accent at bottom */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent"
        />
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">Что внутри</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Не учебник. Четыре отдельных тренажёра — каждый закрывает свой
            навык.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 bg-[var(--surface)] p-6"
            >
              <div className="text-[var(--accent)]">{f.icon}</div>
              <h3 className="text-base font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="text-sm leading-[1.55] text-[var(--fg-secondary)]">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--border)] bg-[var(--surface-2)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">Как это работает</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Три шага от регистрации до первой тренировки.
            </h2>
          </div>
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="relative flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
              >
                <span className="font-mono text-xs font-medium tabular-nums text-[var(--accent)]">
                  {String(i + 1).padStart(2, "0")} / {STEPS.length.toString().padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="text-sm leading-[1.55] text-[var(--fg-secondary)]">
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center sm:px-8 sm:py-16">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              Начните с теста уровня — это занимает{" "}
              <span className="text-[var(--accent)]">восемь минут</span>.
            </h2>
            <p className="mt-2 text-sm text-[var(--fg-secondary)]">
              Регистрация по email или Google. Карта не нужна.
            </p>
          </div>
          {userId ? (
            <Button asChild size="lg">
              <Link href="/dashboard">
                Перейти в дашборд
                <span aria-hidden>→</span>
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/sign-up">
                Начать бесплатно
                <span aria-hidden>→</span>
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-[var(--fg-muted)] sm:px-8">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded bg-[var(--accent)] text-[var(--accent-fg)] text-[10px] font-semibold">
              L
            </span>
            <span>
              © {new Date().getFullYear()} {t.appName}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/sign-in" className="hover:text-[var(--fg)]">
              Войти
            </Link>
            <Link href="/sign-up" className="hover:text-[var(--fg)]">
              Регистрация
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    title: "Тест CEFR",
    text: "AI определяет уровень от A1 до C2 за 8 минут. Подбирает первое задание исходя из того, что вы уже умеете.",
    icon: <IconCompass />,
  },
  {
    title: "Сочинение фраз",
    text: "Переводите фразу — AI исправляет грамматику, объясняет на русском, подсказывает на что обратить внимание.",
    icon: <IconQuill />,
  },
  {
    title: "Произношение",
    text: "Запишите голос — оценка точности звуков, беглости и интонации. По словам и фонемам.",
    icon: <IconWave />,
  },
  {
    title: "Аудирование",
    text: "Прослушайте фразу — попробуйте записать. AI разберёт что вы услышали верно, а что упустили.",
    icon: <IconEar />,
  },
];

const STEPS = [
  {
    title: "Регистрация и выбор языка",
    text: "Email или Google. Выбираете немецкий или английский — второй язык можно добавить позже.",
  },
  {
    title: "Тест уровня",
    text: "10–12 коротких вопросов с разбором. На выходе — ваш CEFR и краткий комментарий, на чём сосредоточиться.",
  },
  {
    title: "Ежедневная практика",
    text: "Дашборд показывает streak и средние оценки. Открываете тренажёр — и работаете двадцать минут.",
  },
];

function CheckMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="none">
      <path
        d="M2.5 6.5l2.5 2.5L9.5 3.5"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M15.5 8.5L13 13l-4.5 2.5L11 11l4.5-2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconQuill() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M4 20l4-1 11-11a3 3 0 00-4-4L4 15v5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13 6l4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconWave() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2M21 12h-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M8 19c-2 0-3-2-3-4 0-1.5 1-3 1-5a6 6 0 1112 0c0 3-3 4-4 5s-1 4-3 4c-1 0-2-1-3-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
