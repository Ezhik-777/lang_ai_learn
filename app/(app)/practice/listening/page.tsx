import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { userLanguages } from "@/lib/db/schema";
import { ListeningPractice } from "@/components/practice/ListeningPractice";
import { LANGUAGES } from "@/lib/cefr";

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
            {meta.nameRu} · {primary.cefrLevel} · аудирование
          </p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Услышьте и запишите
        </h1>
        <p className="text-sm text-[var(--fg-secondary)]">
          Прослушайте фразу — попробуйте записать что услышали.
        </p>
      </div>
      <ListeningPractice
        language={primary.language}
        level={primary.cefrLevel}
      />
    </div>
  );
}
