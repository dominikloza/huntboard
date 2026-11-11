import { buildGuestApplications, buildGuestHistory } from "@/features/board/lib/guest-workspace";

import { computeStats, type StatsCard, type StatsEvent, weekStart } from "./stats";

const now = new Date("2026-11-11T12:00:00Z"); // a Wednesday
const day = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

const card = (id: string, status: StatsCard["status"]): StatsCard => ({
  id,
  company: `Firma ${id}`,
  role: "Frontend Developer",
  status,
  createdAt: day(30),
});
const event = (applicationId: string, status: StatsEvent["status"], daysAgo: number) => ({
  applicationId,
  status,
  createdAt: day(daysAgo),
});

describe("computeStats", () => {
  it("builds the funnel from the furthest stage, so a rejection after an interview counts", () => {
    const stats = computeStats(
      [card("a", "rejected"), card("b", "applied"), card("c", "saved"), card("d", "offer")],
      [
        event("a", "applied", 20),
        event("a", "interview", 12),
        event("a", "rejected", 5),
        event("b", "applied", 3),
        event("d", "offer", 1), // no history before: the current stage implies the earlier ones
      ],
      now,
    );
    expect(stats.funnel).toEqual([
      { stage: "applied", reached: 3, rate: 3 / 4 },
      { stage: "interview", reached: 2, rate: 2 / 3 },
      { stage: "offer", reached: 1, rate: 1 / 2 },
    ]);
  });

  it("counts a rejected card without history as sent", () => {
    const stats = computeStats([card("a", "rejected")], [], now);
    expect(stats.funnel[0]?.reached).toBe(1);
    expect(stats.funnel[1]?.reached).toBe(0);
  });

  it("measures the answer time and lists sent applications with no answer for two weeks", () => {
    const stats = computeStats(
      [card("a", "interview"), card("b", "rejected"), card("c", "applied"), card("d", "applied")],
      [
        event("a", "applied", 20),
        event("a", "interview", 10), // 10 days
        event("b", "applied", 9),
        event("b", "rejected", 2), // 7 days
        event("c", "applied", 15), // waiting 15 days
        event("d", "applied", 5), // too early to worry
      ],
      now,
    );
    expect(stats.answer).toEqual({ medianDays: 8.5, count: 2 });
    expect(stats.waiting).toEqual([
      { id: "c", company: "Firma c", role: "Frontend Developer", days: 15 },
    ]);
  });

  it("does not count a rejection by silence as an answer", () => {
    const stats = computeStats(
      [card("a", "rejected")],
      [
        event("a", "applied", 40),
        { applicationId: "a", status: "rejected", createdAt: day(10), source: "timeout" as const },
      ],
      now,
    );
    expect(stats.answer).toEqual({ medianDays: null, count: 0 });
    expect(stats.funnel[0]?.reached).toBe(1);
  });

  it("counts applications sent per week, Monday to Sunday, for the last 8 weeks", () => {
    const stats = computeStats(
      [card("a", "applied"), card("b", "applied"), card("c", "applied")],
      [event("a", "applied", 0), event("b", "applied", 3), event("c", "applied", 100)],
      now,
    );
    expect(stats.weekly).toHaveLength(8);
    expect(stats.weekly.at(-1)).toEqual({ start: new Date("2026-11-09T00:00:00Z"), sent: 1 });
    expect(stats.weekly.at(-2)?.sent).toBe(1); // Sunday 8.11 belongs to the previous week
    expect(stats.weekly.reduce((sum, w) => sum + w.sent, 0)).toBe(2); // 100 days ago is out
  });

  it("handles an empty board", () => {
    const stats = computeStats([], [], now);
    expect(stats.total).toBe(0);
    expect(stats.funnel.every((s) => s.reached === 0 && s.rate === null)).toBe(true);
    expect(stats.answer.medianDays).toBeNull();
  });

  it("gives the guest account a believable search", () => {
    const rows: StatsCard[] = buildGuestApplications("g", now).map((row, i) => ({
      id: `card-${i}`,
      company: row.company,
      role: row.role,
      status: row.status ?? "saved",
      createdAt: row.createdAt ?? now,
    }));
    const stats = computeStats(rows, buildGuestHistory(rows, "g", now), now);
    expect(stats.funnel.map((s) => s.reached)).toEqual([5, 2, 0]);
    expect(stats.answer).toEqual({ medianDays: 8.5, count: 2 });
    expect(stats.waiting.map((w) => w.company)).toEqual(["Szlak Logistics"]);
  });
});

describe("weekStart", () => {
  it("returns the Monday of the week", () => {
    expect(weekStart(new Date("2026-11-15T23:00:00Z"))).toEqual(new Date("2026-11-09T00:00:00Z"));
    expect(weekStart(new Date("2026-11-09T00:30:00Z"))).toEqual(new Date("2026-11-09T00:00:00Z"));
  });
});
