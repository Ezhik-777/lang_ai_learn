import type { CefrLevel } from "@/lib/cefr";
import type { TestAnswer } from "@/lib/ai/prompts/level-test";
import type { AudioAnswer, SpeakAnswer } from "@/lib/test-session";

const ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function clamp(idx: number) {
  return Math.max(0, Math.min(ORDER.length - 1, idx));
}

function bestStreakLevel(answers: { targetingLevel: string; isCorrect: boolean }[]): CefrLevel {
  // самый высокий уровень, где есть правильный ответ
  let best = 2; // B1 default
  for (const a of answers) {
    const idx = ORDER.indexOf(a.targetingLevel as CefrLevel);
    if (idx >= 0 && a.isCorrect && idx > best) best = idx;
  }
  return ORDER[best];
}

export function computeAudioTargetLevel(
  mcq: TestAnswer[],
  audio: AudioAnswer[],
): CefrLevel {
  if (audio.length === 0) {
    return bestStreakLevel(
      mcq.map((m) => ({
        targetingLevel: m.targetingLevel,
        isCorrect: m.isCorrect,
      })),
    );
  }
  const last = audio[audio.length - 1];
  const lastIdx = ORDER.indexOf(last.targetingLevel as CefrLevel);
  const baseIdx = lastIdx >= 0 ? lastIdx : 2;
  return ORDER[clamp(baseIdx + (last.isCorrect ? 1 : -1))];
}

export function computeSpeakTargetLevel(
  mcq: TestAnswer[],
  audio: AudioAnswer[],
): CefrLevel {
  // Базируемся на min(чтение, аудирование), но не ниже A2.
  const reading = bestStreakLevel(
    mcq.map((m) => ({
      targetingLevel: m.targetingLevel,
      isCorrect: m.isCorrect,
    })),
  );
  const listening = bestStreakLevel(
    audio.map((a) => ({
      targetingLevel: a.targetingLevel,
      isCorrect: a.isCorrect,
    })),
  );
  const idx = Math.min(ORDER.indexOf(reading), ORDER.indexOf(listening));
  return ORDER[clamp(Math.max(idx, 1))]; // не ниже A2
}

export function computeNextSpeakTargetLevel(
  base: CefrLevel,
  prior: SpeakAnswer[],
): CefrLevel {
  if (prior.length === 0) return base;
  const last = prior[prior.length - 1];
  const idx = ORDER.indexOf(last.targetingLevel as CefrLevel);
  // если точно прочитал — поднимаем, иначе остаёмся / снижаем
  const strong =
    last.accuracyScore >= 80 &&
    last.completenessScore >= 80 &&
    last.fluencyScore >= 65;
  const weak = last.accuracyScore < 60 || last.completenessScore < 60;
  const delta = strong ? 1 : weak ? -1 : 0;
  return ORDER[clamp(idx + delta)];
}
