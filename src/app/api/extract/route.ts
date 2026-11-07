import { createTextStreamResponse, Output, streamText } from "ai";
import { connection } from "next/server";

import { extractRequestSchema, offerExtractionSchema } from "@/features/extract/schemas";
import { EXTRACT_OFFER_INSTRUCTIONS, offerPrompt } from "@/lib/ai/prompts/extract-offer";
import { AiNotConfiguredError, getModel } from "@/lib/ai/model";
import { classifyProviderError, providerErrorMessage } from "@/lib/ai/provider-error";
import { textStreamAfterFirstChunk } from "@/lib/ai/text-stream";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";

export const maxDuration = 30;

/** Errors are plain text: useObject shows the response body as the error message. */
function fail(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Streams a structured extraction of a pasted job offer (ADR 009).
 * Order matters: session, then input limits, then the paid model call.
 * (Rate limiting and usage logging come on Day 6, also before the model call.)
 */
/**
 * Which model answers: lets the e2e suite refuse to run against a dev server that talks to a
 * real, paid model (Playwright reuses a running `pnpm dev`).
 */
export async function GET() {
  await connection(); // read the env at request time, not at build time (prerendering)
  return Response.json(
    { mock: process.env.AI_PROVIDER === "mock" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    await requireSessionUser();
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return fail("Sesja wygasła. Zaloguj się ponownie.", 401);
    throw error;
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = extractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane.", 400);
  }

  let model;
  try {
    model = getModel();
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return fail("AI nie jest skonfigurowane na tym serwerze. Wpisz dane ręcznie.", 503);
    }
    throw error;
  }

  const result = streamText({
    model,
    output: Output.object({ schema: offerExtractionSchema }),
    instructions: EXTRACT_OFFER_INSTRUCTIONS,
    prompt: offerPrompt(parsed.data.offer),
    maxOutputTokens: 1200,
    maxRetries: 1,
    // "Stop" in the UI aborts the request; this cancels the provider call too (no tokens wasted).
    abortSignal: request.signal,
  });

  const first = await textStreamAfterFirstChunk(result.stream);
  if (!first.ok) {
    const problem = classifyProviderError(first.error);
    console.error(`AI extraction failed before streaming (${problem})`, first.error);
    return fail(
      providerErrorMessage(problem, process.env.NODE_ENV === "development"),
      problem === "rate-limit" ? 429 : 502,
    );
  }

  return createTextStreamResponse({
    stream: first.stream,
    headers: { "Cache-Control": "no-store" },
  });
}
