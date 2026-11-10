# 015: Interview questions generated from the offer

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

After saving an offer and seeing the match, the next step of a job search is the interview. The
plan listed "interview questions from the offer's stack" as a stretch goal. It can reuse what the
app already has: the offer's stack, the profile, the missing skills computed by `scoreMatch`, the
streaming pipeline and the AI limits.

## Decision

- **Where:** a "Przygotowanie do rozmowy" section in the card sheet. One click streams a set of
  6 flashcards (5 technical, 1 about teamwork) and 2 questions to ask the employer. The set is
  saved on the card (`applications.interview_questions`, jsonb), like the match comments.
- **Grounded in data, not in the model's idea of the job:** technical topics must come from the
  offer's stack, and when the profile is missing skills from the offer (`missingSkills` from
  `scoreMatch`, ADR 011), at least two questions are about them. Without a profile the stack is
  covered evenly. A card without a stack gets a 409 with a hint instead of a vague set.
- **Same pipeline as the other AI features:** `POST /api/questions` checks the session, reserves
  an AI call (new usage kind `questions`, ADR 010), streams with `textStreamAfterFirstChunk`,
  saves and records tokens in `after()`. The offer goes into data blocks (`offer_summary`,
  `focus`, `offer`), never into the instructions.
- **Flashcards are `<details>`:** the hint ("what a good answer covers") is folded until asked
  for. Native disclosure: keyboard and screen readers work without custom code.
- **Evals:** `pnpm eval --suite questions` runs the 4 profile/offer pairs from `evals/match` and
  checks with rules: Polish, 6 + 2 short items, topics from the stack plus one teamwork
  question, at least two questions about the gaps, no technology from nowhere in the questions,
  no injected text.

## Alternatives considered

- **Questions on demand per technology (pick a tech, get questions):** more control, more
  clicks; the stack and the gaps already say what matters.
- **A fixed question bank per technology:** free and instant, but generic and blind to the
  offer's level and wording.
- **Spaced repetition and "I knew it" tracking:** useful, but a product of its own; out of scope.

## Consequences

- One more AI call kind shares the same hourly limit and daily budget.
- The quota message offers the manual form only for the offer intake (the only AI feature
  with a manual alternative).
- The demo model answers with `DEMO_QUESTIONS` (marker "INTERVIEW PREP" in the instructions), so
  e2e covers the flow without a real model.
