import { generateKeyBetween } from "fractional-indexing";

/**
 * Position key that sorts before every existing card in a column.
 * New and moved cards go to the top, where the user is looking.
 */
export function positionAtTop(firstPositionInColumn: string | null | undefined): string {
  return generateKeyBetween(null, firstPositionInColumn ?? null);
}
