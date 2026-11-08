import "server-only";

import { type LanguageModel, Output, streamText } from "ai";

import {
  matchInstructions,
  matchPrompt,
  type MatchPromptInput,
} from "@/lib/ai/prompts/match-comment";

import { matchCommentSchema, type MatchTone } from "../schemas";

const ignoreError = () => {};

/** The one way to ask a model for a match comment (coach or roast). */
export function streamMatchComment({
  model,
  tone,
  input,
  abortSignal,
  onError = ignoreError,
}: {
  model: LanguageModel;
  tone: MatchTone;
  input: MatchPromptInput;
  abortSignal?: AbortSignal;
  /** Errors also reach the caller through the stream and its promises; by default not logged twice. */
  onError?: (error: unknown) => void;
}) {
  return streamText({
    model,
    output: Output.object({ schema: matchCommentSchema }),
    instructions: matchInstructions(tone),
    prompt: matchPrompt(input),
    maxOutputTokens: 900,
    maxRetries: 1,
    // A roast may be a little more playful; the coach stays steady.
    temperature: tone === "roast" ? 0.9 : 0.4,
    abortSignal,
    onError: ({ error }) => onError(error),
  });
}
