import { redirect } from "next/navigation";
import { requireUserId, getPrimaryLanguage } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { userLanguages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { DailyPractice } from "@/components/practice/DailyPractice";
import { LANGUAGES } from "@/lib/cefr";

export default async function Page() {
  const userId = await requireUserId();
  const language = await getPrimaryLanguage(userId);
  if (!language) redirect("/onboarding");
  const [row] = await db
    .select()
    .from(userLanguages)
    .where(
      and(eq(userLanguages.userId, userId), eq(userLanguages.language, language)),
    )
    .limit(1);
  if (!row?.cefrLevel) redirect(`/test?lang=${language}`);

  const meta = LANGUAGES[language];

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          {meta.flag} {meta.nameRu} · {row.cefrLevel} · практика на сегодня
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Практика на сегодня
        </h1>
        <p className="text-sm text-zinc-600">
          Повторим ваши слабые темы, добавим новое задание и потренируем голос с
          ушами. Поехали.
        </p>
      </div>
      <DailyPractice />
    </div>
  );
}
