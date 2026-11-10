import "server-only";

import { type LanguageModel, Output, streamText } from "ai";

import {
  QUESTIONS_INSTRUCTIONS,
  questionsPrompt,
  type QuestionsPromptInput,
} from "@/lib/ai/prompts/interview-questions";

import { interviewQuestionsSchema } from "../schemas";

const ignoreError = () => {};

/** The one way to ask a model for interview questions about an offer. */
export function streamInterviewQuestions({
  model,
  input,
  abortSignal,
  onError = ignoreError,
}: {
  model: LanguageModel;
  input: QuestionsPromptInput;
  abortSignal?: AbortSignal;
  /** Errors also reach the caller through the stream and its promises; by default not logged twice. */
  onError?: (error: unknown) => void;
}) {
  return streamText({
    model,
    output: Output.object({ schema: interviewQuestionsSchema }),
    instructions: QUESTIONS_INSTRUCTIONS,
    prompt: questionsPrompt(input),
    maxOutputTokens: 1400,
    maxRetries: 1,
    temperature: 0.5,
    abortSignal,
    onError: ({ error }) => onError(error),
  });
}
