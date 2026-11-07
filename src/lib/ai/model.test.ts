// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { googleThinking } = await import("./model");

describe("googleThinking", () => {
  it("turns thinking off with a budget on Gemini 2.x", () => {
    expect(googleThinking("gemini-2.5-flash")).toEqual({ thinkingBudget: 0 });
  });

  it("uses the minimal level on Gemini 3 and later", () => {
    expect(googleThinking("gemini-3.5-flash-lite")).toEqual({ thinkingLevel: "minimal" });
    expect(googleThinking("gemini-flash-latest")).toEqual({ thinkingLevel: "minimal" });
  });
});
