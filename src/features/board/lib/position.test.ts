import { generateNKeysBetween } from "fractional-indexing";

import { positionAtTop } from "./position";

describe("positionAtTop", () => {
  it("works for an empty column", () => {
    expect(positionAtTop(null)).toEqual(expect.any(String));
  });

  it("sorts before the current first card, again and again", () => {
    const [first] = generateNKeysBetween(null, null, 1);
    let top = first ?? null;
    for (let i = 0; i < 50; i++) {
      const next = positionAtTop(top);
      expect(next < (top as string)).toBe(true);
      top = next;
    }
  });
});
