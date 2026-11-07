import { buildGuestApplications } from "./guest-workspace";

describe("buildGuestApplications", () => {
  const rows = buildGuestApplications("guest-1");

  it("assigns every demo card to the guest", () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.userId === "guest-1")).toBe(true);
  });

  it("does not leak demo-only fields into database rows", () => {
    for (const row of rows) {
      expect(row).not.toHaveProperty("stamp");
      expect(row).not.toHaveProperty("id");
    }
  });

  it("gives cards in each column strictly increasing positions", () => {
    const byStatus = Map.groupBy(rows, (r) => r.status);
    for (const columnRows of byStatus.values()) {
      const positions = columnRows.map((r) => r.position);
      expect([...positions].sort()).toEqual(positions);
      expect(new Set(positions).size).toBe(positions.length);
    }
  });
});
