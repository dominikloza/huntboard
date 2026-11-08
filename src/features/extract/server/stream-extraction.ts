import "server-only";

import { type LanguageModel, Output, streamText } from "ai";

import { EXTRACT_OFFER_INSTRUCTIONS, offerPrompt } from "@/lib/ai/prompts/extract-offer";

import { offerExtractionSchema } from "../schemas";

const ignoreError = () => {};

/**
 * The one way to ask a model for an OfferExtraction. The Route Handler streams it to the
 * browser; `pnpm eval` awaits the final object. Same prompt, schema and settings in both, so
 * the eval measures what users get.
 */
export function streamOfferExtraction({
  model,
  offer,
  abortSignal,
  onError = ignoreError,
}: {
  model: LanguageModel;
  offer: string;
  abortSignal?: AbortSignal;
  /** Errors also reach the caller through the stream and its promises; by default not logged twice. */
  onError?: (error: unknown) => void;
}) {
  return streamText({
    model,
    output: Output.object({ schema: offerExtractionSchema }),
    instructions: EXTRACT_OFFER_INSTRUCTIONS,
    prompt: offerPrompt(offer),
    maxOutputTokens: 1200,
    maxRetries: 1,
    abortSignal,
    onError: ({ error }) => onError(error),
  });
}
