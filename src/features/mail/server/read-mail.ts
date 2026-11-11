import "server-only";

import { type LanguageModel, Output, streamText } from "ai";

import { MAIL_INSTRUCTIONS, mailPrompt, type TriageMail } from "@/lib/ai/prompts/mail-triage";

import { mailReadingsSchema } from "../schemas";

const ignoreError = () => {};

/** The one way to ask a model what recruitment e-mails mean (one call for a whole batch). */
export function streamMailReadings({
  model,
  mails,
  abortSignal,
  onError = ignoreError,
}: {
  model: LanguageModel;
  mails: TriageMail[];
  abortSignal?: AbortSignal;
  onError?: (error: unknown) => void;
}) {
  return streamText({
    model,
    output: Output.object({ schema: mailReadingsSchema }),
    instructions: MAIL_INSTRUCTIONS,
    prompt: mailPrompt(mails),
    maxOutputTokens: 300 + 120 * mails.length,
    maxRetries: 1,
    temperature: 0,
    abortSignal,
    onError: ({ error }) => onError(error),
  });
}
