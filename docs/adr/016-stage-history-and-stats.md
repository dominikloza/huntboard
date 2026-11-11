# 016: Stage history and funnel statistics

- **Status:** Accepted
- **Date:** 2026-11-11

## Context

A job search is a funnel: how many offers turn into interviews, how long companies take to
answer, which applications are stuck. The board stored only the **current** stage of a card, so
a rejected card could not tell whether it was rejected after an interview, and nothing recorded
when an application was sent.

## Decision

- **A stage history table** (`application_events`): one row whenever a card enters a stage:
  created in it, dragged into it, or saved with a new stage in the form. Written in the same
  transaction as the change (`recordStage` in `src/lib/db/queries/applications.ts`), with the
  owner denormalised like `notes` so every read filters by the session user.
- **Backfill** (custom migration 0007): existing cards get one event, their current stage at
  their last change. Earlier stages are unknown, so a rejected card without history counts as
  sent, never as interviewed.
- **Statistics are computed in code** from cards + history (`computeStats`,
  `src/features/stats/lib/stats.ts`, pure and unit-tested): the funnel by the furthest stage a
  card reached, the median days from "applied" to the first answer, applications waiting more
  than 14 days without an answer, and applications sent per week (Monday to Sunday, UTC) for 8
  weeks.
- **The page `/stats`** is a Server Component with no client JavaScript. Charts are plain HTML
  bars in one hue (cobalt, a single series, so no legend), values written next to the marks, and
  a screen reader table for the weekly chart.
- **The guest account** gets a backdated history (`GUEST_HISTORY`), so the page shows a
  believable search from the first visit.

## Alternatives considered

- **Derive everything from `updated_at` and the current status:** no history, so no answer time
  and a wrong funnel for rejected cards.
- **A charting library (Recharts, Chart.js):** tooltips and axes for free, but client JS and a
  default look for 4 bars and 8 columns that HTML draws in the house style.
- **Store aggregates (counters per user):** faster for huge boards, but every change needs two
  writes kept in sync; a person has tens of cards, not millions.

## Consequences

- Every write that changes a stage must call `recordStage` (AGENTS.md). Deleting a card deletes
  its history (cascade), so statistics describe the cards still on the board.
- Weeks are cut in UTC: a move late on Sunday evening in Poland can land in the next week.
