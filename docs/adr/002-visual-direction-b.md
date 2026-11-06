# 002: Visual direction B "Biuro podawcze" and design tokens

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

AI coding agents default to the same look (purple gradients, Inter, default shadcn, three
cards). A portfolio project must be recognisable in the first five seconds. Three directions were
explored: A "Warsztat" (dark dev tool), B "Biuro podawcze" (paper office), C "Liga" (gamified).

## Decision

Direction **B**: the job search as a paper filing system.

- Columns are folders with tabs, applications are perforated sheets, statuses are rubber stamps.
- Roast mode is a recruiter's **red pen**: strike-throughs, circled phrases, handwritten notes.
- Tokens live in `src/app/globals.css` (light and dark "after hours" theme) and are the only way
  components get colors. `primary` (fill) and `primary-ink` (text/lines) are separate because
  dark-mode cobalt fails contrast as text.
- Type: Bricolage Grotesque (display), IBM Plex Sans (text), IBM Plex Mono (numbers), Caveat (pen only).
- Icons: Phosphor. Radius 2px. Hard shadows only on primary actions.

## Alternatives considered

- **A Warsztat:** safest, but close to many existing dev tools.
- **C Liga:** fun, but the gamification easily becomes noise in a productivity tool.

## Consequences

- Strong, memorable identity that is still built on shadcn/Radix primitives.
- The metaphor needs restraint (rules in AGENTS.md): stamps and red pen only where they carry meaning.
- Every new component is added to `/styleguide` and checked by axe in both themes.
