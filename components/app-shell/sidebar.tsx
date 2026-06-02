"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { t } from "@/lib/i18n/ru";
import type { Language } from "@/lib/cefr";
import { cn } from "@/lib/utils";

const NAV: Array<{
  href: string;
  label: string;
  description: string;
}> = [
  {
    href: "/dashboard",
    label: t.nav.dashboard,
    description: "Прогресс и статистика",
  },
  {
    href: "/practice/sentences",
    label: t.nav.sentences,
    description: "Составлять и разбирать",
  },
  {
    href: "/practice/pronunciation",
    label: t.nav.pronunciation,
    description: "Говорить и слушать",
  },
  {
    href: "/practice/listening",
    label: "Аудирование",
    description: "Слушать и записывать",
  },
];

export function Sidebar({
  langMeta,
  level,
}: {
  langMeta: { flag: string; nameRu: string; code: Language } | null;
  level: string | null;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:border-r lg:border-[var(--border)] lg:bg-[var(--surface-2)]">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold tracking-tight">
          L
        </div>
        <span className="text-[15px] font-semibold tracking-tight">
          {t.appName}
        </span>
      </div>

      {langMeta && (
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="eyebrow">Изучаете</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{langMeta.flag}</span>
              <span className="text-sm font-medium">{langMeta.nameRu}</span>
            </div>
            {level && (
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-[var(--fg-secondary)]">
                {level}
              </span>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-col gap-0.5 rounded-md px-3 py-2 transition-colors",
                active
                  ? "bg-[var(--surface-hover)] text-[var(--fg)]"
                  : "text-[var(--fg-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                {active && (
                  <span className="size-1.5 rounded-full bg-[var(--accent)]" />
                )}
              </div>
              <span className="text-xs text-[var(--fg-muted)]">
                {item.description}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
        <UserButton />
        <span className="text-xs text-[var(--fg-muted)]">v0.1</span>
      </div>
    </aside>
  );
}

export function MobileTopbar({
  langMeta,
  level,
}: {
  langMeta: { flag: string; nameRu: string } | null;
  level: string | null;
}) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur lg:hidden">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
      >
        <div className="flex size-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold">
          L
        </div>
        {t.appName}
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        {NAV.map((n) => {
          const active =
            pathname === n.href || pathname?.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                active
                  ? "bg-[var(--surface-hover)] text-[var(--fg)]"
                  : "text-[var(--fg-secondary)] hover:bg-[var(--surface-hover)]",
              )}
            >
              {n.label}
            </Link>
          );
        })}
        {langMeta && (
          <span className="ml-1 hidden items-center gap-1 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-xs sm:inline-flex">
            <span>{langMeta.flag}</span>
            {level && (
              <span className="font-mono tabular-nums text-[var(--fg-secondary)]">
                {level}
              </span>
            )}
          </span>
        )}
        <UserButton />
      </nav>
    </header>
  );
}
