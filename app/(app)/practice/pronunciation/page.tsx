import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { userLanguages } from "@/lib/db/schema";
import { PronunciationPractice } from "@/components/practice/PronunciationPractice";
import { LANGUAGES } from "@/lib/cefr";
import { t } from "@/lib/i18n/ru";

export default async function Page() {
  const userId = await requireUserId();
  const [primary] = await db
    .select()
    .from(userLanguages)
    .where(eq(userLanguages.userId, userId))
    .limit(1);
  if (!primary) redirect("/onboarding");
  if (!primary.cefrLevel) redirect(`/test?lang=${primary.language}`);

  const meta = LANGUAGES[primary.language];

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{meta.flag}</span>
          <p className="eyebrow">
            {meta.nameRu} · {primary.cefrLevel} · {t.nav.pronunciation.toLowerCase()}
          </p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.pronunciation.title}
        </h1>
        <p className="text-sm text-[var(--fg-secondary)]">
          {t.pronunciation.subtitle}
        </p>
      </div>
      <PronunciationPractice
        language={primary.language}
        level={primary.cefrLevel}
      />
    </div>
  );
}
