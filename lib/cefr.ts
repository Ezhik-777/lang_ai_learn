export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const LEVEL_DESCRIPTIONS_RU: Record<CefrLevel, string> = {
  A1: "Начальный — простые фразы для бытовых ситуаций",
  A2: "Элементарный — короткие диалоги, знакомые темы",
  B1: "Средний — самостоятельное общение, описание опыта",
  B2: "Выше среднего — свободное общение, сложные тексты",
  C1: "Продвинутый — нюансы, академический и деловой язык",
  C2: "В совершенстве — на уровне носителя",
};

export const LANGUAGES = {
  de: { code: "de", nameRu: "Немецкий", flag: "🇩🇪" },
  en: { code: "en", nameRu: "Английский", flag: "🇬🇧" },
} as const;

export type Language = keyof typeof LANGUAGES;
