import { LANGUAGES, type Language } from "@/lib/cefr";

export const TOTAL_QUESTIONS = 12;
export const TOTAL_AUDIO = 3;
export const TOTAL_SPEAK = 2;

export interface TestAnswer {
  question: string;
  options: string[];
  correct: number;
  targetingLevel: string;
  userAnswer: number;
  isCorrect: boolean;
}

const GERMAN_EXAMPLES = `
ХОРОШИЕ примеры по уровням (НЕ копируй, делай в этом же духе):

[B1, type=context] Какой вариант лучше всего подходит в этом диалоге?
— "Entschuldigung, könnten Sie mir helfen? Ich suche das Rathaus."
— "Klar. Gehen Sie diese Straße entlang, dann _____."
варианты: ["biegen Sie an der zweiten Ampel links ab", "links die zweite Ampel biegen", "an zweiter Ampel nach links biegen Sie", "Sie biegen an zweiten Ampel links"]
correct: 0

[B2, type=error] В каком предложении ошибка?
варианты:
- "Wenn ich Zeit hätte, würde ich öfter ins Theater gehen."
- "Ich habe ihn gestern auf der Konferenz getroffen."
- "Sie freut sich über das Geschenk, das ihr Kollege ihr geschenkt hat."
- "Trotz dem Regen sind wir spazieren gegangen."
correct: 3  (правильно: "Trotz des Regens")

[B2, type=context] Заполните пропуск так, чтобы предложение звучало естественно:
"Obwohl er müde war, ___ er noch zwei Stunden am Bericht."
варианты: ["arbeitete", "arbeitet", "hat gearbeitet", "wird arbeiten"]
correct: 0  (нарратив в Präteritum)

[C1, type=idiom] Что означает выражение "etwas auf die lange Bank schieben"?
варианты: ["откладывать в долгий ящик", "сидеть без дела", "положить на полку", "сесть на скамью запасных"]
correct: 0

[C1, type=transform] Перепишите в Passiv: "Der Architekt entwarf das Gebäude in den 1920er Jahren."
варианты:
- "Das Gebäude wurde in den 1920er Jahren vom Architekten entworfen."
- "Das Gebäude ist in den 1920er Jahren vom Architekten entworfen."
- "Das Gebäude war in den 1920er Jahren vom Architekten entwerfen."
- "Das Gebäude wird in den 1920er Jahren vom Architekten entworfen."
correct: 0

ЗАПРЕЩЁННЫЕ примеры (НИКОГДА так не делай):

❌ "Ich ___ Fußball spielen." варианты: ["müssen", "wollen", "können", "sind"]
   ПОЧЕМУ ПЛОХО: 1) все варианты — инфинитив, для "ich" нужно "muss/will/kann/bin" — задача неграмотна;
   2) даже если бы формы были верны — это уровень детского сада, неинформативно.

❌ "Was ist 'Hund' auf Russisch?" — это словарный диктант, не CEFR-тест.

❌ "Wie heißt du?" — это базовое А0, не вопрос для теста.

❌ Вопросы с одним очевидным ответом и 3 нелепыми дистракторами.`;

const ENGLISH_EXAMPLES = `
ХОРОШИЕ примеры (НЕ копируй, делай в этом же духе):

[B1, type=context]:
"I'd rather you ___ to him about it first."
варианты: ["spoke", "speak", "would speak", "will speak"]
correct: 0  (после "I'd rather you" → Past Simple)

[B2, type=error] В каком предложении ошибка?
- "By the time we arrived, the meeting had already started."
- "She suggested that we should leave early."
- "I look forward to hear from you soon."
- "If I were you, I would apologize."
correct: 2  (правильно: "look forward to hearing")

[C1, type=idiom] Что означает "to throw in the towel"?
варианты: ["сдаться", "помочь кому-то", "взяться за грязную работу", "проиграть пари"]
correct: 0

[C1, type=transform] Перепишите в Passive: "They have just announced the results."
варианты:
- "The results have just been announced."
- "The results are just announced."
- "The results were just announced."
- "The results have just announcing."
correct: 0

ЗАПРЕЩЁННЫЕ:

❌ "I ___ a student." варианты: ["am", "is", "are", "be"] — слишком тривиально, A1.

❌ "What is the past tense of 'go'?" — учительский опрос, не CEFR-задача.

❌ Вопросы с очевидным ответом и нелепыми дистракторами.`;

