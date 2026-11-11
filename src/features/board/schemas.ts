import { z } from "zod";

import { APPLICATION_STATUSES, MAX_RED_FLAGS, OFFER_MAX_LENGTH, WORK_MODES } from "./constants";

const MAX_SALARY = 200_000;

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `Podaj ${label}.` })
    .trim()
    .min(1, `Podaj ${label}.`)
    .max(max, `Maksymalnie ${max} znaków.`);

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => v?.trim() || null)
    .pipe(z.string().max(max, `Maksymalnie ${max} znaków.`).nullable());

/** Empty, or a full http(s) link (the offer page). */
const optionalUrl = optionalText(500).refine(
  (v) => v === null || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v),
  "Wklej pełny link, np. https://justjoin.it/job-offer/...",
);

/** Accepts "17 000", "17000", 17000, "" or null. Monthly salary in PLN. */
export const salaryField = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value.replace(/[\s ]/g, ""));
    if (!Number.isInteger(n) || n < 0 || n > MAX_SALARY) {
      ctx.addIssue({ code: "custom", message: `Wpisz kwotę od 0 do ${MAX_SALARY} zł.` });
      return z.NEVER;
    }
    return n;
  });

/** Accepts "React, TypeScript" or ["React", "TypeScript"]. Trims, drops empties and duplicates. */
export const stackField = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    const items = (typeof value === "string" ? value.split(",") : (value ?? []))
      .map((s) => s.trim())
      .filter(Boolean);
    const unique = new Map<string, string>();
    for (const item of items)
      if (!unique.has(item.toLowerCase())) unique.set(item.toLowerCase(), item);
    return [...unique.values()];
  })
  .pipe(
    z
      .array(z.string().max(40, "Nazwa technologii jest za długa."))
      .max(20, "Maksymalnie 20 technologii."),
  );

/**
 * One schema for the form (client) and the Server Action (server).
 * Input is form-friendly (strings), output is what goes to the database.
 */
export const applicationInputSchema = z
  .object({
    company: requiredText("nazwę firmy", 120),
    role: requiredText("stanowisko", 120),
    status: z.enum(APPLICATION_STATUSES, { error: "Wybierz etap." }),
    workMode: z.enum(WORK_MODES, { error: "Wybierz tryb pracy." }),
    city: optionalText(80),
    seniority: optionalText(40),
    salaryMin: salaryField,
    salaryMax: salaryField,
    stack: stackField,
    offerUrl: optionalUrl,
    // Set only when the card comes from a pasted offer (AI intake). Undefined = leave unchanged.
    rawOffer: z.string().trim().max(OFFER_MAX_LENGTH).optional(),
    redFlags: z.array(z.string().trim().min(1).max(200)).max(MAX_RED_FLAGS).optional(),
  })
  .refine((v) => v.salaryMin == null || v.salaryMax == null || v.salaryMin <= v.salaryMax, {
    path: ["salaryMax"],
    message: "Górna granica nie może być niższa niż dolna.",
  });

export type ApplicationFormValues = z.input<typeof applicationInputSchema>;
export type ApplicationInput = z.output<typeof applicationInputSchema>;

export const EMPTY_APPLICATION_FORM: ApplicationFormValues = {
  company: "",
  role: "",
  status: "saved",
  workMode: "remote",
  city: "",
  seniority: "",
  salaryMin: "",
  salaryMax: "",
  stack: "",
  offerUrl: "",
};

export const applicationIdSchema = z.uuid();

/** A drag & drop move: target column, the cards it now sits between, and the version it saw. */
export const moveInputSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(APPLICATION_STATUSES),
    prevId: z.uuid().nullable(),
    nextId: z.uuid().nullable(),
    version: z.int().positive(),
  })
  .refine((m) => m.prevId !== m.id && m.nextId !== m.id, "A card cannot be its own neighbour.")
  .refine((m) => m.prevId == null || m.prevId !== m.nextId, "Neighbours must differ.");

export type MoveInput = z.infer<typeof moveInputSchema>;
