CREATE TYPE "public"."event_source" AS ENUM('board', 'email', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."mail_action" AS ENUM('created', 'moved', 'none', 'unmatched', 'proposal', 'undone');--> statement-breakpoint
CREATE TYPE "public"."mail_kind" AS ENUM('applied', 'interview', 'offer', 'rejected', 'progress', 'other');--> statement-breakpoint
ALTER TYPE "public"."ai_usage_kind" ADD VALUE 'mail';--> statement-breakpoint
CREATE TABLE "mail_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"token_hint" text NOT NULL,
	"auto_reject_days" smallint DEFAULT 30,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_connections_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "mail_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"message_id" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"sender" text NOT NULL,
	"subject" text NOT NULL,
	"kind" "mail_kind" NOT NULL,
	"action" "mail_action" NOT NULL,
	"company" text,
	"role" text,
	"application_id" uuid,
	"previous_status" "application_status",
	"new_status" "application_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_messages_user_message_unique" UNIQUE("user_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "application_events" ADD COLUMN "source" "event_source" DEFAULT 'board' NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_connections" ADD CONSTRAINT "mail_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_messages_user_created_idx" ON "mail_messages" USING btree ("user_id","created_at");