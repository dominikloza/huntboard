"use client";

import { useObject } from "@ai-sdk/react";
import { useMemo, useState } from "react";

import { type FormStream } from "@/features/board/components/application-form";
import { type ApplicationFormValues } from "@/features/board/schemas";
import {
  answeredFields,
  extractionRedFlags,
  extractionToFormValues,
  looksEmpty,
} from "@/features/extract/lib/to-form-values";
import { extractRequestSchema, offerExtractionSchema } from "@/features/extract/schemas";
import { aiFetch } from "@/lib/ai/client-fetch";

import { loadOfferPage } from "../actions";
import { fillFromOffer } from "../lib/merge";

export type FillPhase =
  "idle" | "loading-page" | "streaming" | "done" | "stopped" | "empty" | "incomplete";

const ALL_FIELDS = [
  "company",
  "role",
  "status",
  "seniority",
  "workMode",
  "city",
  "salaryMin",
  "salaryMax",
  "stack",
  "offerUrl",
] as const satisfies readonly (keyof ApplicationFormValues)[];

const looksLikeLink = (value: string) => /^https?:\/\/\S+$/i.test(value);

/**
 * "Uzupełnij z ogłoszenia" on an existing card (ADR 018): a link is downloaded first, then the
 * offer goes through the same extraction as a new card. The result only fills the card's empty
 * fields (`fillFromOffer`) and is saved with the form, like every AI result.
 */
export function useOfferFill({
  card,
  workModeIsGuess,
}: {
  card: ApplicationFormValues;
  workModeIsGuess: boolean;
}) {
  const [phase, setPhase] = useState<FillPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<{ text: string; url: string | null } | null>(null);

  const extraction = useObject({
    api: "/api/extract",
    schema: offerExtractionSchema,
    fetch: aiFetch,
    onFinish: ({ object, error: streamError }) => {
      if (streamError) setPhase("incomplete");
      else setPhase(looksEmpty(object) ? "empty" : "done");
    },
  });
  const { object, isLoading } = extraction;

  const stream = useMemo<FormStream | undefined>(() => {
    if (!offer) return undefined;
    const answered = answeredFields(object);
    const { values, filled } = fillFromOffer(card, extractionToFormValues(object), answered, {
      workModeIsGuess,
    });
    if (offer.url && !card.offerUrl) {
      values.offerUrl = offer.url;
      filled.add("offerUrl");
    }
    // Fields still waiting for the model: empty on the card and not answered yet.
    const pending = new Set<string>(
      ALL_FIELDS.filter(
        (key) =>
          key !== "offerUrl" &&
          key !== "status" &&
          !(answered as ReadonlySet<string>).has(key) &&
          (!card[key] || (key === "workMode" && workModeIsGuess)),
      ),
    );
    return {
      values,
      answered: new Set(ALL_FIELDS.filter((key) => !pending.has(key))),
      filled,
      active: isLoading,
    };
  }, [offer, object, isLoading, card, workModeIsGuess]);

  const redFlags = offer ? extractionRedFlags(object) : [];

  async function start(input: string) {
    const value = input.trim();
    setError(null);
    let text = value;
    let url: string | null = null;
    if (looksLikeLink(value)) {
      setPhase("loading-page");
      const page = await loadOfferPage(value);
      if (!page.ok) {
        setPhase("idle");
        setError(page.error);
        return;
      }
      ({ text, url } = page.data);
    }
    const parsed = extractRequestSchema.safeParse({ offer: text });
    if (!parsed.success) {
      setPhase("idle");
      setError(parsed.error.issues[0]?.message ?? "Wklej treść ogłoszenia.");
      return;
    }
    setOffer({ text: parsed.data.offer, url });
    setPhase("streaming");
    void extraction.submit(parsed.data);
  }

  function stop() {
    extraction.stop();
    setPhase("stopped");
  }

  return {
    phase: isLoading ? ("streaming" as const) : phase,
    error: error ?? extraction.error?.message ?? null,
    stream,
    redFlags,
    /** Saved with the form: the offer text for later AI comments, and the warnings. */
    extras:
      offer && !isLoading && phase !== "empty" ? { rawOffer: offer.text, redFlags } : undefined,
    start,
    stop,
  };
}

export type OfferFill = ReturnType<typeof useOfferFill>;
