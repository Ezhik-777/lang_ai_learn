import { redirect } from "next/navigation";
import { requireUserId, getPrimaryLanguage } from "@/lib/db/queries";
import { LevelTestClient } from "@/components/test/LevelTestClient";
import { LANGUAGES, type Language } from "@/lib/cefr";
import { t } from "@/lib/i18n/ru";

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const requested = sp.lang as Language | undefined;
  const primary = await getPrimaryLanguage(userId);
  const language = requested || primary;
  if (!language) redirect("/onboarding");
  const meta = LANGUAGES[language];

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{meta.flag}</span>
          <p className="eyebrow">
            {meta.nameRu} · приёмный тест
          </p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.levelTest.title}
        </h1>
        <p className="text-sm text-[var(--fg-secondary)]">
          {t.levelTest.subtitle}
        </p>
      </div>
      <LevelTestClient language={language} />
    </div>
  );
}
