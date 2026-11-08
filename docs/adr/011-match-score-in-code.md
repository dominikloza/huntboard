# 011: Match score computed in code, AI only comments (coach and roast)

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

Every card should say how well the offer fits the user: a number on the board and an
explanation in the sheet. The obvious build is "ask the model for a score". But a model gives a
different number for the same input, costs a call per card, fails when the quota runs out, and
cannot say why 74 and not 79. The plan also asks for a roast mode: the same analysis in the
voice of a sarcastic recruiter.

## Decision

**The score is a pure function** (`scoreMatch(profile, offer)` in `src/features/match/lib`).
Four parts with fixed weights: stack 55% (the first three technologies count double, names
compared with `sameTech`, one direction only: React does not cover React Native), salary 20%
(top of the range against the user's minimum, zero at 30% below), work mode 15% (preference
table) and level 10% (years of experience mapped to Junior/Mid/Senior/Lead). Missing data scores
a neutral 0.6, so an offer without a salary is neither punished nor rewarded. Each part carries
a Polish sentence for the breakdown.

The score is stored on the card (`match_score`) and kept in sync: on create and update of a
card, for every card in the transaction that saves the profile, and when a guest workspace is
seeded. It needs no AI, no key and no quota.

**The AI writes a comment on that score** (`POST /api/match`, `{ verdict, strengths, gaps,
advice }`). The prompt gets the profile, the offer, the pasted offer text and the computed
breakdown in data blocks, and is told not to compute its own score or contradict the numbers.
Two tones share the schema: coach (temperature 0.4) and roast (0.9, "roast the offer and the
skills, never the person", no personal traits, no profanity). Each finished comment is saved on
the card (`match_comment`, `roast_comment`) with the score it was based on, the model and the
date, so reopening the card costs nothing. Calls go through the same reservation, refund and
usage log as the extraction (ADR 010), as kinds `match` and `roast`.

**Roast has its own look:** red pen and handwriting (Caveat via `PenNote`), a red margin line
and staggered notes. It is the only place in the app that uses them (ADR 002).

## Alternatives considered

- **Score from the model:** unstable, paid per card, unexplainable, and it would need its own
  evals. Kept for the comment only, where wording may vary.
- **Embeddings similarity between profile and offer:** a number without an explanation, plus a
  vector store for a few dozen cards.
- **Recomputing scores on read:** always fresh, but sorting and filtering by score on the
  server would need the profile on every query. Writing the score keeps reads simple.

## Consequences

- The board shows a score on every card as soon as the profile exists, even without AI.
- Weights are product decisions in one file, covered by unit tests; changing them changes every
  score on the next profile save.
- The comment can disagree in tone with the score only within what the prompt allows; the
  number shown is always the computed one.
- Comments are not evaluated automatically yet (the extraction is). A small eval set for tone
  and factual consistency is a follow-up.
