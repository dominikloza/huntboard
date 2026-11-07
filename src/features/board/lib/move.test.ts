import {
  applyMove,
  columnDroppableId,
  findColumn,
  moveToColumn,
  placementOf,
  reorderInColumn,
  resolveMovePosition,
  restoreCard,
  sortBoard,
  toColumnItems,
} from "./move";
import { boardFixture } from "./test-fixtures";

const list = boardFixture();
const items = toColumnItems(list);
const first = list[0];
const kropla = list.find((c) => c.id === "kropla-mid");
if (!first || !kropla) throw new Error("fixture missing");

describe("sortBoard", () => {
  it("orders by column, then by byte order of position (uppercase before lowercase)", () => {
    const sorted = sortBoard([
      { ...first, id: "x", status: "applied", position: "a0" },
      { ...first, id: "y", status: "applied", position: "Zz" },
      { ...first, id: "z", status: "saved", position: "b0" },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["z", "y", "x"]);
  });
});

describe("column items", () => {
  it("finds the column of a card and of a column droppable", () => {
    expect(findColumn(items, "kropla-mid")).toBe("applied");
    expect(findColumn(items, columnDroppableId("offer"))).toBe("offer");
    expect(findColumn(items, "column:nope")).toBeUndefined();
  });

  it("moves a card into another column before the hovered card", () => {
    const next = moveToColumn(items, "kropla-mid", "brzeg-ai");
    expect(next?.interview).toEqual(["kropla-mid", "brzeg-ai"]);
    expect(next?.applied).not.toContain("kropla-mid");
  });

  it("moves a card to the end of an empty column", () => {
    expect(moveToColumn(items, "kropla-mid", columnDroppableId("offer"))?.offer).toEqual([
      "kropla-mid",
    ]);
  });

  it("ignores moves inside the same column", () => {
    expect(moveToColumn(items, "kropla-mid", "szlak-react")).toBeNull();
  });

  it("reorders inside a column", () => {
    const next = reorderInColumn(items, "kropla-mid", "tartak-fe");
    expect(next.applied).toEqual(["szlak-react", "tartak-fe", "kropla-mid"]);
  });

  it("describes where a card sits", () => {
    expect(placementOf(items, "szlak-react")).toEqual({
      status: "applied",
      prevId: "kropla-mid",
      nextId: "tartak-fe",
      index: 2,
      size: 3,
    });
  });
});

describe("resolveMovePosition", () => {
  it("creates a key strictly between the neighbours", () => {
    const result = resolveMovePosition({
      prevPosition: "a0",
      nextPosition: "a1",
      othersBetween: 0,
    });
    expect(result.ok && result.position > "a0" && result.position < "a1").toBe(true);
  });

  it("works at the top, the bottom and in an empty column", () => {
    for (const [prev, next] of [
      [null, "a0"],
      ["a0", null],
      [null, null],
    ] as const) {
      expect(
        resolveMovePosition({ prevPosition: prev, nextPosition: next, othersBetween: 0 }).ok,
      ).toBe(true);
    }
  });

  it("rejects a stale picture of the column", () => {
    expect(
      resolveMovePosition({ prevPosition: "a0", nextPosition: "a2", othersBetween: 1 }).ok,
    ).toBe(false);
    expect(
      resolveMovePosition({ prevPosition: "a2", nextPosition: "a0", othersBetween: 0 }).ok,
    ).toBe(false);
  });
});

describe("applyMove / restoreCard", () => {
  it("moves one card and keeps the board sorted", () => {
    const moved = applyMove(list, { id: "kropla-mid", status: "interview", position: "Zz" });
    expect(toColumnItems(moved).interview).toEqual(["kropla-mid", "brzeg-ai"]);
  });

  it("rolls back only the failed card", () => {
    const moved = applyMove(list, { id: "kropla-mid", status: "interview", position: "Zz" });
    const alsoEdited = moved.map((c) => (c.id === "wior-ui" ? { ...c, role: "Edited" } : c));
    const restored = restoreCard(alsoEdited, kropla);
    expect(toColumnItems(restored).applied[0]).toBe("kropla-mid");
    expect(restored.find((c) => c.id === "wior-ui")?.role).toBe("Edited");
  });
});
