import type { TestAnswer } from "@/lib/ai/prompts/level-test";

export type TestPhase = "mcq" | "audio" | "speak" | "done";

export interface PendingMcq {
  kind: "mcq";
  question: string;
  options: string[];
  correct: number;
  targetingLevel: string;
  type?: string;
}

export interface PendingAudio {
  kind: "audio";
  passage: string;
  question: string;
  options: string[];
  correct: number;
  targetingLevel: string;
}

export interface PendingSpeak {
  kind: "speak";
  text: string;
  targetingLevel: string;
}

export type PendingItem = PendingMcq | PendingAudio | PendingSpeak;

// Старый pending-формат без `kind` всё ещё может лежать в незакрытых сессиях,
// поэтому readState нормализует его в PendingMcq.
type LegacyPendingMcq = Omit<PendingMcq, "kind"> & { kind?: undefined };

export interface AudioAnswer {
  passage: string;
  question: string;
  options: string[];
  correct: number;
  targetingLevel: string;
  userAnswer: number;
  isCorrect: boolean;
  playCount: number;
}

export interface SpeakAnswer {
  text: string;
  targetingLevel: string;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  recognized: string;
}

export interface TestSessionState {
  phase: TestPhase;
  history: TestAnswer[];
  audioHistory: AudioAnswer[];
  speakHistory: SpeakAnswer[];
  pending: PendingItem | null;
  // Сколько раз клиент уже забирал аудио для текущей pending-задачи аудирования.
  // Используется и как индикатор для скоринга (idealно — с первого раза).
  audioPlayCount?: number;
}

function normalizePending(raw: unknown): PendingItem | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind === "audio" || obj.kind === "speak" || obj.kind === "mcq") {
    return obj as unknown as PendingItem;
  }
  // legacy: pending без kind = MCQ
  if (
    typeof obj.question === "string" &&
    Array.isArray(obj.options) &&
    typeof obj.correct === "number"
  ) {
    const legacy = obj as LegacyPendingMcq;
    return {
      kind: "mcq",
      question: legacy.question,
      options: legacy.options,
      correct: legacy.correct,
      targetingLevel: legacy.targetingLevel,
      type: legacy.type,
    };
  }
  return null;
}

export function readState(raw: unknown): TestSessionState {
  if (raw && typeof raw === "object" && "history" in raw) {
    const r = raw as Partial<TestSessionState> & { pending?: unknown };
    return {
      phase: (r.phase as TestPhase) ?? "mcq",
      history: Array.isArray(r.history) ? r.history : [],
      audioHistory: Array.isArray(r.audioHistory) ? r.audioHistory : [],
      speakHistory: Array.isArray(r.speakHistory) ? r.speakHistory : [],
      pending: normalizePending(r.pending),
      audioPlayCount: typeof r.audioPlayCount === "number" ? r.audioPlayCount : 0,
    };
  }
  return {
    phase: "mcq",
    history: [],
    audioHistory: [],
    speakHistory: [],
    pending: null,
    audioPlayCount: 0,
  };
}

// Сохраняем обратную совместимость на случай, если что-то ещё импортирует
// старое имя PendingQuestion.
export type PendingQuestion = PendingMcq;
