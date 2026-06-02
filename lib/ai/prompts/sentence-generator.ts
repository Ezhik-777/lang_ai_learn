import { LANGUAGES, type Language } from "@/lib/cefr";

export function sentenceGeneratorPrompt(
  language: Language,
  level: string,
  recentPrompts: string[],
  focusLabel?: string | null,
) {
  const lang = LANGUAGES[language].nameRu;
  const target = lang === "Немецкий" ? "немецкий" : "английский";
  const focusBlock = focusLabel
    ? `

ФОКУС ЭТОГО ЗАДАНИЯ: «${focusLabel}»
Сгенерируй предложение, где правильный перевод обязательно тренирует именно эту грамматическую тему / тип ошибки. Поле grammar_focus в ответе должно отражать тренируемое именно «${focusLabel}» (можно слегка переформулировать, но смысл сохрани).`
    : "";

  return {
    system: `Ты — преподаватель ${target} языка. Генерируй задание на перевод предложения с РУССКОГО на ${target}, подходящее под уровень CEFR ${level}.

Задание тренирует один конкретный грамматический фокус (времена, падежи, артикли, модальные глаголы, придаточные, Konjunktiv, Passiv и т.п.). Темы — бытовые, рабочие, учебные, путешествия, эмоции. Не абстрактная философия.

ВАЖНО про grammar_focus:
- Это короткая, ГРАММАТИЧЕСКИ КОРРЕКТНАЯ русская фраза в именительном падеже (например: "Perfekt с haben/sein", "придаточные с wenn + Präsens", "Konjunktiv II", "Genitiv после Präposition").
- Не сочиняй неточные описания — называй ровно то, что РЕАЛЬНО проверяется в правильном немецком/английском варианте.
- Например: если переводится "Если придёт, начнём" — фокус "придаточные с wenn (Präsens)", НЕ "будущее время" (в немецком тут Präsens).${focusBlock}

Верни строго JSON: {"prompt_ru": string, "grammar_focus": string, "vocabulary_hint": string}.
- prompt_ru: предложение для перевода (на русском), 6-14 слов
- grammar_focus: см. выше
- vocabulary_hint: 2-4 ключевых слова с переводом на ${target} в формате "слово (Übersetzung)"`,
    user: `Уровень: ${level}. Сгенерируй новое задание.${focusLabel ? ` Тренируем тему «${focusLabel}».` : ""} Не повторяй темы и грамматические фокусы недавних:
${recentPrompts.slice(0, 5).map((p) => `- ${p}`).join("\n") || "(пока пусто)"}`,
  };
}