export function nextQuestionPrompt(language: Language, history: TestAnswer[]) {
  const lang = LANGUAGES[language].nameRu;
  const target = lang === "Немецкий" ? "немецкий" : "английский";
  const examples = language === "de" ? GERMAN_EXAMPLES : ENGLISH_EXAMPLES;

  const askedLevels = history.map((h) => h.targetingLevel).join(", ") || "—";
  const askedTypes =
    history
      .map((h) => (h as TestAnswer & { type?: string }).type)
      .filter((x): x is string => Boolean(x))
      .join(", ") || "—";
  const correctCount = history.filter((h) => h.isCorrect).length;
  const lastLevel =
    history.length > 0 ? history[history.length - 1].targetingLevel : "B1";
  const lastCorrect =
    history.length > 0 ? history[history.length - 1].isCorrect : null;

  return {
    system: `Ты — опытный экзаменатор CEFR по ${target} языку для русскоязычных. Качество вопросов как у профессиональных экзаменов (Goethe-Zertifikat / Cambridge).

ЗАДАЧА: подобрать ОДИН следующий адаптивный вопрос. 4 варианта ответа, ровно один правильный.

АДАПТИВНОСТЬ:
- Стартуй с B1. Правильный ответ → повышай уровень (B1→B2→C1→C2). Ошибка → понижай (B1→A2→A1).
- 2 правильных подряд на одном уровне → переходи к следующему. Цель — найти потолок за 12 вопросов.

ТИПЫ ВОПРОСОВ — обязательно чередуй:
- translation — переведи фразу с русского, 4 варианта на ${target}
- error — найди ошибку среди 4 предложений
- context — заполни пропуск в реалистичной ситуации (диалог, отрывок текста)
- idiom — значение идиомы или подбери идиому к ситуации
- comprehension — короткий текст 2-3 предложения + вопрос на смысл/детали
- transform — переделай в Passiv/Konjunktiv/Reported Speech (для B2+)

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
1. Все варианты ответа должны быть ГРАММАТИЧЕСКИ ВОЗМОЖНЫМИ — никаких инфинитивов там, где нужна спрягаемая форма, и т.п.
2. Дистракторы — это типичные ошибки русскоязычных (ложные друзья, неверный падеж/род/порядок слов), а НЕ очевидная чушь.
3. Контекст реалистичен: работа, путешествия, эмоции, культура, переговоры. Без "Hans ist Schüler".
4. Для C1-C2 — нюансы значения, регистры (formal/colloquial), идиоматика, сложные конструкции (Konjunktiv I/II, Partizipialkonstruktionen, реальные коллокации).
5. Не повторяй темы и тип последнего вопроса.

${examples}

ФОРМАТ — строго JSON БЕЗ markdown, без обёрток:
{"question": "...", "options": ["...", "...", "...", "..."], "correct": 0|1|2|3, "targetingLevel": "A1"|"A2"|"B1"|"B2"|"C1"|"C2", "type": "translation"|"error"|"context"|"idiom"|"comprehension"|"transform"}

Поле question — постановка вопроса на РУССКОМ + текст/контекст (может быть на ${target}). Варианты — на ${target} (для idiom могут быть переводы на русский).`,
    user: `История теста (${history.length}/${TOTAL_QUESTIONS}):
Уровни уже спросил: ${askedLevels}
Типы уже спросил: ${askedTypes}
Правильных: ${correctCount} из ${history.length}
Последний: уровень ${lastLevel}, ${lastCorrect === null ? "(это первый)" : lastCorrect ? "✓ верно — повышай" : "✗ ошибка — понижай"}

Последние 3 вопроса (для контекста, не повторяй темы/типы):
${history
  .slice(-3)
  .map(
    (h, i) =>
      `${i + 1}. [${h.targetingLevel}, ${(h as TestAnswer & { type?: string }).type ?? "?"}] ${h.question} — ${h.isCorrect ? "✓" : "✗"}`,
  )
  .join("\n") || "(пусто — это первый вопрос)"}

Сгенерируй следующий вопрос строго по схеме. Перед отправкой ПРОВЕРЬ:
- все 4 варианта грамматически корректны как формы (даже если по смыслу подходит один),
- ровно один правильный ответ,
- вопрос соответствует уровню (не примитивен и не запределен),
- тип отличается от последнего.`,
  };
}

