import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ruRU } from "@clerk/localizations";
import { t } from "@/lib/i18n/ru";
import "./globals.css";

const sans = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

const mono = Geist_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
});

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: `${t.appName} — ${t.tagline}`,
  description: t.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider localization={ruRU}>
      <html
        lang="ru"
        className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
