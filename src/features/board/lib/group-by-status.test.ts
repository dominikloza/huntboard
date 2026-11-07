import { groupByStatus } from "./group-by-status";

describe("groupByStatus", () => {
  it("returns every column, even empty ones", () => {
    const columns = groupByStatus([]);
    expect(Object.keys(columns)).toEqual(["saved", "applied", "interview", "offer", "rejected"]);
    expect(Object.values(columns).every((c) => c.length === 0)).toBe(true);
  });

  it("keeps the order of cards inside a column", () => {
    const columns = groupByStatus([
      { status: "applied" as const, id: "b" },
      { status: "saved" as const, id: "a" },
      { status: "applied" as const, id: "c" },
    ]);
    expect(columns.applied.map((c) => c.id)).toEqual(["b", "c"]);
    expect(columns.saved.map((c) => c.id)).toEqual(["a"]);
  });
});
