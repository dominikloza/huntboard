"use client";

import { OfferIntake } from "@/features/extract/components/offer-intake";

import { useCloseSheet } from "./sheet-frame";

/** "Nowa oferta": paste an offer for the AI, or skip to the manual form (ADR 009). */
export function NewApplicationSheet() {
  const close = useCloseSheet();
  return <OfferIntake onDone={close} />;
}
