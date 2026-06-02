import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar, MobileTopbar } from "@/components/app-shell/sidebar";
import {
  getPrimaryLanguage,
  getUserLanguages,
} from "@/lib/db/queries";
import { LANGUAGES } from "@/lib/cefr";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const language = await getPrimaryLanguage(userId);
  const langs = language ? await getUserLanguages(userId) : [];
  const langMeta = language ? LANGUAGES[language] : null;
  const level = langs[0]?.cefrLevel ?? null;

  return (
    <div className="flex min-h-screen flex-1 bg-[var(--bg)] text-[var(--fg)]">
      <Sidebar langMeta={langMeta} level={level} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar
          langMeta={langMeta}
          level={level}
        />
        <main className="flex-1">
          <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
