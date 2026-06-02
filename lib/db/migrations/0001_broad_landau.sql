CREATE TABLE "sentence_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"level" text NOT NULL,
	"prompt" text NOT NULL,
	"grammar_focus" text,
	"vocabulary_hint" text,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sentence_tasks" ADD CONSTRAINT "sentence_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sentence_tasks_user_idx" ON "sentence_tasks" USING btree ("user_id","created_at");