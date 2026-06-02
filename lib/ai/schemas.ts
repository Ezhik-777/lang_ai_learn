import { z } from "zod";

export const CEFR_ENUM = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const TestQuestionSchema = z.object({
  question: z.string().min(5).max(800),
  options: z.array(z.string().min(1).max(300)).length(4),
  correct: z.number().int().min(0).max(3),
  targetingLevel: CEFR_ENUM,
  type: z
    .enum(["translation", "error", "context", "idiom", "comprehension", "transform"])
    .optional()
    .default("context"),
});

export const TestFinalSchema = z.object({
  level: CEFR_ENUM,
  comment_ru: z.string().max(800).optional().default(""),
});

// Аудио-задача в тесте уровня: связный пассаж (1-3 предложения) + MCQ на смысл.
export const TestAudioTaskSchema = z.object({
  passage: z.string().min(8).max(400),
  question: z.string().min(5).max(300),
  options: z.array(z.string().min(1).max(200)).length(4),
  correct: z.number().int().min(0).max(3),
  targetingLevel: CEFR_ENUM,
});

// Речь: 2 связных предложения для чтения вслух (40-180 символов).
export const TestSpeakTaskSchema = z.object({
  text: z.string().min(20).max(220),
  targetingLevel: CEFR_ENUM,
});

export const SentenceGenSchema = z.object({
  prompt_ru: z.string().min(3).max(300),
  grammar_focus: z.string().min(2).max(150),
  vocabulary_hint: z.string().max(200).optional().default(""),
});

export const SentenceFeedbackSchema = z.object({
  corrected: z.string().min(1).max(800),
  score: z.number().int().min(0).max(100),
  errors: z
    .array(
      z.object({
        fragment: z.string().min(1).max(200),
        type: z.enum([
          "grammar",
          "vocabulary",
          "spelling",
          "word_order",
          "punctuation",
        ]),
        explanation_ru: z.string().min(1).max(600),
        suggestion: z.string().min(1).max(200),
      }),
    )
    .max(20)
    .default([]),
  next_focus_ru: z.string().max(400).optional().default(""),
});

export const ListeningSentenceSchema = z.object({
  target: z.string().min(2).max(200),
  translation_ru: z.string().min(2).max(300),
});

export const ListeningCheckSchema = z.object({
  score: z.number().int().min(0).max(100),
  wrong_words: z.array(z.string().max(80)).max(20).default([]),
  missed_words: z.array(z.string().max(80)).max(20).default([]),
  feedback_ru: z.string().max(400),
});

export const PronunciationPhraseSchema = z.object({
  phrase: z.string().min(2).max(200),
  translation_ru: z.string().min(2).max(300),
  focus_sounds_ru: z.string().max(150).optional().default(""),
});
