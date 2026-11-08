# 012: Testing strategy: what each layer proves

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

The app has pure logic (ordering, filters, match score, limits), interactive client components
(drag & drop, streaming AI forms), server code that only makes sense against a real database
(Route Handlers, Server Actions, auth) and AI output that is never the same twice. One kind of
test cannot cover all of that well, and a single coverage percentage would hide where the gaps
are.

## Decision

Four layers, each with a clear job:

1. **Unit tests (Vitest)** for pure logic: `lib/` folders and Zod schemas. Coverage threshold
   90% lines there (`vitest.config.mts`); currently about 96%.
2. **Component tests (Testing Library)** for client components with real state: the AI intake
   (stream fills the form, stopped or cut stream, 429 message and retry), the match panel
   (coach and roast streams, saved comments, errors) and the profile form. A small helper fakes
   the streamed `fetch` response (`src/test/stream.ts`). Queries go by role and label only.
3. **E2E (Playwright + axe)** for everything that needs the real stack: Postgres, auth, Server
   Actions, drag & drop with mouse, touch and keyboard, accessibility in both themes on desktop
   and mobile. Runs in CI against a production build with a Postgres service, and after every
   Vercel deployment against the deployed URL (`e2e-deployment.yml`). AI tests use a scripted
   demo model (`AI_PROVIDER=mock`); against a deployment that uses a real model they skip
   themselves, everything else still runs.
4. **Evals (`pnpm eval`)** for AI quality, run by hand on the real model: offer extraction and
   match comments. Every check is a rule in code (`src/lib/ai/evals`), not a second model:
   fields match, no score invented, no technology from nowhere, Polish, short, roast never about
   the person, injection payloads never echoed. The scorers have their own unit tests.

**Coverage is measured where unit tests are the right tool.** Route Handlers, Server Actions,
database queries and auth are excluded from the unit coverage report on purpose: they are
covered by e2e against a real database. The overall unit number (about 69%) is a regression
floor, not a goal.

## Alternatives considered

- **One coverage target for everything (e.g. 80% overall):** pushes people to mock the
  database and Next.js internals, which tests the mocks.
- **LLM-as-a-judge for AI output:** catches tone better, but it is a second model with its own
  errors and costs, and results drift. Rule-based checks are cheap, repeatable and explain
  every failure; a judge can be added later for tone only.
- **Mocking fetch with MSW in component tests:** more realistic HTTP, but the streaming
  responses we need are three lines with a `ReadableStream`.

## Consequences

- A failing layer says what broke: logic, a component state, the integrated app, or the model.
- Deployment e2e on production creates guest accounts like any visitor; they hold only demo
  data. A scheduled cleanup of old guest accounts belongs to the polish phase.
- Evals cost a few cents (free on Gemini's free tier) and are not part of CI.
