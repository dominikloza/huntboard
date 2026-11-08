import { GUEST_RETENTION_DAYS, isAuthorizedCron, staleGuestCutoff } from "./cron";

describe("isAuthorizedCron", () => {
  it("accepts the bearer token Vercel Cron sends", () => {
    expect(isAuthorizedCron("Bearer s3cret-value", "s3cret-value")).toBe(true);
  });

  it("rejects a wrong, missing or bare token", () => {
    expect(isAuthorizedCron("Bearer nope", "s3cret-value")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret-value")).toBe(false);
    expect(isAuthorizedCron("s3cret-value", "s3cret-value")).toBe(false);
  });

  it("authorizes nothing when the secret is not configured", () => {
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
  });
});

describe("staleGuestCutoff", () => {
  it("goes back the retention period", () => {
    const now = new Date("2026-11-08T03:00:00Z");
    expect(staleGuestCutoff(now).toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(GUEST_RETENTION_DAYS).toBe(7);
    expect(staleGuestCutoff(now, 1).toISOString()).toBe("2026-11-07T03:00:00.000Z");
  });
});
