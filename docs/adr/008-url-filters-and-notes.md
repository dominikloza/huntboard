# 008: Filters in the URL, notes with useOptimistic

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Day 4 adds search and filters on the board (text, work mode, minimum salary) and notes inside the
application sheet. Filters should survive a reload and be shareable as a link. Notes live inside an
intercepted modal route (`@modal/(.)app/[id]`), which must stay a modal after a write.

## Decision

**Filters.** The filter state lives in the URL, read and written with nuqs (`useQueryStates` with
shared parsers in `src/features/board/filters.ts`). The search box updates the URL with a 300 ms
debounce. Filtering is done on the client over the TanStack Query cache by a pure, tested
`filterApplications` (diacritic-insensitive, every word must match). The board already holds every
card of the user, so no extra request is needed.

**Dragging while filtered.** A filtered column hides cards, so a drop between two visible cards
does not say where the card lands in the full column. `neighboursInFullColumn` maps the visible
neighbour to the real neighbours in the full column before the move is saved, so hidden cards keep
their order.

**Notes.** Server Actions (`addNote`, `deleteNote`) return a result, like board writes. The client
shows the new note at once with React 19 `useOptimistic` over a local list of confirmed notes,
seeded from the server. We do not call `refresh()` after a note write: in this Next.js version it
re-renders the current URL as a full page, which turns the intercepted modal into the standalone
sheet page.

## Alternatives considered

- **Zustand / Context for filters:** state lost on reload, not shareable, one more store.
- **Server-side filtering (query params into SQL):** a round trip on every keystroke for a few
  dozen cards; worth it only with pagination.
- **Notes through TanStack Query:** notes are only read in the sheet, which is already a Server
  Component; a second cache for them adds code without a benefit.
- **`refresh()` / `revalidatePath` after a note write:** breaks the modal (see above).

## Consequences

- Links like `/board?mode=office&min=15000` open the same view for anyone with an account.
- Filtering is O(n) per render; fine for hundreds of cards, revisit with pagination.
- Notes added in the modal are not in the server render until the next navigation; the local list
  covers that. If notes ever show up elsewhere (e.g. a count on the card), move them into the query
  cache.
