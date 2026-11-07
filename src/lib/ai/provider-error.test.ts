// @vitest-environment node
import { APICallError } from "ai";
import { describe, expect, it } from "vitest";

import { classifyProviderError, providerErrorMessage } from "./provider-error";

const apiError = (statusCode: number, responseBody = "") =>
  new APICallError({
    message: "provider error",
    url: "https://api.openai.com/v1/responses",
    requestBodyValues: {},
    statusCode,
    responseBody,
  });

describe("classifyProviderError", () => {
  it.each([
    [401, "", "auth"],
    [404, "", "model"],
    [429, '{"error":{"code":"insufficient_quota"}}', "quota"],
    [429, '{"error":{"code":"rate_limit_exceeded"}}', "rate-limit"],
    [400, "", "rejected"],
    [
      400,
      '{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}',
      "auth",
    ],
    [500, "", "unavailable"],
  ] as const)("status %i -> %s", (status, body, expected) => {
    expect(classifyProviderError(apiError(status, body))).toBe(expected);
  });

  it("looks through a wrapping error (retries)", () => {
    expect(classifyProviderError(new Error("retry failed", { cause: apiError(401) }))).toBe("auth");
  });

  it("treats anything else as unavailable", () => {
    expect(classifyProviderError(new Error("socket hang up"))).toBe("unavailable");
  });
});

describe("providerErrorMessage", () => {
  it("names the fix in development only", () => {
    expect(providerErrorMessage("quota", true)).toMatch(/Billing/);
    expect(providerErrorMessage("quota", false)).not.toMatch(/Billing|OpenAI/);
    expect(providerErrorMessage("auth", false)).not.toMatch(/API_KEY/);
  });
});
