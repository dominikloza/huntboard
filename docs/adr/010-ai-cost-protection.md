# 010: AI cost protection: limits in Postgres, usage log, injection defence, evals

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

Anyone can open a guest account with one click, and every AI call costs money (or eats a free
tier quota). Without limits, one script could drain the budget and break the demo for everyone.
Pasted offers are untrusted text that may try to steer the model. And "the AI works" needs a
number, not a feeling.

## Decision

**Limits in Postgres, not Redis.** Every AI call reserves a row in `ai_usage` before the model is
called. The reservation runs in a transaction holding a per-user advisory lock
(`pg_advisory_xact_lock(hashtext('ai_usage:' || user_id))`), counts the user's calls of that
kind in the last hour, checks a global daily budget, and inserts the row. Sliding windows:
a slot frees up exactly one hour after the call that used it.

- Guests: 10 per hour, GitHub accounts: 30 per hour, everyone together: 300 per day.
  All three are environment variables (`AI_LIMIT_GUEST_PER_HOUR`, `AI_LIMIT_MEMBER_PER_HOUR`,
  `AI_DAILY_BUDGET`); e2e runs with a guest limit of 3.
- Over the limit: `429` with `Retry-After` and a Polish message that says how long to wait and
  that the form can be filled by hand.
- If the provider fails before the first token, the row is deleted: users do not pay for
  errors. Token counts are written after the response (`after()` + `result.totalUsage`).
- The decision itself is a pure function (`checkQuota`) with unit tests; an e2e test fires six
  parallel requests and expects exactly three to pass (it fails without the lock).

**Prompt injection.** The offer goes into an `<offer>` data block; the instructions say never to
follow text inside it; closing tags and invisible characters (zero-width, bidi overrides) are
removed; the output is a fixed schema, so the model cannot do anything but fill fields; and the
user reviews every field before saving. An eval case hides an "ignore all previous
instructions" payload and checks that none of it reaches the answer.

**Evals.** `pnpm eval` runs 12 real-world-like offers (hourly and daily rates, two contract
types, EUR, an agency, an English post, a blog post that is not an offer, an injection attempt)
through the same `streamOfferExtraction` the app uses, scores each field
(`scoreExtraction`, unit-tested) and writes `evals/report.md`. Run it after every prompt or
model change and compare.

## Alternatives considered

- **Upstash Redis rate limiter:** the standard choice and faster per check, but one more
  service, account and pair of secrets for a few requests per minute. Postgres already holds
  the usage log the limit is computed from. If traffic grows, the `reserveAiCallForSession`
  interface stays and only its body changes.
- **Counting in memory:** resets on every cold start and is not shared between serverless
  instances.
- **Fixed windows (per clock hour):** simpler SQL, but allows 2x the limit around the hour
  boundary.
- **A moderation model to detect injection:** another paid call per request; the schema-bound
  output plus human review already limits what an injection can do.

## Consequences

- Each AI call costs one extra transaction (a few ms on Neon), negligible next to the model.
- The daily budget is checked without a global lock and can overshoot by a few calls under
  heavy parallel load: acceptable for a cost ceiling.
- `ai_usage` grows by one row per call; cheap at this scale, old rows can be pruned later.
- Evals need a real model and cost a few cents (free on Gemini's free tier); they are not part
  of CI.
