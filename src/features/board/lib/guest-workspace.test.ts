import { DEMO_APPLICATIONS } from "./demo-data";
import { buildGuestApplications, buildGuestHistory, GUEST_HISTORY } from "./guest-workspace";

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

describe("buildGuestHistory", () => {
  const now = new Date("2026-11-11T12:00:00Z");

  it("ends every demo card's history in its current stage", () => {
    for (const card of DEMO_APPLICATIONS) {
      const history = GUEST_HISTORY[card.company];
      expect(history, card.company).toBeDefined();
      expect(history?.at(-1)?.status).toBe(card.status);
    }
  });

  it("dates the events back from now, oldest first, for the inserted ids", () => {
    const events = buildGuestHistory([{ id: "card-1", company: "Brzeg Labs" }], "guest-1", now);
    expect(events.map((e) => e.status)).toEqual(["saved", "applied", "interview"]);
    expect(events.every((e) => e.applicationId === "card-1" && e.userId === "guest-1")).toBe(true);
    const times = events.map((e) => e.createdAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(events[0]?.createdAt.toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });

  it("backdates the cards to the start of their history", () => {
    const brzeg = buildGuestApplications("guest-1", now).find((r) => r.company === "Brzeg Labs");
    expect(brzeg?.createdAt).toEqual(new Date("2026-10-12T12:00:00Z"));
  });
});
