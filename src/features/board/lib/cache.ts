import { type Application } from "../types";

import { sortBoard } from "./move";

/** Puts a created or updated card (as returned by the server) into the cached board list. */
export function upsertCard(list: readonly Application[] | undefined, card: Application) {
  return sortBoard([...(list ?? []).filter((a) => a.id !== card.id), card]);
}

export function removeCard(list: readonly Application[] | undefined, id: string) {
  return (list ?? []).filter((a) => a.id !== id);
}
