import { createTextStreamResponse } from "ai";
import { after } from "next/server";

import { questionsRequestSchema } from "@/features/interview/schemas";
import { streamInterviewQuestions } from "@/features/interview/server/stream-questions";
import { scoreMatch } from "@/features/match/lib/score";
import { settleWithin, textError } from "@/lib/ai/http";
import { AiNotConfiguredError, getModel, modelLabel } from "@/lib/ai/model";
import { classifyProviderError, providerErrorMessage } from "@/lib/ai/provider-error";
import { textStreamAfterFirstChunk } from "@/lib/ai/text-stream";
import { UnauthorizedError } from "@/lib/auth/session";
import { reserveAiCallForSession } from "@/lib/db/queries/ai-usage";
import { getQuestionsContextForSession } from "@/lib/db/queries/interview";

export const maxDuration = 30;

/**
 * Streams interview prep for one card: flashcard questions about the offer's stack (more about
 * the skills the profile is missing) and questions to ask the employer. Same guards as the
 * other AI routes (ADR 010); the finished set is saved with the card.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = questionsRequestSchema.safeParse(body);
  if (!parsed.success) return textError("Nieprawidłowe dane.", 400);

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
    const context = await getQuestionsContextForSession(parsed.data.applicationId);
    if (!context) return textError("Nie znaleziono tej aplikacji.", 404);
    if (context.offer.stack.length === 0) {
      return textError("Dodaj stack do tej teczki: pytania układam pod technologie z oferty.", 409);
    }
    const breakdown = scoreMatch(context.profile, context.offer);
    const focus =
      context.profile && breakdown
        ? { skills: context.profile.skills, missingSkills: breakdown.missingSkills }
        : null;

    const label = modelLabel(model);
    const reservation = await reserveAiCallForSession("questions", label);
    if (!reservation.ok) {
      return textError(reservation.message, 429, {
        "Retry-After": String(reservation.retryAfterSeconds),
      });
    }

    const result = streamInterviewQuestions({
      model,
      input: { offer: context.offer, focus },
      abortSignal: request.signal,
    });

    const first = await textStreamAfterFirstChunk(result.stream);
    if (!first.ok) {
      await reservation.refund();
      const problem = classifyProviderError(first.error);
      console.error(`AI interview questions failed before streaming (${problem})`, first.error);
      return textError(
        providerErrorMessage(problem, process.env.NODE_ENV === "development"),
        problem === "rate-limit" ? 429 : 502,
      );
    }

    after(async () => {
      const [output, usage] = await Promise.all([
        settleWithin(result.output, maxDuration * 1000),
        settleWithin(result.totalUsage, maxDuration * 1000),
      ]);
      if (output) {
        await context.save({ ...output, model: label, createdAt: new Date().toISOString() });
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