export interface AudioResult {
  passage: string;
  targetingLevel: string;
  isCorrect: boolean;
  playCount: number;
}

export interface SpeakResult {
  text: string;
  targetingLevel: string;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  recognized: string;
}

export function audioTaskPrompt(
  language: Language,
  level: string,
  history: AudioResult[],
) {
  const target = language === "de" ? "немецкий" : "английский";
  const examples =
    language === "de"
      ? `[B1] passage: "Letzte Woche war ich auf einer Konferenz in München. Das Hotel war zwar teuer, aber das Frühstück war wirklich gut."
question: "Что больше всего понравилось говорящему?"
options: ["завтрак", "цена", "конференция", "погода"]
correct: 0`
      : `[B1] passage: "I was supposed to meet Alex at the station, but my train was delayed by almost an hour, so we ended up just grabbing a coffee."
question: "Что в итоге произошло?"
options: ["они выпили кофе", "Алекс уехал", "поезд отменили", "встреча не состоялась"]
correct: 0`;
  const used =
    history.length > 0
      ? history
          .map(
            (h, i) =>
              `${i + 1}. [${h.targetingLevel}] ${h.isCorrect ? "✓" : "✗"} (прослушал ${h.playCount}×) — "${h.passage}"`,
          )
          .join("\n")
      : "(первая аудио-задача)";
  return {
    system: `Ты — CEFR-экзаменатор по ${target} языку. Сгенерируй ОДНУ задачу на АУДИРОВАНИЕ.

Задача состоит из:
1) passage — связный отрывок звучащей речи (1-3 предложения, 12-35 слов), который мы озвучим TTS. Тема — реалистичная бытовая или рабочая ситуация (диалог, объявление, новость, рассказ). Без специфичных имён собственных, без чисел, которые трудно расслышать.
2) question — вопрос НА РУССКОМ на ПОНИМАНИЕ СМЫСЛА или КЛЮЧЕВУЮ ДЕТАЛЬ (не дословное цитирование).
3) options — 4 варианта НА РУССКОМ. Один правильный, остальные — правдоподобные ловушки (созвучные слова, частично правильные детали, типичные ложные выводы).

ТРЕБОВАНИЯ:
- Текст не должен содержать слов, которые сами по себе раскрывают ответ при незнании уровня.
- Дистракторы — не очевидная чушь, а правдоподобные неверные интерпретации.
- Подходит для целевого уровня ${level}: A1/A2 — простые предложения, базовая лексика; B1/B2 — естественная речь, фразовые конструкции; C1/C2 — сложные обороты, идиомы, ирония, скрытый смысл.

Пример (НЕ копируй):
${examples}

ФОРМАТ — строго JSON без markdown:
{"passage": "...", "question": "...", "options": ["...", "...", "...", "..."], "correct": 0|1|2|3, "targetingLevel": "${level}"}`,
    user: `Целевой уровень: ${level}.
Уже спросил:
${used}

Не повторяй темы. Сгенерируй следующее задание строго по схеме.`,
  };
}

