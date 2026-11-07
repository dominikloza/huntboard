# 005: Postgres on Neon, Drizzle ORM, SQL migrations in the repo

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The data is relational (user -> applications -> notes, usage per user) and every query is scoped
by user. The app runs on Vercel (Node.js runtime). Types must flow from the database to the UI
without hand-written duplicates.

## Decision

- **Postgres on Neon** (eu-central-1), free tier, branchable for previews later.
- **Drizzle ORM** with the schema in TypeScript (`src/lib/db/schema`). Row types
  (`ApplicationRow`) are inferred and UI types are `Pick`s of them.
- **`node-postgres` (`pg`) driver** over TCP with a small pool, using Neon's **pooled** URL for the
  app and the **direct** URL for migrations. The same driver works with a local Postgres in
  development and in CI (a Postgres service container), so tests do not need Neon.
- **Migrations are generated SQL files** committed in `drizzle/` (`pnpm db:generate`), applied
  with `pnpm db:migrate`. No `push` against shared databases.
- **Constraints in the database**, not only in Zod: enums for status and work mode, checks for
  score range and salary order, cascade deletes from `user`.
- The Drizzle client is created lazily (`getDb()`), so `next build` needs no database.

## Alternatives considered

- **Neon serverless driver (HTTP/WebSocket):** better for edge runtimes and very spiky traffic,
  but does not talk to a plain local Postgres, which makes CI and local dev harder.
- **Prisma:** mature, but a heavier toolchain and generated client; Drizzle keeps SQL visible.
- **Supabase / Convex:** more managed features than this project needs.

## Consequences

- Each serverless instance keeps a small pool (max 5). If connection counts become a problem,
  switch to the Neon serverless driver or Vercel's pool attachment.
- Schema changes are a two-step flow: edit schema -> `pnpm db:generate` -> review SQL -> migrate.
- Text sort order depends on the database collation. Card order keys (fractional indexing) must
  compare byte by byte, so `applications.position` is `COLLATE "C"` (migration 0001). Found by
  CI, whose Postgres uses `en_US` while local and Neon used `C.UTF-8`.
