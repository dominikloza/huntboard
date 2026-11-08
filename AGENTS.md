<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Huntboard: rules for AI coding agents

Huntboard is a portfolio project: an AI-assisted job application tracker (Next.js App Router,
React 19, TypeScript strict). The full plan is in `docs/PLAN.md`; decisions are in `docs/adr/`.
**Read the relevant ADR before changing an area it covers. If you make a new architectural
decision, write a new ADR (`docs/adr/000-template.md`).**

## Commands (run before you say a task is done)

```bash
pnpm lint          # ESLint (flat config)
pnpm format:check  # Prettier (+ Tailwind class sorting)
pnpm typecheck     # next typegen + tsc --noEmit
pnpm test          # Vitest unit/component tests
pnpm e2e           # Playwright e2e + axe accessibility checks (starts the dev server)
pnpm check         # lint + format + typecheck + test
pnpm db:generate   # after editing src/lib/db/schema: writes a SQL migration to drizzle/
pnpm db:migrate    # applies migrations (uses DATABASE_URL_UNPOOLED from .env.local)
pnpm auth:schema   # after changing Better Auth plugins: regenerates src/lib/db/schema/auth.ts
```

E2E tests need a database: `DATABASE_URL` in `.env.local` pointing at a migrated Postgres.

A task is done only when `pnpm check` passes and, for UI changes, `pnpm e2e` passes too.

## Code conventions

- **Feature folders.** Domain code lives in `src/features/<feature>/` (`components/`, `lib/`,
  `types.ts`). Shared primitives: `src/components/ui` (shadcn-style), `src/components/paper`
  (Huntboard signature components), `src/lib` (framework-free utilities).
- **No `any`.** No non-null assertions to silence the compiler. `noUncheckedIndexedAccess` is on:
  handle `undefined`.
- **One source of truth per shape, no hand-written duplicates.** Stored data: the Drizzle schema
  (`src/lib/db/schema`), UI types are `Pick`s of the inferred row types. Input data (forms,
  Server Actions, AI output): a Zod schema, with the TS type from `z.infer`. Shared enums live in
  `src/features/board/constants.ts`.
- **Every database query takes `userId` from the server session**, never from client input
  (IDOR protection). Queries live in one layer (`src/lib/db/queries`): the exported function calls
  `requireUser()` and passes `user.id` to an unexported helper. Server Actions re-check the session too.
  In render paths, call `await connection()` (from `next/server`) after `requireUser()` and before
  the first query: opening a Postgres connection uses crypto randomness, which Next.js forbids
  while prerendering.
- **Session reads go behind `<Suspense>`** (Cache Components). Use `getCurrentUser()` /
  `requireUser()` from `src/lib/auth/session.ts`; never read cookies in a layout's top level.
- Never edit `src/lib/db/schema/auth.ts` or `drizzle/*.sql` by hand; regenerate them.
- Forms that change auth state are Server Actions (work without JavaScript).
- **Board data (ADR 006):** reads = server prefetch into TanStack Query + `GET /api/applications`;
  writes = Server Actions that validate with the shared Zod schema and **return**
  `ActionResult` (never throw for validation). Update the cache with a pure, tested helper in
  `src/features/board/lib/cache.ts`. Query keys live in `src/features/board/query-keys.ts`.
- Next.js keeps recent routes alive (React Activity): state survives navigation. Reset what must
  not survive (e.g. a submitted form) explicitly, or key the component by its data.
- `error.tsx` receives `{ error, retry }` in this Next.js version (not `reset`).
- **Secrets only on the server.** Never `NEXT_PUBLIC_` for API keys. AI calls go through Route
  Handlers that check the session and the rate limit first.
- **AI (ADR 009):** get the model only from `getModel()` (`src/lib/ai/model.ts`). Model output
  schemas live in `src/features/<feature>/schemas.ts` (all keys required, nullable instead of
  optional). Pasted user text goes into a delimited data block (`src/lib/ai/prompts`), never
  into instructions. Stream with `textStreamAfterFirstChunk` so early provider errors become
  HTTP errors. AI output is a draft: the user confirms before anything is saved.
- **Every AI call reserves a slot first (ADR 010):** `reserveAiCallForSession(kind, model)`
  before the model call, `refund()` if the provider fails before answering, `record(usage)` in
  `after()`. Never call a model from a Route Handler without it.
