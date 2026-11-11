"use client";

import { useObject } from "@ai-sdk/react";
import { ArrowClockwiseIcon, ArrowLeftIcon, StopIcon } from "@phosphor-icons/react";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { aiFetch } from "@/lib/ai/client-fetch";
import {
  ApplicationForm,
  EMPTY_APPLICATION_FORM,
} from "@/features/board/components/application-form";
import { OFFER_MAX_LENGTH } from "@/features/board/constants";
import { useApplicationMutations } from "@/features/board/hooks/use-application-mutations";

import {
  answeredFields,
  extractionRedFlags,
  extractionToFormValues,
  looksEmpty,
} from "../lib/to-form-values";
import { extractRequestSchema, offerExtractionSchema } from "../schemas";

import { RedFlags } from "./red-flags";

/** How the last extraction ended. "manual" = the user skipped AI. */
type Outcome = "streaming" | "done" | "stopped" | "incomplete" | "empty" | "manual";

const STATUS_COPY: Record<Exclude<Outcome, "manual">, string> = {
  streaming: "AI czyta ogłoszenie i wypełnia pola...",
  done: "Gotowe. Sprawdź pola i popraw, co trzeba. Nic się nie zapisze bez Twojego kliknięcia.",
  stopped: "Zatrzymano. Uzupełnij resztę ręcznie.",
  incomplete: "AI nie dokończyło odpowiedzi. Sprawdź pola i uzupełnij braki.",
  empty:
    "To nie wygląda na ogłoszenie o pracę. Wróć i wklej pełną treść albo uzupełnij pola ręcznie.",
};

const numberFormat = new Intl.NumberFormat("pl-PL");

/**
 * "New offer" with AI (ADR 009): paste the offer, watch the fields fill in, correct them,
 * save. The AI never saves anything by itself (human in the loop).
 */
export function OfferIntake({ onDone }: { onDone: () => void }) {
  const { create } = useApplicationMutations();
  const [step, setStep] = useState<"paste" | "form">("paste");
  const [offer, setOffer] = useState("");
  const [offerError, setOfferError] = useState<string>();
  const [outcome, setOutcome] = useState<Outcome>("manual");
  // A new form for every run: an earlier run's edits never leak into the next one.
  const [run, setRun] = useState(0);

  const extraction = useObject({
    api: "/api/extract",
    schema: offerExtractionSchema,
    fetch: aiFetch,
    onFinish: ({ object, error }) => {
      if (error) setOutcome("incomplete");
      else setOutcome(looksEmpty(object) ? "empty" : "done");
    },
  });
  const { object, isLoading, error } = extraction;

  const fromAi = outcome !== "manual";
  const stream = useMemo(
    () =>
      fromAi
        ? {
            values: extractionToFormValues(object, offer),
            answered: answeredFields(object),
            active: isLoading,
          }
        : undefined,
    [fromAi, object, isLoading, offer],
  );
  const redFlags = fromAi ? extractionRedFlags(object) : [];

  function start() {
    const parsed = extractRequestSchema.safeParse({ offer });
    if (!parsed.success) {
      setOfferError(parsed.error.issues[0]?.message);
      return;
    }
    setOfferError(undefined);
    setRun((n) => n + 1);
    setOutcome("streaming");
    setStep("form");
    void extraction.submit(parsed.data);
  }

  function fillManually() {
    extraction.clear();
    setRun((n) => n + 1);
    setOutcome("manual");
    setStep("form");
  }

  function backToOffer() {
    extraction.stop();
    setStep("paste");
  }

  function finish() {
    extraction.clear();
    setOffer("");
    setOfferError(undefined);
    setOutcome("manual");
    setStep("paste");
    onDone();
  }

  function onPasteSubmit(event: FormEvent) {
    event.preventDefault();
    start();
  }

  if (step === "paste") {
    return (
      <form onSubmit={onPasteSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          label="Treść ogłoszenia"
          hint="Skopiuj całe ogłoszenie, np. z JustJoin.it albo LinkedIn. AI wypełni pola, a Ty je sprawdzisz przed zapisem."
          error={offerError}
        >
          {(field) => (
            <Textarea
              {...field}
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  start();
                }
              }}
              rows={10}
              maxLength={OFFER_MAX_LENGTH}
              placeholder="Frontend Developer (React) w ..."
              className="min-h-56"
            />
          )}
        </FormField>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Wypełnij z AI</Button>
          <Button type="button" variant="secondary" onClick={fillManually}>
            Wpisz ręcznie
          </Button>
          <p className="ml-auto font-mono text-xs text-muted-foreground">
            {numberFormat.format(offer.length)} / {numberFormat.format(OFFER_MAX_LENGTH)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Treść ogłoszenia zapiszę przy karcie, żeby później porównać ją z Twoim profilem.
        </p>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {fromAi && (
        // Buttons on one row, message below: the Stop button never moves while text changes.
        <div className="flex flex-col gap-2 border-b border-dashed border-border pb-4">
          <div className="flex min-h-8 items-center justify-between gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={backToOffer} className="-ml-3">
              <ArrowLeftIcon aria-hidden /> Wróć do ogłoszenia
            </Button>
            {error ? (
              <Button type="button" variant="secondary" size="sm" onClick={start}>
                <ArrowClockwiseIcon aria-hidden /> Spróbuj ponownie
              </Button>
            ) : (
              isLoading && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    extraction.stop();
                    setOutcome("stopped");
                  }}
                >
                  <StopIcon aria-hidden weight="fill" /> Zatrzymaj
                </Button>
              )
            )}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-pen">
              {error.message}
            </p>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              {STATUS_COPY[isLoading ? "streaming" : outcome]}
            </p>
          )}
        </div>
      )}

      <ApplicationForm
        key={run}
        defaultValues={EMPTY_APPLICATION_FORM}
        stream={stream}
        submitLabel="Dodaj do kartoteki"
        pendingLabel="Zapisuję..."
        onSubmit={(values) =>
          create.mutateAsync(fromAi ? { ...values, rawOffer: offer.trim(), redFlags } : values)
        }
        onSuccess={finish}
        onCancel={finish}
        beforeActions={<RedFlags flags={redFlags} />}
      />
    </div>
  );
}