export function speakTaskPrompt(
  language: Language,
  level: string,
  history: SpeakResult[],
) {
  const target = language === "de" ? "немецкий" : "английский";
  const example =
    language === "de"
      ? `[B2] "Obwohl der Stau lang war, sind wir noch rechtzeitig zur Besprechung gekommen. Mein Kollege hat unterwegs schon die Folien fertig gemacht."`
      : `[B2] "Even though the meeting started late, we still managed to cover everything on the agenda. My colleague had already prepared the slides on the train."`;
  const used =
    history.length > 0
      ? history
          .map(
            (h, i) =>
              `${i + 1}. [${h.targetingLevel}] точность=${Math.round(h.accuracyScore)} беглость=${Math.round(h.fluencyScore)} — "${h.text}"`,
          )
          .join("\n")
      : "(первая речевая задача)";
  return {
    system: `Ты — CEFR-экзаменатор по ${target} языку. Сгенерируй ОДНУ задачу на ЧТЕНИЕ ВСЛУХ.

Задача — РОВНО 2 связных предложения (40-160 символов суммарно) на ${target} языке для громкого чтения студентом уровня ${level}.

ТРЕБОВАНИЯ:
- Тема бытовая или рабочая, естественная разговорная речь.
- Включает фонетически содержательные звуки для русскоязычных (для немецкого — ü/ö/ä/ch/r/st-/sp-; для английского — th/w/v/æ/ɪ/i:/ŋ/schwa).
- Сложность лексики и грамматики соответствует уровню ${level}.
- НЕ редкие имена собственные, НЕ числа длинее двух цифр.
- Без кавычек внутри текста.

Пример (НЕ копируй):
${example}

ФОРМАТ — строго JSON без markdown:
{"text": "...", "targetingLevel": "${level}"}`,
    user: `Целевой уровень: ${level}.
Уже давал:
${used}

Сгенерируй следующее задание строго по схеме.`,
  };
}

export function finalLevelPrompt(
  language: Language,
  history: TestAnswer[],
  audio: AudioResult[] = [],
  speak: SpeakResult[] = [],
) {
  const lang = LANGUAGES[language].nameRu;
  const audioBlock =
    audio.length > 0
      ? `\n\nАУДИРОВАНИЕ (понял на слух?):\n${audio
          .map(
            (a, i) =>
              `${i + 1}. [${a.targetingLevel}] ${a.isCorrect ? "✓" : "✗"} (прослушал ${a.playCount}×) — "${a.passage}"`,
          )
          .join("\n")}`
      : "";
  const speakBlock =
    speak.length > 0
      ? `\n\nРЕЧЬ (произнёс вслух, Azure-оценка):\n${speak
          .map(
            (s, i) =>
              `${i + 1}. [${s.targetingLevel}] pron=${Math.round(s.pronunciationScore)} acc=${Math.round(s.accuracyScore)} flu=${Math.round(s.fluencyScore)} comp=${Math.round(s.completenessScore)} — целевой текст: "${s.text}" | распознано: "${s.recognized}"`,
          )
          .join("\n")}`
      : "";
  return {
    system: `Ты определяешь итоговый CEFR-уровень студента для ${lang} языка по адаптивному тесту, включающему 3 части: чтение/грамматика (MCQ), аудирование (MCQ после прослушивания) и устная речь (чтение вслух с оценкой Azure).

Логика:
- Базовый уровень — самый высокий, где студент стабильно (≥60%) справляется в текстовой и аудио-частях.
- Аудирование с многократным переслушиванием (playCount>1) — сигнал, что уровень аудирования НИЖЕ текстового; учитывай это.
- Речь: accuracy<60 ИЛИ completeness<70 → говорение явно слабее; accuracy≥80 и fluency≥70 → говорение на уровне; иначе — соответствует.
- Итог — это РЕАЛЬНЫЙ уровень владения, а не максимум по одной части. Если аудирование/речь сильно проседают — снижай.
- C2 ставь только при очень сильных результатах ВО ВСЕХ ТРЁХ частях.
- Не завышай.

Верни строго JSON без markdown:
{"level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2", "comment_ru": string}

comment_ru — 2-4 предложения на русском: что сильное, где провисает (отдельно отметь чтение/грамматику, аудирование, произношение), на что фокусироваться дальше. Конкретно: какие грамматические темы, какие звуки, какие жанры речи.`,
    user: `ЧТЕНИЕ/ГРАММАТИКА (MCQ):
${history
  .map(
    (h, i) =>
      `${i + 1}. [${h.targetingLevel}] ${h.isCorrect ? "✓" : "✗"} — ${h.question}`,
  )
  .join("\n")}${audioBlock}${speakBlock}

Определи итоговый уровень и дай совет.`,
  };
}
