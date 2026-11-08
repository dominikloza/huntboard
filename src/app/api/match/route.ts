import { createTextStreamResponse } from "ai";
import { after } from "next/server";

import { scoreMatch } from "@/features/match/lib/score";
import { matchRequestSchema } from "@/features/match/schemas";
import { streamMatchComment } from "@/features/match/server/stream-comment";
import { settleWithin, textError } from "@/lib/ai/http";
import { AiNotConfiguredError, getModel, modelLabel } from "@/lib/ai/model";
import { classifyProviderError, providerErrorMessage } from "@/lib/ai/provider-error";
import { textStreamAfterFirstChunk } from "@/lib/ai/text-stream";
import { UnauthorizedError } from "@/lib/auth/session";
import { reserveAiCallForSession } from "@/lib/db/queries/ai-usage";
import { getMatchContextForSession } from "@/lib/db/queries/match";

export const maxDuration = 30;

/**
 * Streams an AI comment (coach or roast) on a card's match score (ADR 011). The score itself is
 * computed in code; the model only explains it. Same guards as the extraction (ADR 010).
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = matchRequestSchema.safeParse(body);
  if (!parsed.success) return textError("Nieprawidłowe dane.", 400);
  const { applicationId, tone } = parsed.data;

  let model;
  try {
    model = getModel();
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return textError("AI nie jest skonfigurowane na tym serwerze.", 503);
    }
    throw error;
  }

  try {
    const context = await getMatchContextForSession(applicationId);
    if (!context) return textError("Nie znaleziono tej aplikacji.", 404);
    const breakdown = scoreMatch(context.profile, context.offer);
    if (!context.profile || !breakdown) {
      return textError("Najpierw uzupełnij profil: bez niego nie ma czego porównać.", 409);
    }

    const label = modelLabel(model);
    const reservation = await reserveAiCallForSession(tone === "roast" ? "roast" : "match", label);
    if (!reservation.ok) {
      return textError(reservation.message, 429, {
        "Retry-After": String(reservation.retryAfterSeconds),
      });
    }

    const result = streamMatchComment({
      model,
      tone,
      input: { profile: context.profile, offer: context.offer, breakdown },
      abortSignal: request.signal,
    });

    const first = await textStreamAfterFirstChunk(result.stream);
    if (!first.ok) {
      await reservation.refund();
      const problem = classifyProviderError(first.error);
      console.error(`AI match comment failed before streaming (${problem})`, first.error);
      return textError(
        providerErrorMessage(problem, process.env.NODE_ENV === "development"),
        problem === "rate-limit" ? 429 : 502,
      );
    }

    // After the response: keep the finished comment with the card and record the tokens.
    after(async () => {
      const [output, usage] = await Promise.all([
        settleWithin(result.output, maxDuration * 1000),
        settleWithin(result.totalUsage, maxDuration * 1000),
      ]);
      if (output) {
        await context.save(tone, {
          ...output,
          score: breakdown.score,
          model: label,
          createdAt: new Date().toISOString(),
        });
      }
      if (usage) await reservation.record(usage);
    });

    return createTextStreamResponse({
      stream: first.stream,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return textError("Sesja wygasła. Zaloguj się ponownie.", 401);
    }
    throw error;
  }
}
