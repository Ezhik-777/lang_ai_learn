import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { userLanguages } from "@/lib/db/schema";
import { SentencePractice } from "@/components/practice/SentencePractice";
import { LANGUAGES } from "@/lib/cefr";
import { t } from "@/lib/i18n/ru";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const userId = await requireUserId();
  const [primary] = await db
    .select()
    .from(userLanguages)
    .where(eq(userLanguages.userId, userId))
    .limit(1);
  if (!primary) redirect("/onboarding");
  if (!primary.cefrLevel) redirect(`/test?lang=${primary.language}`);

  const meta = LANGUAGES[primary.language];
  const sp = await searchParams;
  const focus = sp.focus?.trim().slice(0, 150);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{meta.flag}</span>
          <p className="eyebrow">
            {meta.nameRu} · {primary.cefrLevel} · {t.nav.sentences.toLowerCase()}
          </p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.sentences.title}
        </h1>
        <p className="text-sm text-[var(--fg-secondary)]">
          {t.sentences.subtitle}
        </p>
      </div>
      {focus && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
          <span
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]"
            aria-hidden
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path
                d="M2 6l2.5 2.5L9 3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-[var(--accent)]">Тренируем тему</p>
            <p className="mt-0.5 font-medium text-[var(--fg)]">«{focus}»</p>
          </div>
          <Link
            href="/practice/sentences"
            className="text-xs font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--accent)]"
          >
            сбросить
          </Link>
        </div>
      )}
      <SentencePractice
        language={primary.language}
        level={primary.cefrLevel}
        focus={focus}
      />
    </div>
  );
}
