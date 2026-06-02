import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  serial,
  doublePrecision,
  uuid,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type Language = "de" | "en";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userLanguages = pgTable(
  "user_languages",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    cefrLevel: text("cefr_level").$type<CefrLevel | null>(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.language] }),
    check("user_languages_language_check", sql`${t.language} in ('de','en')`),
    check(
      "user_languages_level_check",
      sql`${t.cefrLevel} is null or ${t.cefrLevel} in ('A1','A2','B1','B2','C1','C2')`,
    ),
  ],
);

// Серверная сессия теста — клиент не может подменить уровень
export const testSessions = pgTable(
  "test_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    history: jsonb("history").notNull().default([]), // [{question, options, correct, targetingLevel, type, userAnswer, isCorrect}]
    finishedAt: timestamp("finished_at"),
    resultLevel: text("result_level").$type<CefrLevel | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("test_sessions_user_idx").on(t.userId, t.language, t.createdAt),
    check("test_sessions_language_check", sql`${t.language} in ('de','en')`),
  ],
);

export const sentenceAttempts = pgTable(
  "sentence_attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    prompt: text("prompt").notNull(),
    userAnswer: text("user_answer").notNull(),
    aiFeedback: jsonb("ai_feedback").notNull(),
    errorsCount: integer("errors_count").notNull().default(0),
    score: integer("score").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("sentence_attempts_user_idx").on(
      t.userId,
      t.language,
      t.createdAt,
    ),
    check("sentence_attempts_language_check", sql`${t.language} in ('de','en')`),
    check("sentence_attempts_score_check", sql`${t.score} between 0 and 100`),
    check(
      "sentence_attempts_errors_check",
      sql`${t.errorsCount} between 0 and 50`,
    ),
  ],
);

// Серверная задача "составь предложение" — клиент не может подсунуть произвольный prompt в /check
export const sentenceTasks = pgTable(
  "sentence_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    level: text("level").$type<CefrLevel>().notNull(),
    prompt: text("prompt").notNull(),
    grammarFocus: text("grammar_focus"),
    vocabularyHint: text("vocabulary_hint"),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("sentence_tasks_user_idx").on(t.userId, t.createdAt),
  ],
);

// Серверная сессия произношения — challenge-based, клиент не может подделать скор
export const pronunciationSessions = pgTable(
  "pronunciation_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    targetText: text("target_text").notNull(),
    translationRu: text("translation_ru"),
    focusSoundsRu: text("focus_sounds_ru"),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("pronunciation_sessions_user_idx").on(t.userId, t.createdAt),
  ],
);

export const pronunciationAttempts = pgTable(
  "pronunciation_attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => pronunciationSessions.id, {
      onDelete: "set null",
    }),
    language: text("language").$type<Language>().notNull(),
    targetText: text("target_text").notNull(),
    recognizedText: text("recognized_text").notNull(),
    pronunciationScore: doublePrecision("pronunciation_score").notNull(),
    accuracyScore: doublePrecision("accuracy_score").notNull(),
    fluencyScore: doublePrecision("fluency_score").notNull(),
    completenessScore: doublePrecision("completeness_score").notNull(),
    prosodyScore: doublePrecision("prosody_score"),
    words: jsonb("words").notNull(),
    aiTipRu: text("ai_tip_ru"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("pronunciation_attempts_user_idx").on(
      t.userId,
      t.language,
      t.createdAt,
    ),
    check(
      "pronunciation_attempts_lang_check",
      sql`${t.language} in ('de','en')`,
    ),
    check(
      "pronunciation_attempts_pron_check",
      sql`${t.pronunciationScore} between 0 and 100`,
    ),
    check(
      "pronunciation_attempts_acc_check",
      sql`${t.accuracyScore} between 0 and 100`,
    ),
    check(
      "pronunciation_attempts_flu_check",
      sql`${t.fluencyScore} between 0 and 100`,
    ),
    check(
      "pronunciation_attempts_comp_check",
      sql`${t.completenessScore} between 0 and 100`,
    ),
    check(
      "pronunciation_attempts_pros_check",
      sql`${t.prosodyScore} is null or ${t.prosodyScore} between 0 and 100`,
    ),
  ],
);

// Сессия аудирования: target text фиксируется серверно, аудио проигрывается клиенту
export const listeningSessions = pgTable(
  "listening_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    level: text("level").$type<CefrLevel>().notNull(),
    targetText: text("target_text").notNull(),
    translationRu: text("translation_ru"),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("listening_sessions_user_idx").on(t.userId, t.createdAt)],
);

export const listeningAttempts = pgTable(
  "listening_attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => listeningSessions.id, {
      onDelete: "set null",
    }),
    language: text("language").$type<Language>().notNull(),
    target: text("target").notNull(),
    userInput: text("user_input").notNull(),
    score: integer("score").notNull().default(0),
    feedbackRu: text("feedback_ru"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("listening_attempts_user_idx").on(
      t.userId,
      t.language,
      t.createdAt,
    ),
    check("listening_attempts_score_check", sql`${t.score} between 0 and 100`),
  ],
);

// Прогресс по грамматическим темам — основа для рекомендаций "слабые темы"
export const topicProgress = pgTable(
  "topic_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    topicKey: text("topic_key").notNull(), // нормализованный ключ из grammar_focus
    topicLabel: text("topic_label").notNull(), // человекочитаемая версия
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0), // attempts со score>=80
    avgScore: doublePrecision("avg_score").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.language, t.topicKey] })],
);

// SRS-расписание тренировок ошибок: следующий drill по теме
export const mistakeDrills = pgTable(
  "mistake_drills",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    topicKey: text("topic_key").notNull(),
    topicLabel: text("topic_label").notNull(),
    streak: integer("streak").notNull().default(0), // подряд успешных drill'ов
    intervalDays: integer("interval_days").notNull().default(1),
    nextDueAt: timestamp("next_due_at").defaultNow().notNull(),
    graduatedAt: timestamp("graduated_at"), // не null = тема "освоена" (skip из выборки)
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.language, t.topicKey] }),
    index("mistake_drills_due_idx").on(t.userId, t.language, t.nextDueAt),
  ],
);

// Rate limiting — счётчик попыток в окне
export const rateLimits = pgTable(
  "rate_limits",
  {
    userId: text("user_id").notNull(),
    bucket: text("bucket").notNull(), // напр.: 'sentence:check', 'pronunciation:save'
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.bucket, t.windowStart] }),
    index("rate_limits_window_idx").on(t.windowStart),
  ],
);
