import { createTextStreamResponse } from "ai";
import { after, connection } from "next/server";

import { extractRequestSchema } from "@/features/extract/schemas";
import { streamOfferExtraction } from "@/features/extract/server/stream-extraction";
import { aiLimits } from "@/lib/ai/limits";
import { AiNotConfiguredError, getModel, modelLabel } from "@/lib/ai/model";
import { settleWithin, textError } from "@/lib/ai/http";
import { classifyProviderError, providerErrorMessage } from "@/lib/ai/provider-error";
import { textStreamAfterFirstChunk } from "@/lib/ai/text-stream";
import { UnauthorizedError } from "@/lib/auth/session";
import { reserveAiCallForSession } from "@/lib/db/queries/ai-usage";

export const maxDuration = 30;

/**
 * Which model answers and the guest limit: the e2e suite refuses to call a real, paid model
 * (a reused `pnpm dev`, or a deployment) and sizes its limit tests to the server's setting.
 */
export async function GET() {
  await connection(); // read the env at request time, not at build time (prerendering)
  return Response.json(
    { mock: process.env.AI_PROVIDER === "mock", guestLimit: aiLimits().guestPerHour },
    { headers: { "Cache-Control": "no-store" } },
  );
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
    return textError(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane.", 400);
  }

  let model;
  try {
    model = getModel();
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return textError("AI nie jest skonfigurowane na tym serwerze. Wpisz dane ręcznie.", 503);
    }
    throw error;
  }

  let reservation;
  try {
    reservation = await reserveAiCallForSession("extract", modelLabel(model));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return textError("Sesja wygasła. Zaloguj się ponownie.", 401);
    }
    throw error;
  }
  if (!reservation.ok) {
    return textError(reservation.message, 429, {
      "Retry-After": String(reservation.retryAfterSeconds),
    });
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
    return textError(
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
