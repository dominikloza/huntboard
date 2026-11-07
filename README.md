# Huntboard

**A filing cabinet for your job search.** Paste a job offer, AI turns it into a structured card
and scores it against your profile, you move it through the process on a board. Roast mode lets
an AI recruiter go over the offer with a red pen.

> Status: **Day 2 of 10**. Sign-in (GitHub or guest), a live board with create / edit / delete
> in a URL-addressable sheet. Drag & drop and AI features are next. See [`docs/PLAN.md`](docs/PLAN.md).

## Why this project

I built it to run my own job search, and to show the frontend problems I care about:

- **Optimistic drag & drop** with rollback, fractional ordering and full keyboard support.
- **Streaming structured AI output** rendered field by field, then edited by a human before saving.
- **A design system that does not look AI-generated**, with accessibility checked in CI.

## Stack

Next.js 16 (App Router, RSC, Server Actions) · React 19 · TypeScript (strict,
`noUncheckedIndexedAccess`) · Tailwind CSS 4 · Radix primitives (shadcn-style components) ·
Vitest + Testing Library · Playwright + axe · GitHub Actions.

Data and auth: Postgres (Neon) + Drizzle ORM · Better Auth (GitHub OAuth + guest accounts).

Board: TanStack Query (server prefetch + hydration) · Server Actions · React Hook Form + Zod ·
parallel & intercepting routes for the card sheet.

Coming next: dnd-kit with optimistic moves, Vercel AI SDK, Upstash rate limiting.

## Decisions

Every non-obvious choice has an ADR in [`docs/adr`](docs/adr/README.md), e.g. why there is no
separate backend, why direction B, why fonts are self-hosted.

## Getting started

Requirements: Node 22+, pnpm 10, a Postgres database (a free [Neon](https://neon.tech) project
or a local Postgres) and a GitHub OAuth App
(callback `http://localhost:3000/api/auth/callback/github`).

```bash
pnpm install
cp .env.example .env.local    # fill in DATABASE_URL, BETTER_AUTH_*, GITHUB_*
pnpm db:migrate               # creates the tables
pnpm dev                      # http://localhost:3000, design system at /styleguide
pnpm exec playwright install chromium   # once, for e2e tests
```

No GitHub app yet? Click "Wejdź jako gość": the guest account works with the database alone.

| Command       | What it does                                              |
| ------------- | --------------------------------------------------------- |
| `pnpm check`  | lint + format check + typecheck + unit tests              |
| `pnpm test`   | Vitest unit and component tests                           |
| `pnpm e2e`    | Playwright e2e + axe (light and dark, desktop and mobile) |
| `pnpm format` | Prettier with Tailwind class sorting                      |

Copy `.env.example` to `.env.local` when the database, auth and AI features land.

## Working with AI agents

Rules for coding agents (Cursor, Claude Code, Copilot) are in [`AGENTS.md`](AGENTS.md):
commands to run, code conventions, design rules and a list of banned "AI tells".