- **Evals:** prompt or model changes must be followed by `pnpm eval` (real model, writes
  `evals/report.md`); add a case to `evals/extract/` for every bug the model makes.
- **Match score (ADR 011):** computed only by `scoreMatch` (`src/features/match/lib/score.ts`),
  never by a model. Every write that can change it (card create/update, profile save, guest seed)
  stores the new score in the same transaction. AI comments explain the score; prompts must say
  not to compute or contradict it.
- **E2E never calls a real model:** Playwright starts the app with `AI_PROVIDER=mock`
  (`src/lib/ai/demo-model.ts`). Add new scripted answers there, not network mocks.
- **Filters and search state live in the URL** (nuqs), not in a global store (ADR 008). Parsers
  and the pure `filterApplications` live in `src/features/board/filters.ts`. A move made while
  filtering must map neighbours with `neighboursInFullColumn`.
- **Notes (ADR 008):** Server Actions return `NoteResult`; the UI uses `useOptimistic`. Never call
  `refresh()` from an action used inside the `@modal` sheet: it turns the modal into the full page.
- Server Components by default. Add `"use client"` only to the smallest interactive leaf.
- Tests: pure logic gets a Vitest test next to the file (`*.test.ts`). Components get Testing
  Library tests that query by role/label, not by class names.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).

## Design rules (direction B "Biuro podawcze", see docs/adr/002)

The UI must not look like a default AI-generated app. `/styleguide` is the visual source of truth;
add every new shared component there, in both themes.

- **Use tokens, never raw colors.** Tailwind classes map to tokens in `src/app/globals.css`
  (`bg-card`, `bg-folder`, `text-muted-foreground`, `border-ink`, `bg-primary`,
  `text-primary-ink`, `text-pen`...). No hex values or Tailwind palette colors (`blue-600`) in
  components.
- `primary` is a **fill** (buttons). For cobalt **text or lines** use `primary-ink` (AA in both themes).
- **Red pen (`pen`) only in roast mode and error messages.** Nowhere else.
- **Caveat (`font-pen`) only inside `PenNote`.** Never in headings or buttons.
- Headings: `font-display` (Bricolage Grotesque). Body: `font-sans` (IBM Plex Sans). Numbers,
  salaries, scores, stamps: `font-mono` (IBM Plex Mono).
- Shape: radius 2px (`rounded-md`); `rounded-t-tab` only for folder tabs; `rounded-full` only
  for score circles. Outlines are `border-[1.5px] border-ink`.
- Hard shadow (`shadow-hard`) only on primary buttons, the offer details sheet and the card being
  dragged (it is lifted off the board), not on every card.
- Stamps (`Stamp`) only where they carry information (status, date). Max one per card.
- Icons: `@phosphor-icons/react` only (lint rule blocks lucide). Never emoji in the UI.
- Motion must have a reason (feedback, state change, streaming). Use `animate-stamp` /
  `animate-pen`; everything respects `prefers-reduced-motion` (global rule in globals.css).
- Every state is designed: loading (skeletons shaped like the content, no spinners), empty,
  error, disabled.

### Banned (AI tells)

Purple/blue gradients and glows, glassmorphism, centered hero over a gradient blob, three equal
feature cards, default shadcn look, Inter as the font, uppercase micro-labels above every
section, decorative status dots, em-dashes or en-dashes in UI copy (use `-`), fake product
screenshots built from divs, "Acme"/"John Doe" sample data, filler copy ("seamless", "elevate",
"unleash", "next-gen").

## Accessibility (enforced by `e2e/*.spec.ts` with axe)

- Real elements: `<button>`, `<a href>`, `<label>` + `<input>`. Never `onClick` on a div.
- Icon-only buttons get `aria-label`. Scrollable regions get `tabIndex={0}`, `role="region"` and a label.
- Text contrast 4.5:1 in both themes. Check `/styleguide` light and dark after every visual change.
- Drag & drop (ADR 007) works with mouse, touch and keyboard and announces moves in Polish.
  Any change to the board must keep `e2e/dnd.spec.ts` green. Card order logic lives in
  `src/features/board/lib/move.ts` (pure, tested); never compare positions with `localeCompare`.
