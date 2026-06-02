import { redirect } from "next/navigation";
import {
  requireUserId,
  getPrimaryLanguage,
  setUserLanguage,
} from "@/lib/db/queries";
import { LANGUAGES, type Language } from "@/lib/cefr";
import { t } from "@/lib/i18n/ru";

async function choose(language: Language) {
  "use server";
  const userId = await requireUserId();
  await setUserLanguage(userId, language);
  redirect(`/test?lang=${language}`);
}

const COPY: Record<Language, string> = {
  de: "Падежи, артикли, длинные сложноподчинённые. Учим строить фразу, а не запоминать таблицы.",
  en: "Времена, фразовые глаголы, идиомы. От разговорных конструкций к свободному письму.",
};

export default async function Onboarding() {
  const userId = await requireUserId();
  const existing = await getPrimaryLanguage(userId);
  if (existing) redirect("/dashboard");

  const languages = Object.values(LANGUAGES) as readonly typeof LANGUAGES.de[];

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <div className="space-y-2">
        <p className="eyebrow">Шаг 1 из 2</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.onboarding.title}
        </h1>
        <p className="text-sm text-[var(--fg-secondary)]">
          {t.onboarding.subtitle}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {languages.map((l) => (
          <form key={l.code} action={choose.bind(null, l.code as Language)}>
            <button
              type="submit"
              className="group flex w-full flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-px hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl leading-none">{l.flag}</span>
                <span className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
                  {l.code}
                </span>
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">
                  {l.nameRu}
                </div>
                <p className="mt-1 text-sm text-[var(--fg-secondary)]">
                  {COPY[l.code as Language]}
                </p>
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                {t.onboarding.next}
                <span aria-hidden>→</span>
              </div>
            </button>
          </form>
        ))}
      </div>

      <p className="text-xs text-[var(--fg-muted)]">
        Второй язык можно добавить позже — после теста уровня.
      </p>
    </div>
  );
}
