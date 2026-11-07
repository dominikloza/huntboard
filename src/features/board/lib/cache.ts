import { type Application } from "../types";

/**
 * Puts a created or updated card into the cached board list.
 * - same column as before: replaced in place (keeps its position)
 * - new card or new column: first in the list, so it shows on top of its column
 *   (the list is grouped by status in render, and the server also puts it on top)
 */
export function upsertCard(list: readonly Application[] | undefined, card: Application) {
  const current = list ?? [];
  const index = current.findIndex((a) => a.id === card.id);
  const previous = index === -1 ? undefined : current[index];

  if (previous && previous.status === card.status) {
    return current.map((a) => (a.id === card.id ? card : a));
  }
  return [card, ...current.filter((a) => a.id !== card.id)];
}

export function removeCard(list: readonly Application[] | undefined, id: string) {
  return (list ?? []).filter((a) => a.id !== id);
}
