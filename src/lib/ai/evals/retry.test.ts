// @vitest-environment node
import { APICallError, RetryError } from "ai";

import { createPacer, retryAfterMs } from "./retry";

const apiError = (statusCode: number, responseBody: string) =>
  new APICallError({
    message: "provider",
    url: "u",
    requestBodyValues: {},
    statusCode,
    responseBody,
  });

describe("retryAfterMs", () => {
  it("waits as long as the provider asks, plus a second", () => {
    const quota = apiError(429, '{"error":{"message":"Quota exceeded. Please retry in 39.7s."}}');
    expect(retryAfterMs(quota)).toBe(40_700);
  });

  it("finds the provider error inside the SDK's retry wrapper", () => {
    const wrapped = new RetryError({
      message: "Failed after 2 attempts",
      reason: "maxRetriesExceeded",
      errors: [apiError(503, '{"error":{"status":"UNAVAILABLE","message":"high demand"}}')],
    });
    expect(retryAfterMs(wrapped)).toBe(20_000);
  });

  it("does not retry real failures", () => {
    expect(retryAfterMs(apiError(400, "bad request"))).toBeNull();
    expect(
      retryAfterMs(new Error("No object generated: could not parse the response.")),
    ).toBeNull();
  });
});

describe("createPacer", () => {
  it("starts calls at least the interval apart, also in parallel", async () => {
    vi.useFakeTimers();
    const pace = createPacer(5000);
    const started: number[] = [];
    const t0 = Date.now();
    const calls = [1, 2, 3].map(async () => {
      await pace();
      started.push(Date.now() - t0);
    });
    await vi.advanceTimersByTimeAsync(10_000);
    await Promise.all(calls);
    expect(started).toEqual([0, 5000, 10_000]);
    vi.useRealTimers();
  });
});
