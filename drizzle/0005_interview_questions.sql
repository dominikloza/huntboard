ALTER TYPE "public"."ai_usage_kind" ADD VALUE 'questions';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "interview_questions" jsonb;