import { describe, expect, it } from "vitest";

import { aiLimits, checkQuota, HOUR_MS, quotaMessage } from "./limits";

const now = new Date("2026-11-08T12:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const limits = { guestPerHour: 3, memberPerHour: 5, dailyBudget: 100 };
const noOne = { count: 0, oldest: null };

describe("aiLimits", () => {
  it("uses defaults and ignores invalid overrides", () => {
    expect(aiLimits({})).toEqual({ guestPerHour: 10, memberPerHour: 30, dailyBudget: 300 });
    expect(aiLimits({ AI_LIMIT_GUEST_PER_HOUR: "2", AI_DAILY_BUDGET: "-1" })).toMatchObject({
      guestPerHour: 2,
      dailyBudget: 300,
    });
  });
});

describe("checkQuota", () => {
  it("lets a call through below the limit", () => {
    const decision = checkQuota({
      userCalls: [minutesAgo(30), minutesAgo(10)],
      allCalls: noOne,
      isGuest: true,
      limits,
      now,
    });
    expect(decision).toEqual({ ok: true });
  });

  it("blocks a guest at the limit until the oldest call leaves the hour", () => {
    const decision = checkQuota({
      userCalls: [minutesAgo(40), minutesAgo(20), minutesAgo(5)],
      allCalls: noOne,
      isGuest: true,
      limits,
      now,
    });
    expect(decision).toEqual({ ok: false, reason: "user", limit: 3, retryAfterSeconds: 20 * 60 });
  });

  it("gives signed-in users a higher limit", () => {
    const calls = [minutesAgo(40), minutesAgo(20), minutesAgo(5)];
    expect(checkQuota({ userCalls: calls, allCalls: noOne, isGuest: false, limits, now })).toEqual({
      ok: true,
    });
  });

  it("enforces the daily budget for everyone", () => {
    const decision = checkQuota({
      userCalls: [],
      allCalls: { count: 100, oldest: new Date(now.getTime() - 23 * HOUR_MS) },
      isGuest: false,
      limits,
      now,
    });
    expect(decision).toEqual({ ok: false, reason: "budget", limit: 100, retryAfterSeconds: 3600 });
  });
});

describe("quotaMessage", () => {
  it("tells a guest how long to wait and how to get more", () => {
    const message = quotaMessage(
      { ok: false, reason: "user", limit: 10, retryAfterSeconds: 61 },
      "extract",
      true,
    );
    expect(message).toBe(
      "Limit: 10 wypełnień z AI na godzinę na koncie gościa (zaloguj się przez GitHub, żeby mieć więcej). Następne za 2 min. Możesz też wpisać dane ręcznie.",
    );
  });

  it("uses hours for long waits", () => {
    const message = quotaMessage(
      { ok: false, reason: "budget", limit: 300, retryAfterSeconds: 5 * 3600 },
      "extract",
      false,
    );
    expect(message).toContain("za 5 godz.");
  });

  it("offers the manual form only where there is one", () => {
    const blocked = { ok: false, reason: "user", limit: 30, retryAfterSeconds: 600 } as const;
    expect(quotaMessage(blocked, "questions", false)).toBe(
      "Limit: 30 zestawów pytań na godzinę. Następne za 10 min.",
    );
    const budget = { ...blocked, reason: "budget" } as const;
    expect(quotaMessage(budget, "roast", false)).not.toContain("ręcznie");
    expect(quotaMessage(budget, "extract", false)).toContain("ręcznie");
  });
});
