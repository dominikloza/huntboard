import { DEMO_APPLICATIONS } from "./demo-data";
import { removeCard, upsertCard } from "./cache";
import { groupByStatus } from "./group-by-status";

const list = DEMO_APPLICATIONS;
const kropla = list.find((a) => a.id === "kropla-mid");
if (!kropla) throw new Error("fixture missing");

describe("upsertCard", () => {
  it("keeps the position when the column does not change", () => {
    const next = upsertCard(list, { ...kropla, role: "Senior Frontend Developer" });
    expect(next.map((a) => a.id)).toEqual(list.map((a) => a.id));
    expect(next.find((a) => a.id === "kropla-mid")?.role).toBe("Senior Frontend Developer");
  });

  it("moves a card to the top of its new column", () => {
    const next = upsertCard(list, { ...kropla, status: "interview" });
    expect(groupByStatus(next).interview[0]?.id).toBe("kropla-mid");
    expect(groupByStatus(next).applied.map((a) => a.id)).not.toContain("kropla-mid");
  });

  it("adds a new card on top of its column", () => {
    const next = upsertCard(list, { ...kropla, id: "new-one", status: "saved" });
    expect(groupByStatus(next).saved[0]?.id).toBe("new-one");
    expect(next).toHaveLength(list.length + 1);
  });

  it("works with an empty cache", () => {
    expect(upsertCard(undefined, kropla)).toEqual([kropla]);
  });
});

describe("removeCard", () => {
  it("removes by id and ignores unknown ids", () => {
    expect(removeCard(list, "kropla-mid")).toHaveLength(list.length - 1);
    expect(removeCard(list, "nope")).toHaveLength(list.length);
  });
});
