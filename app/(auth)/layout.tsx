import Link from "next/link";
import { t } from "@/lib/i18n/ru";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 bg-[var(--bg)] text-[var(--fg)]">
      {/* Brand panel — left */}
      <aside className="relative hidden w-[44%] max-w-[560px] flex-col justify-between border-r border-[var(--border)] bg-[var(--surface-2)] p-10 lg:flex">
        <Link
          href="/"
          className="inline-flex items-center gap-2 self-start text-[15px] font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold">
            L
          </span>
          {t.appName}
        </Link>

        <div className="space-y-6">
          <p className="eyebrow">AI-наставник по языкам</p>
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight">
            Не зубрить слова — сочинять предложения.
          </h2>
          <p className="max-w-md text-sm leading-[1.65] text-[var(--fg-secondary)]">
            Тест уровня, разбор каждой фразы, анализ произношения и аудирование.
            Двадцать минут в день — и язык укладывается в речь, а не в память.
          </p>

          <ul className="space-y-2.5 pt-2">
            {[
              "Тест CEFR за 8 минут",
              "Разбор грамматики на русском",
              "Оценка звуков и интонации",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 text-sm text-[var(--fg)]"
              >
                <span
                  className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                  aria-hidden
                />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-[var(--fg-muted)]">
          © {new Date().getFullYear()} Lang AI Learn
        </p>
      </aside>

      {/* Auth widget — right */}
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 text-[15px] font-semibold tracking-tight lg:hidden"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold">
              L
            </span>
            {t.appName}
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
