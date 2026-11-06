# 001: Next.js as the only server (no separate backend)

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

Huntboard is a 2-week portfolio project for a Mid Frontend role. The interesting problems are in
the UI (optimistic drag & drop, streaming structured AI output, accessibility), not in running
infrastructure. The app needs a database, auth, a few mutations and two AI endpoints.

## Decision

One Next.js (App Router) application deployed on Vercel:

- Reads: React Server Components (data fetched on the server, hydrated into TanStack Query on the board).
- Writes: Server Actions for forms, Route Handlers for AI streaming.
- Database: Postgres (Neon) via Drizzle ORM. Auth: Auth.js or Better Auth (decided on Day 1).

## Alternatives considered

- **Separate NestJS/Express API:** shows backend skills but doubles the deployment and the auth
  surface, and moves the time budget away from the frontend.
- **BaaS (Supabase/Convex):** fastest, but hides the data layer I want to be able to explain.

## Consequences

- One deployment, one set of env vars, preview deployments per PR.
- Server code lives next to UI code, so the boundaries (`src/lib/db`, `"use client"`) must stay
  disciplined. AGENTS.md enforces them.
- If the product ever needs a public API or multiple clients, the data layer can be extracted.
