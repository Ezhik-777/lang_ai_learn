CREATE TABLE "mistake_drills" (
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"topic_key" text NOT NULL,
	"topic_label" text NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"next_due_at" timestamp DEFAULT now() NOT NULL,
	"graduated_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mistake_drills_user_id_language_topic_key_pk" PRIMARY KEY("user_id","language","topic_key")
);
--> statement-breakpoint
ALTER TABLE "mistake_drills" ADD CONSTRAINT "mistake_drills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mistake_drills_due_idx" ON "mistake_drills" USING btree ("user_id","language","next_due_at");