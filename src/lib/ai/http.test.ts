import { settleWithin, textError } from "./http";

describe("textError", () => {
  it("answers in plain text, never cached", async () => {
    const response = textError("Limit.", 429, { "Retry-After": "60" });
    expect(response.status).toBe(429);
    expect(await response.text()).toBe("Limit.");
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});

describe("settleWithin", () => {
  it("returns the value when it comes in time", async () => {
    await expect(settleWithin(Promise.resolve(7), 1000)).resolves.toBe(7);
  });

  it("turns a failure into undefined", async () => {
    await expect(settleWithin(Promise.reject(new Error("aborted")), 1000)).resolves.toBeUndefined();
  });

  it("gives up on a promise that never settles", async () => {
    vi.useFakeTimers();
    const result = settleWithin(new Promise<number>(() => {}), 30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(result).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
