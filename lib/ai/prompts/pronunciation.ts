import { LANGUAGES, type Language } from "@/lib/cefr";

interface AzureWord {
  word: string;
  accuracyScore: number;
  errorType: string;
}

export function pronunciationTipPrompt(
  language: Language,
  target: string,
  recognized: string,
  scores: {
    pronunciationScore: number;
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    prosodyScore?: number | null;
  },
  words: AzureWord[],
) {
  const lang = LANGUAGES[language].nameRu;
  const worst = [...words]
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .slice(0, 3)
    .map(
      (w) =>
        `${w.word} (${Math.round(w.accuracyScore)}${w.errorType !== "None" ? ", " + w.errorType : ""})`,
    )
    .join(", ");

  return {
    system: `Ты — преподаватель ${lang === "Немецкий" ? "немецкого" : "английского"} языка для русскоязычного студента. По результатам Azure Pronunciation Assessment дай КОРОТКИЙ практичный совет на РУССКОМ — 2-3 предложения, без воды. Сфокусируйся на 1-2 главных проблемах с учётом типичных ошибок русскоговорящих в ${lang === "Немецкий" ? "немецком" : "английском"}. Без markdown.`,
    user: `Фраза: «${target}»
Распознано Azure: «${recognized}»
Скоры: pronunciation=${Math.round(scores.pronunciationScore)}, accuracy=${Math.round(scores.accuracyScore)}, fluency=${Math.round(scores.fluencyScore)}, completeness=${Math.round(scores.completenessScore)}${scores.prosodyScore != null ? `, prosody=${Math.round(scores.prosodyScore)}` : ""}
Худшие слова: ${worst || "—"}

Дай совет.`,
  };
}
