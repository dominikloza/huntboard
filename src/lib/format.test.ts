import { formatDateTime, formatSalaryRange, getMatchTier } from "./format";

describe("formatSalaryRange", () => {
  it("formats a full range with Polish thousands separators", () => {
    expect(formatSalaryRange(17000, 22000)).toBe("17 000-22 000 zł");
  });

  it("formats a compact range for cards", () => {
    expect(formatSalaryRange(17000, 22000, { compact: true })).toBe("17-22k");
  });

  it("swaps min and max when the AI returns them reversed", () => {
    expect(formatSalaryRange(22000, 17000, { compact: true })).toBe("17-22k");
  });

  it("handles open-ended ranges", () => {
    expect(formatSalaryRange(15000, null)).toBe("od 15 000 zł");
    expect(formatSalaryRange(null, 20000, { compact: true })).toBe("do 20k");
  });

  it("says so when there is no salary at all", () => {
    expect(formatSalaryRange(null, null)).toBe("Brak widełek");
  });

  it("never uses an en-dash or em-dash", () => {
    expect(formatSalaryRange(1, 2)).not.toMatch(/[–—]/);
  });
});

describe("getMatchTier", () => {
  it.each([
    [100, "strong"],
    [80, "strong"],
    [79, "medium"],
    [50, "medium"],
    [49, "weak"],
    [0, "weak"],
    [Number.NaN, "weak"],
  ] as const)("score %s is %s", (score, tier) => {
    expect(getMatchTier(score)).toBe(tier);
  });
});

describe("formatDateTime", () => {
  it("formats in Polish time, whatever the machine's time zone", () => {
    // 13:05 UTC in November = 14:05 in Warsaw (CET)
    expect(formatDateTime("2026-11-07T13:05:00.000Z")).toBe("7 lis 2026, 14:05");
    // 12:05 UTC in July = 14:05 in Warsaw (CEST)
    expect(formatDateTime("2026-07-07T12:05:00.000Z")).toBe("7 lip 2026, 14:05");
  });
});
