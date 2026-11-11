-- Custom migration (drizzle-kit generate --custom): cards created before the stage history
-- existed get one event: their current stage, dated when the card was last changed. Earlier
-- stages are unknown; the statistics treat a rejected card without history as "applied".
INSERT INTO "application_events" ("application_id", "user_id", "status", "created_at")
SELECT "id", "user_id", "status", "updated_at"
FROM "applications" a
WHERE NOT EXISTS (SELECT 1 FROM "application_events" e WHERE e."application_id" = a."id");
