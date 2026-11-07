# 006: Board data: TanStack Query for reads, Server Actions for writes, sheet as an intercepted route

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The board is the most interactive screen: cards are created and edited in a sheet, and from
Day 3 they are dragged between columns with optimistic updates. That needs a client-side cache
we control (rollback, invalidation). At the same time the first paint should show real data,
not a spinner, and every write must be validated and authorised on the server.

## Decision

- **Reads:** the board Server Component prefetches the list into a per-request `QueryClient`
  straight from the Data Access Layer and passes it down with `HydrationBoundary`. The client
  reads it with `useQuery(applicationsQuery)`. Refetches go to `GET /api/applications`
  (a Route Handler, so reads are cacheable and can run in parallel).
- **Writes:** Server Actions (`src/features/board/actions.ts`) called from `useMutation`.
  Actions validate with the same Zod schema as the form, re-check the session, and **return**
  `{ ok, data | error, fieldErrors }` instead of throwing, so the form keeps the input and shows
  errors on the right fields.
- **Cache after a write:** the returned card is written into the cache right away
  (`upsertCard` / `removeCard`, pure and unit-tested), then the list is invalidated to re-sync
  with the server order. Fully optimistic updates (before the server answers) arrive with drag &
  drop on Day 3, where the latency is visible.
- **Forms:** React Hook Form + `zodResolver` with one schema whose input is form-friendly
  (strings) and output is database-ready (numbers, arrays). The Server Action accepts both.
- **Sheet routing:** `/board/new` and `/board/app/[id]` are real URLs. From the board they open
  as a modal (`@modal` slot + intercepting routes); opened directly or refreshed they render as a
  full page. Both share the same content components; `useCloseSheet()` closes either way.
- **Kept-alive routes:** Next.js keeps recent routes alive (React Activity). An unsent "new"
  draft survives Escape on purpose; "Anuluj" and a successful submit clear it. The edit form is
  keyed by the card data so fresh server data always remounts it.

## Alternatives considered

- **Server Actions for reads too:** simpler wiring, but actions are POST, run one at a time and
  are not cacheable; React recommends them for mutations.
- **Only RSC + `router.refresh()` after writes:** no client cache, so no optimistic drag & drop
  and every change re-renders the whole board on the server.
- **tRPC / REST for everything:** extra layer and duplicated validation for a single-app backend.
- **Modal as client state (no URL):** no deep links, back button closes the page instead of
  the modal.

## Consequences

- Two read paths (server prefetch and Route Handler) share one query key
  (`src/features/board/query-keys.ts`) and one DAL; they must return the same shape.
- Not-found cards: the page streams, so the HTTP status is 200 and the not-found UI renders
  (with a `noindex` robots tag). The data of other users is never sent.
- Any new board mutation follows the same pattern: Zod schema -> action returning a result ->
  `useMutation` -> pure cache helper with a test.
