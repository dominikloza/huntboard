import { removeCard, upsertCard } from "./cache";
import { groupByStatus } from "./group-by-status";
import { boardFixture } from "./test-fixtures";

const list = boardFixture();
const kropla = list.find((a) => a.id === "kropla-mid");
if (!kropla) throw new Error("fixture missing");

describe("upsertCard", () => {
  it("keeps the order when a card is edited in place", () => {
    const next = upsertCard(list, { ...kropla, role: "Senior Frontend Developer" });
    expect(next.map((a) => a.id)).toEqual(list.map((a) => a.id));
    expect(next.find((a) => a.id === "kropla-mid")?.role).toBe("Senior Frontend Developer");
  });

  it("places a card by its server position", () => {
    const next = upsertCard(list, { ...kropla, status: "interview", position: "Zz" });
    expect(groupByStatus(next).interview[0]?.id).toBe("kropla-mid");
    expect(groupByStatus(next).applied.map((a) => a.id)).not.toContain("kropla-mid");
  });

  it("adds a new card", () => {
    const next = upsertCard(list, { ...kropla, id: "new-one", status: "saved", position: "Zz" });
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
