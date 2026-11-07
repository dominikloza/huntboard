import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { defaultSettingsMiddleware, type LanguageModel, wrapLanguageModel } from "ai";

import { createDemoModel } from "./demo-model";

/** Thrown when the server has no AI provider configured (e.g. a fork without OPENAI_API_KEY). */
export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI provider is not configured");
    this.name = "AiNotConfiguredError";
  }
}

/** Cheap, fast, good at structured output. Override with AI_MODEL. */
const DEFAULT_MODEL = {
  openai: "gpt-4.1-mini",
  // 2.5 models are served only to accounts that used them before; new keys get 404.
  google: "gemini-3.5-flash-lite",
} as const;

/**
 * The only place that knows which provider runs the AI features.
 * - `AI_PROVIDER=openai` (default): needs OPENAI_API_KEY.
 * - `AI_PROVIDER=google`: Gemini, needs GOOGLE_GENERATIVE_AI_API_KEY (Google AI Studio).
 * - `AI_PROVIDER=mock`: a scripted model for e2e tests and local work without a key.
 */
export function googleThinking(modelId: string) {
  return /^gemini-2\./.test(modelId)
    ? { thinkingBudget: 0 }
    : { thinkingLevel: "minimal" as const };
}

export function getModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER ?? "openai";
  const modelId = process.env.AI_MODEL || undefined;

  if (provider === "mock") return createDemoModel();

  if (provider === "google") {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new AiNotConfiguredError();
    const id = modelId ?? DEFAULT_MODEL.google;
    return wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey })(id),
      // Extraction needs little reasoning: keep "thinking" minimal so the first field shows up
      // at once. Gemini 2.x takes a token budget, Gemini 3+ a level.
      middleware: defaultSettingsMiddleware({
        settings: { providerOptions: { google: { thinkingConfig: googleThinking(id) } } },
      }),
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();
  return createOpenAI({ apiKey })(modelId ?? DEFAULT_MODEL.openai);
}
