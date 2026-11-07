import { type DeepPartial } from "ai";

import { MAX_RED_FLAGS, WORK_MODES } from "@/features/board/constants";
import { EMPTY_APPLICATION_FORM, type ApplicationFormValues } from "@/features/board/schemas";

import { type OfferExtraction } from "../schemas";

const MAX_SALARY = 200_000;
const MAX_STACK = 12;

type StreamedExtraction = DeepPartial<OfferExtraction> | undefined;

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const salary = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const rounded = Math.round(value);
  return rounded >= 0 && rounded <= MAX_SALARY ? String(rounded) : "";
};

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim())
    : [];

/**
 * Maps a (possibly partial, still streaming) AI result onto the application form.
 * Unknown or invalid values become empty fields: the user fills them in, nothing is guessed.
 */
export function extractionToFormValues(extraction: StreamedExtraction): ApplicationFormValues {
  if (!extraction) return EMPTY_APPLICATION_FORM;
  const workMode = WORK_MODES.find((mode) => mode === extraction.workMode);

  return {
    ...EMPTY_APPLICATION_FORM,
    company: text(extraction.company, 120),
    role: text(extraction.role, 120),
    seniority: text(extraction.seniority, 40),
    workMode: workMode ?? EMPTY_APPLICATION_FORM.workMode,
    city: text(extraction.city, 80),
    salaryMin: salary(extraction.salaryMin),
    salaryMax: salary(extraction.salaryMax),
    stack: strings(extraction.stack)
      .filter((item) => item.length > 0 && item.length <= 40)
      .slice(0, MAX_STACK)
      .join(", "),
  };
}

/** Red flags worth showing: non-empty, short, at most five. */
export function extractionRedFlags(extraction: StreamedExtraction): string[] {
  return strings(extraction?.redFlags)
    .filter((flag) => flag.length > 0)
    .map((flag) => flag.slice(0, 200))
    .slice(0, MAX_RED_FLAGS);
}

const FORM_KEYS = [
  "company",
  "role",
  "seniority",
  "workMode",
  "city",
  "salaryMin",
  "salaryMax",
  "stack",
] as const satisfies readonly (keyof ApplicationFormValues & keyof OfferExtraction)[];

export type StreamedField = (typeof FORM_KEYS)[number];

/**
 * Form fields the model has already answered (a null answer counts: "not in the offer").
 * Fields still missing are drawn as placeholders while streaming.
 */
export function answeredFields(extraction: StreamedExtraction): Set<StreamedField> {
  const answered = new Set<StreamedField>();
  if (!extraction) return answered;
  for (const key of FORM_KEYS) if (extraction[key] !== undefined) answered.add(key);
  return answered;
}

/** True when the model found nothing that looks like a job offer. */
export function looksEmpty(extraction: StreamedExtraction): boolean {
  return !text(extraction?.company, 120) && !text(extraction?.role, 120);
}
