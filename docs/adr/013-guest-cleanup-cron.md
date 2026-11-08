# 013: Daily cleanup of stale guest accounts

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

"Wejdź jako gość" creates an anonymous user with a seeded workspace (five cards, a profile).
Every visitor and every e2e run against the deployment (ADR 012) adds one. Nobody can return
to a guest account once its session cookie expires (7 days, Better Auth default), so the rows
only take space in the free Neon database.

## Decision

A Vercel Cron job (`vercel.json`, daily at 03:17 UTC; the Hobby plan allows one run per day)
calls `GET /api/cron/cleanup-guests`. The handler checks `Authorization: Bearer $CRON_SECRET`
(constant-time, and nothing is authorized when the variable is unset), then deletes anonymous
users that were created more than 7 days ago and have no session still valid within the last
7 days (`src/lib/db/queries/guest-cleanup.ts`). Cards, notes, profiles and AI usage rows go
with them through `ON DELETE CASCADE`.

This query is the one exception to "every query takes `userId` from the session": it is a
system job, guarded by the cron secret instead.

## Alternatives considered

- **Delete by `created_at` only:** would remove a guest who is using the app right now.
- **Postgres `pg_cron` in Neon:** keeps the job next to the data, but it is invisible in the
  repo and in Vercel logs, and not available on every plan.
- **Delete on sign-out:** most guests never sign out; they just close the tab.

## Consequences

- Guest data lives at most about two weeks (7 days of session plus 7 days of retention).
- The daily AI budget (ADR 010) is unaffected: it counts the last 24 hours only.
- The route is tested in e2e (401 without the secret, 200 with it, an active guest survives);
  the delete rule was checked against Postgres with a stale guest, an active old guest, a new
  guest and an old regular user. `CRON_SECRET` must be set in Vercel (Production).
