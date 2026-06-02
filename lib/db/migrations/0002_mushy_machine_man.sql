CREATE TABLE "listening_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid,
	"language" text NOT NULL,
	"target" text NOT NULL,
	"user_input" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"feedback_ru" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listening_attempts_score_check" CHECK ("listening_attempts"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "listening_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"level" text NOT NULL,
	"target_text" text NOT NULL,
	"translation_ru" text,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_progress" (
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"topic_key" text NOT NULL,
	"topic_label" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"avg_score" double precision DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topic_progress_user_id_language_topic_key_pk" PRIMARY KEY("user_id","language","topic_key")
);
--> statement-breakpoint
ALTER TABLE "listening_attempts" ADD CONSTRAINT "listening_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_attempts" ADD CONSTRAINT "listening_attempts_session_id_listening_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."listening_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_sessions" ADD CONSTRAINT "listening_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listening_attempts_user_idx" ON "listening_attempts" USING btree ("user_id","language","created_at");--> statement-breakpoint
CREATE INDEX "listening_sessions_user_idx" ON "listening_sessions" USING btree ("user_id","created_at");