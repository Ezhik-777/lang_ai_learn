CREATE TABLE "pronunciation_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid,
	"language" text NOT NULL,
	"target_text" text NOT NULL,
	"recognized_text" text NOT NULL,
	"pronunciation_score" double precision NOT NULL,
	"accuracy_score" double precision NOT NULL,
	"fluency_score" double precision NOT NULL,
	"completeness_score" double precision NOT NULL,
	"prosody_score" double precision,
	"words" jsonb NOT NULL,
	"ai_tip_ru" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pronunciation_attempts_lang_check" CHECK ("pronunciation_attempts"."language" in ('de','en')),
	CONSTRAINT "pronunciation_attempts_pron_check" CHECK ("pronunciation_attempts"."pronunciation_score" between 0 and 100),
	CONSTRAINT "pronunciation_attempts_acc_check" CHECK ("pronunciation_attempts"."accuracy_score" between 0 and 100),
	CONSTRAINT "pronunciation_attempts_flu_check" CHECK ("pronunciation_attempts"."fluency_score" between 0 and 100),
	CONSTRAINT "pronunciation_attempts_comp_check" CHECK ("pronunciation_attempts"."completeness_score" between 0 and 100),
	CONSTRAINT "pronunciation_attempts_pros_check" CHECK ("pronunciation_attempts"."prosody_score" is null or "pronunciation_attempts"."prosody_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "pronunciation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"target_text" text NOT NULL,
	"translation_ru" text,
	"focus_sounds_ru" text,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"user_id" text NOT NULL,
	"bucket" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_user_id_bucket_window_start_pk" PRIMARY KEY("user_id","bucket","window_start")
);
--> statement-breakpoint
CREATE TABLE "sentence_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"prompt" text NOT NULL,
	"user_answer" text NOT NULL,
	"ai_feedback" jsonb NOT NULL,
	"errors_count" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sentence_attempts_language_check" CHECK ("sentence_attempts"."language" in ('de','en')),
	CONSTRAINT "sentence_attempts_score_check" CHECK ("sentence_attempts"."score" between 0 and 100),
	CONSTRAINT "sentence_attempts_errors_check" CHECK ("sentence_attempts"."errors_count" between 0 and 50)
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"finished_at" timestamp,
	"result_level" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_sessions_language_check" CHECK ("test_sessions"."language" in ('de','en'))
);
--> statement-breakpoint
CREATE TABLE "user_languages" (
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"cefr_level" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_languages_user_id_language_pk" PRIMARY KEY("user_id","language"),
	CONSTRAINT "user_languages_language_check" CHECK ("user_languages"."language" in ('de','en')),
	CONSTRAINT "user_languages_level_check" CHECK ("user_languages"."cefr_level" is null or "user_languages"."cefr_level" in ('A1','A2','B1','B2','C1','C2'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pronunciation_attempts" ADD CONSTRAINT "pronunciation_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_attempts" ADD CONSTRAINT "pronunciation_attempts_session_id_pronunciation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pronunciation_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_sessions" ADD CONSTRAINT "pronunciation_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentence_attempts" ADD CONSTRAINT "sentence_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pronunciation_attempts_user_idx" ON "pronunciation_attempts" USING btree ("user_id","language","created_at");--> statement-breakpoint
CREATE INDEX "pronunciation_sessions_user_idx" ON "pronunciation_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "sentence_attempts_user_idx" ON "sentence_attempts" USING btree ("user_id","language","created_at");--> statement-breakpoint
CREATE INDEX "test_sessions_user_idx" ON "test_sessions" USING btree ("user_id","language","created_at");