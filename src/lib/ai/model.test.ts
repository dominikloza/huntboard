// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { AiNotConfiguredError, getModel, googleThinking, modelLabel } = await import("./model");

describe("googleThinking", () => {
  it("turns thinking off with a budget on Gemini 2.x", () => {
    expect(googleThinking("gemini-2.5-flash")).toEqual({ thinkingBudget: 0 });
  });

  it("uses the minimal level on Gemini 3 and later", () => {
    expect(googleThinking("gemini-3.5-flash-lite")).toEqual({ thinkingLevel: "minimal" });
    expect(googleThinking("gemini-flash-latest")).toEqual({ thinkingLevel: "minimal" });
  });
});

describe("getModel", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the scripted demo model in mock mode (no key needed)", () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    expect(modelLabel(getModel())).toBe("huntboard-demo:demo");
  });

  it("picks Gemini with its default model", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "");
    expect(modelLabel(getModel())).toMatch(/:gemini-3\.5-flash-lite$/);
  });

  it("uses AI_MODEL when set", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "gpt-5.4-mini");
    expect(modelLabel(getModel())).toMatch(/:gpt-5\.4-mini$/);
  });

  it("says when the chosen provider has no key", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    expect(() => getModel()).toThrow(AiNotConfiguredError);
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => getModel()).toThrow(AiNotConfiguredError);
  });
});
