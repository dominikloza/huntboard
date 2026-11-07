import { generateKeyBetween } from "fractional-indexing";

import { APPLICATION_STATUSES, type ApplicationStatus } from "../constants";
import { type Application } from "../types";

/*
 * Pure board-ordering logic shared by the drag & drop UI (optimistic update) and the server
 * (validation). No React, no database: everything here is unit-tested.
 */

const STATUS_ORDER = new Map(APPLICATION_STATUSES.map((s, i) => [s, i]));

/** Byte-order comparison, same as the database column (COLLATE "C", ADR 005). */
export function compareKeys(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The board list order: by column, then by position inside the column. */
export function sortBoard(list: readonly Application[]): Application[] {
  return [...list].sort(
    (a, b) =>
      (STATUS_ORDER.get(a.status) ?? 0) - (STATUS_ORDER.get(b.status) ?? 0) ||
      compareKeys(a.position, b.position),
  );
}

// ---------------------------------------------------------------- column ids (drag state)

export type ColumnItems = Record<ApplicationStatus, string[]>;

const COLUMN_PREFIX = "column:";
export const columnDroppableId = (status: ApplicationStatus) => `${COLUMN_PREFIX}${status}`;

function parseColumnId(id: string): ApplicationStatus | undefined {
  if (!id.startsWith(COLUMN_PREFIX)) return undefined;
  const status = id.slice(COLUMN_PREFIX.length);
  return (APPLICATION_STATUSES as readonly string[]).includes(status)
    ? (status as ApplicationStatus)
    : undefined;
}

export function toColumnItems(list: readonly Application[]): ColumnItems {
  const items = Object.fromEntries(
    APPLICATION_STATUSES.map((s) => [s, [] as string[]]),
  ) as ColumnItems;
  for (const card of sortBoard(list)) items[card.status].push(card.id);
  return items;
}

/** Which column an id belongs to: a card id or a column's own droppable id. */
export function findColumn(items: ColumnItems, id: string): ApplicationStatus | undefined {
  return parseColumnId(id) ?? APPLICATION_STATUSES.find((status) => items[status].includes(id));
}

/**
 * Drag over another column: move the active card there, before the card it is over
 * (or to the end when it is over the empty part of the column). Returns null when nothing changes.
 */
export function moveToColumn(
  items: ColumnItems,
  activeId: string,
  overId: string,
): ColumnItems | null {
  const from = findColumn(items, activeId);
  const to = findColumn(items, overId);
  if (!from || !to || from === to) return null;

  const target = items[to];
  const overIndex = target.indexOf(overId);
  const insertAt = overIndex === -1 ? target.length : overIndex;
  return {
    ...items,
    [from]: items[from].filter((id) => id !== activeId),
    [to]: [...target.slice(0, insertAt), activeId, ...target.slice(insertAt)],
  };
}

/** Drop inside one column: move the active card to the slot of the card it is over. */
export function reorderInColumn(items: ColumnItems, activeId: string, overId: string): ColumnItems {
  const column = findColumn(items, activeId);
  if (!column || findColumn(items, overId) !== column) return items;
  const list = items[column];
  const from = list.indexOf(activeId);
  const to = list.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return items;
  const next = [...list];
  next.splice(from, 1);
  next.splice(to, 0, activeId);
  return { ...items, [column]: next };
}

export type Placement = {
  status: ApplicationStatus;
  prevId: string | null;
  nextId: string | null;
  /** 1-based, for announcements */
  index: number;
  size: number;
};

/** Where a card sits now: column, neighbours and its place in the column. */
export function placementOf(items: ColumnItems, id: string): Placement | undefined {
  const status = findColumn(items, id);
  if (!status) return undefined;
  const list = items[status];
  const i = list.indexOf(id);
  return {
    status,
    prevId: list[i - 1] ?? null,
    nextId: list[i + 1] ?? null,
    index: i + 1,
    size: list.length,
  };
}

// ---------------------------------------------------------------- positions

/**
 * New position key for a card placed between two neighbours (either may be missing).
 * `othersBetween` = how many other cards of that column currently sit between them:
 * anything but 0 means the client's picture of the column is out of date.
 */
export function resolveMovePosition({
  prevPosition,
  nextPosition,
  othersBetween,
}: {
  prevPosition: string | null;
  nextPosition: string | null;
  othersBetween: number;
}): { ok: true; position: string } | { ok: false } {
  if (othersBetween > 0) return { ok: false };
  if (
    prevPosition != null &&
    nextPosition != null &&
    compareKeys(prevPosition, nextPosition) >= 0
  ) {
    return { ok: false };
  }
  return { ok: true, position: generateKeyBetween(prevPosition, nextPosition) };
}

/** Optimistic move in the cached list: new column, new position, list re-sorted. */
export function applyMove(
  list: readonly Application[],
  move: { id: string; status: ApplicationStatus; position: string },
): Application[] {
  return sortBoard(
    list.map((card) =>
      card.id === move.id ? { ...card, status: move.status, position: move.position } : card,
    ),
  );
}

/** Rollback for one card only: other cards keep any changes made in the meantime. */
export function restoreCard(list: readonly Application[], original: Application): Application[] {
  return sortBoard(list.map((card) => (card.id === original.id ? original : card)));
}
