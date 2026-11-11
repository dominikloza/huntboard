-- Cards created from Gmail's plain-text body before ADR 017's cleanup: a link or an image tag
-- read as the city, and *bold* markers around the company or the title.
UPDATE "applications" SET "city" = NULL
WHERE "city" ~* '(https?://|\[image:|<|>)';
--> statement-breakpoint
UPDATE "applications" SET "company" = btrim("company", ' *_')
WHERE "company" ~ '^[*_]|[*_]$' AND btrim("company", ' *_') <> '';
--> statement-breakpoint
UPDATE "applications" SET "role" = btrim("role", ' *_')
WHERE "role" ~ '^[*_]|[*_]$' AND btrim("role", ' *_') <> '';
--> statement-breakpoint
UPDATE "mail_messages" SET "company" = btrim("company", ' *_')
WHERE "company" ~ '^[*_]|[*_]$' AND btrim("company", ' *_') <> '';
