import { generateNKeysBetween } from "fractional-indexing";

import { APPLICATION_STATUSES } from "../constants";
import { type Application } from "../types";

import { DEMO_APPLICATIONS } from "./demo-data";

/** Demo cards with real ids-in-order and position keys, as the server would return them. */
export function boardFixture(): Application[] {
  return APPLICATION_STATUSES.flatMap((status) => {
    const cards = DEMO_APPLICATIONS.filter((a) => a.status === status);
    const keys = generateNKeysBetween(null, null, cards.length);
    return cards.map(({ stamp: _stamp, ...card }, i) => ({
      ...card,
      position: keys[i] ?? "a0",
      version: 1,
      offerUrl: null,
    }));
  });
}
