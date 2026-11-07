# 007: Drag & drop: dnd-kit, fractional positions, optimistic moves with version checks

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Moving a card between folders is the main interaction on the board. It must feel instant,
work with mouse, touch and keyboard, be understandable with a screen reader, and stay correct
when the same board is open in two windows or the save fails.

## Decision

**Library:** `@dnd-kit/core` + `@dnd-kit/sortable` (stable 6.x/10.x). Mouse (6 px activation
distance, so a click still opens the card), touch (220 ms long press, so a swipe still scrolls
the board) and keyboard sensors.

**Keyboard and screen readers:**

- Each card has a drag handle (`DragHandle`): Space/Enter lifts, Up/Down move inside the folder,
  Left/Right jump to the neighbouring folder (custom coordinate getter, which also scrolls the
  folder into view on narrow screens), Space/Enter drops, Escape cancels.
- Polish screen reader instructions and announcements ("Przeniesiono kartę X: kolumna Rozmowa,
  pozycja 2 z 2"), only spoken when the target place actually changes.
- Mouse/touch listeners sit on the whole card; the keyboard listener only on the handle, so Tab
  still reaches the card's link. The edit sheet's "Etap" field is a non-drag alternative.

**Order:** fractional indexing. A move stores one new key between the two neighbours; no other
row is rewritten. Keys compare byte by byte (`COLLATE "C"`, ADR 005). Pure logic lives in
`src/features/board/lib/move.ts` and is shared by client and server.

**Optimistic update (`useMoveCard`):**

1. On drop the cache is updated synchronously (no frame with the old order).
2. The Server Action runs. Moves share a mutation scope, so they reach the server in order.
3. Success: the server's card (position, version) replaces the optimistic one.
4. Failure: only the moved card is restored (`restoreCard`), other changes stay; an alert
   explains what happened; the board re-syncs once the move queue is empty.

**Concurrency:** every card has a `version` (bumped on each change). A move sends the version it
saw and its new neighbours. The server locks the card (`SELECT ... FOR UPDATE`) and rejects the
move as a conflict if the version changed, a neighbour is not in that folder any more, or another
card now sits between the neighbours. The client predicts the version bump so two quick moves
of the same card are both valid.

## Alternatives considered

- **`@dnd-kit/react` 0.x:** the next major API, but pre-1.0.
- **Native HTML drag and drop:** no touch support, no keyboard model, poor screen reader story.
- **Integer positions:** a move rewrites every card below it; more writes, more conflicts.
- **Last write wins (no version):** two windows silently overwrite each other's moves.

## Consequences

- Fractional keys grow when cards are inserted repeatedly at the same spot. Not a problem at this
  scale; a periodic "rebalance" can rewrite a column's keys if it ever is.
- The KeyboardSensor starts listening for arrows one tick after lifting; e2e tests wait 50 ms.
- Real-time collaboration (several people on one board) would need server push (SSE/WebSocket)
  instead of conflict-and-refetch.
