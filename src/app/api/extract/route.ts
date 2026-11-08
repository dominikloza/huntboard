import { createTextStreamResponse } from "ai";
import { after, connection } from "next/server";

import { extractRequestSchema } from "@/features/extract/schemas";
import { streamOfferExtraction } from "@/features/extract/server/stream-extraction";
import { AiNotConfiguredError, getModel, modelLabel } from "@/lib/ai/model";
import { classifyProviderError, providerErrorMessage } from "@/lib/ai/provider-error";
import { textStreamAfterFirstChunk } from "@/lib/ai/text-stream";
import { UnauthorizedError } from "@/lib/auth/session";
import { reserveAiCallForSession } from "@/lib/db/queries/ai-usage";

export const maxDuration = 30;

/** Errors are plain text: useObject shows the response body as the error message. */
function fail(message: string, status: number, headers: Record<string, string> = {}) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

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

/** Resolves with the value, or undefined after `ms` (a cancelled stream never settles). */
function settleWithin<T>(promise: PromiseLike<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    Promise.resolve(promise).catch(() => undefined),
    new Promise<undefined>((resolve) => setTimeout(resolve, ms)),
  ]);
}

/**
 * Streams a structured extraction of a pasted job offer (ADR 009, ADR 010).
 * Order matters, cheapest check first: input limits, provider configured, then the session and
 * the per-user limit (one transaction), and only then the paid model call.
 */
export async function POST(request: Request) {
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

  let reservation;
  try {
    reservation = await reserveAiCallForSession("extract", modelLabel(model));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("Sesja wygasła. Zaloguj się ponownie.", 401);
    }
    throw error;
  }
  if (!reservation.ok) {
    return fail(reservation.message, 429, { "Retry-After": String(reservation.retryAfterSeconds) });
  }

  const result = streamOfferExtraction({
    model,
    offer: parsed.data.offer,
    // "Stop" in the UI aborts the request; this cancels the provider call too (no tokens wasted).
    abortSignal: request.signal,
  });

  const first = await textStreamAfterFirstChunk(result.stream);
  if (!first.ok) {
    // The user got nothing: give the slot back.
    await reservation.refund();
    const problem = classifyProviderError(first.error);
    console.error(`AI extraction failed before streaming (${problem})`, first.error);
    return fail(
      providerErrorMessage(problem, process.env.NODE_ENV === "development"),
      problem === "rate-limit" ? 429 : 502,
    );
  }

  // Token counts are known only when the stream ends; record them after the response.
  after(async () => {
    const usage = await settleWithin(result.totalUsage, maxDuration * 1000);
    if (usage) await reservation.record(usage);
  });

  return createTextStreamResponse({
    stream: first.stream,
    headers: { "Cache-Control": "no-store" },
  });
}
