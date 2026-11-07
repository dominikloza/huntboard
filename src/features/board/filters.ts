import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

import { WORK_MODES, type WorkMode } from "./constants";
import { type Application } from "./types";

/**
 * Board filters live in the URL (ADR 008), so a filtered board can be bookmarked, shared and
 * survives a refresh: /board?q=react&mode=remote,hybrid&min=15000
 */
export const boardFilterParsers = {
  q: parseAsString.withDefault(""),
  mode: parseAsArrayOf(parseAsStringLiteral(WORK_MODES)).withDefault([]),
  min: parseAsInteger,
};

export type BoardFilters = {
  q: string;
  mode: WorkMode[];
  min: number | null;
};

export function isFiltering({ q, mode, min }: BoardFilters) {
  return q.trim() !== "" || mode.length > 0 || min != null;
}

/** Lowercase and strip Polish diacritics, so "lodz" finds "Łódź" and "wisla" finds "Wisła". */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Pure client-side filter (the whole board is already in the cache).
 * - q: every word must appear in company, role, city, seniority or stack
 * - mode: any of the selected work modes
 * - min: the top of the salary range reaches the minimum; cards without salary are hidden
 */
export function filterApplications<T extends Application>(
  list: readonly T[],
  filters: BoardFilters,
): T[] {
  const words = normalize(filters.q).split(/\s+/).filter(Boolean);
  const modes = new Set(filters.mode);

  return list.filter((card) => {
    if (modes.size > 0 && !modes.has(card.workMode)) return false;
    if (filters.min != null) {
      const top = card.salaryMax ?? card.salaryMin;
      if (top == null || top < filters.min) return false;
    }
    if (words.length > 0) {
      const haystack = normalize(
        [card.company, card.role, card.city ?? "", card.seniority ?? "", ...card.stack].join(" "),
      );
      if (!words.every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}

/**
 * A drop while a filter hides some cards: the card goes right after the visible card above it.
 * Its real neighbours come from the full column, so the server sees two adjacent cards.
 */
export function neighboursInFullColumn(
  fullColumn: readonly string[],
  movingId: string,
  visiblePrevId: string | null,
): { prevId: string | null; nextId: string | null } {
  const others = fullColumn.filter((id) => id !== movingId);
  if (visiblePrevId == null) return { prevId: null, nextId: others[0] ?? null };
  const index = others.indexOf(visiblePrevId);
  if (index === -1) return { prevId: null, nextId: others[0] ?? null };
  return { prevId: visiblePrevId, nextId: others[index + 1] ?? null };
}
