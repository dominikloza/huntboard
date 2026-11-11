"use client";

import { useObject } from "@ai-sdk/react";
import { type DeepPartial } from "ai";
import { ArrowClockwiseIcon, CaretDownIcon, StopIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { aiFetch } from "@/lib/ai/client-fetch";
import { formatDateTime } from "@/lib/format";

import {
  type InterviewQuestions,
  interviewQuestionsSchema,
  QUESTION_COUNT,
  type StoredInterviewQuestions,
} from "../schemas";

type Shown = DeepPartial<InterviewQuestions> & { createdAt?: string; streaming?: boolean };
type Question = { topic: string; question: string; hint?: string };

/** Only the items that already have a question (a streamed item fills in key by key). */
function questionsOf(shown: Shown): Question[] {
  return (shown.questions ?? []).flatMap((item) =>
    item?.question ? [{ topic: item.topic ?? "", question: item.question, hint: item.hint }] : [],
  );
}

/**
 * Interview prep for one card: flashcards about the offer's stack (each hides what a good
 * answer covers) and questions to ask the employer. Streamed like the other AI features and
 * saved with the card; the server weighs them towards the skills the profile is missing.
 */
export function QuestionsPanel({
  applicationId,
  hasStack,
  saved,
}: {
  applicationId: string;
  hasStack: boolean;
  saved: StoredInterviewQuestions | null;
}) {
  // A set finished in this visit (the server saves it too; this avoids a refetch).
  const [fresh, setFresh] = useState<Shown | null>(null);
  const set = useObject({
    api: "/api/questions",
    schema: interviewQuestionsSchema,
    fetch: aiFetch,
    onFinish: ({ object }) => {
      if (object) setFresh({ ...object, createdAt: new Date().toISOString() });
    },
  });

  const shown: Shown | null = set.isLoading
    ? { ...set.object, streaming: true }
    : (fresh ?? set.object ?? saved);
  const hasSet = Boolean(fresh ?? saved);
  const questions = shown ? questionsOf(shown) : [];
  const askThem = (shown?.askThem ?? []).filter((q): q is string => Boolean(q));

  return (
    <section
      aria-labelledby="questions-heading"
      className="mb-6 flex flex-col gap-4 border-b-[1.5px] border-dashed border-border pb-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id="questions-heading" className="font-display text-lg font-bold">
          Przygotowanie do rozmowy
        </h3>
        <p className="text-sm text-muted-foreground">
          {QUESTION_COUNT} pytań pod stack tej oferty, więcej o tym, czego brakuje w Twoim profilu.
          Pod każdym schowana podpowiedź, co powinno paść w odpowiedzi.
        </p>
      </div>

      {hasStack ? (
        <div className="flex flex-wrap items-center gap-3">
          {set.isLoading ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => set.stop()}>
              <StopIcon aria-hidden weight="fill" /> Zatrzymaj
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={hasSet ? "secondary" : "primary"}
              onClick={() => void set.submit({ applicationId })}
            >
              {hasSet && <ArrowClockwiseIcon aria-hidden />}
              {hasSet ? "Nowy zestaw pytań" : "Przygotuj pytania"}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm">
          Ta teczka nie ma stacku. Uzupełnij ją z ogłoszenia (sekcja nad formularzem), a ułożę
          pytania pod te technologie.
        </p>
      )}

      <p role="status" className="sr-only">
        {set.isLoading ? "AI układa pytania..." : ""}
      </p>
      {set.error && (
        <p role="alert" className="text-sm text-pen">
          {set.error.message}
        </p>
      )}

      {questions.length > 0 && (
        <ol
          aria-label="Pytania"
          aria-busy={shown?.streaming === true}
          className="flex flex-col gap-2"
        >
          {questions.map((item, index) => (
            <li key={`${index}-${item.question}`}>
              <details className="group border-[1.5px] border-ink bg-card shadow-sheet">
                <summary className="flex cursor-pointer list-none items-start gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="pt-0.5 font-mono text-xs font-semibold text-primary-ink">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {item.topic && (
                      <span className="font-mono text-xs text-muted-foreground">{item.topic}</span>
                    )}
                    <span className="font-medium">{item.question}</span>
                  </span>
                  <CaretDownIcon
                    aria-hidden
                    className="mt-1 shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="border-t border-dashed border-border px-3.5 py-3 pl-11 text-sm">
                  <span className="font-semibold">Co powinno paść: </span>
                  {item.hint ?? "..."}
                </p>
              </details>
            </li>
          ))}
        </ol>
      )}

      {askThem.length > 0 && (
        <div className="border-l-[1.5px] border-ink pl-3">
          <h4 className="font-display text-sm font-bold">Zapytaj ich</h4>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-sm">
            {askThem.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}

      {shown && !shown.streaming && shown.createdAt && (
        <p className="font-mono text-xs text-muted-foreground">{formatDateTime(shown.createdAt)}</p>
      )}
    </section>
  );
}
