import { NextResponse } from "next/server";
import { requireUserId, getPrimaryLanguage } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { userLanguages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getDueDrills } from "@/lib/mistake-notebook";

export interface DailyStep {
  kind: "sentence" | "pronunciation" | "listening";
  label: string;
  focus?: string;
  reason: "drill" | "new" | "speak" | "listen";
}

export interface DailyPlan {
  language: "de" | "en";
  level: string;
  steps: DailyStep[];
  dueDrillsTotal: number;
}

export async function GET() {
  const userId = await requireUserId();
  const language = await getPrimaryLanguage(userId);
  if (!language) {
    return NextResponse.json({ error: "Нет выбранного языка" }, { status: 409 });
  }
  const [row] = await db
    .select()
    .from(userLanguages)
    .where(
      and(eq(userLanguages.userId, userId), eq(userLanguages.language, language)),
    )
    .limit(1);
  if (!row?.cefrLevel) {
    return NextResponse.json({ error: "Уровень не определён" }, { status: 409 });
  }

  const drills = await getDueDrills(userId, language, 10);
  const drillsTotal = drills.length;
  // Берём максимум 3 разных тем для drill — приоритет дате (самые "просроченные")
  const seen = new Set<string>();
  const chosen: typeof drills = [];
  for (const d of drills) {
    if (seen.has(d.topicKey)) continue;
    seen.add(d.topicKey);
    chosen.push(d);
    if (chosen.length >= 3) break;
  }

  const steps: DailyStep[] = [];
  for (const d of chosen) {
    steps.push({
      kind: "sentence",
      label: `Повторение: ${d.topicLabel}`,
      focus: d.topicLabel,
      reason: "drill",
    });
  }
  steps.push({
    kind: "sentence",
    label: "Новое задание",
    reason: "new",
  });
  steps.push({
    kind: "pronunciation",
    label: "Произношение",
    reason: "speak",
  });
  steps.push({
    kind: "listening",
    label: "Аудирование",
    reason: "listen",
  });

  const plan: DailyPlan = {
    language,
    level: row.cefrLevel,
    steps,
    dueDrillsTotal: drillsTotal,
  };
  return NextResponse.json(plan);
}
