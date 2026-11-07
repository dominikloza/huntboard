import { z } from "zod";

import { OFFER_MAX_LENGTH, OFFER_MIN_LENGTH, WORK_MODES } from "@/features/board/constants";

/** What the client sends to POST /api/extract. Shared by the form and the Route Handler. */
export const extractRequestSchema = z.object({
  offer: z
    .string({ error: "Wklej treść ogłoszenia." })
    .trim()
    .min(OFFER_MIN_LENGTH, `Wklej całe ogłoszenie (min. ${OFFER_MIN_LENGTH} znaków).`)
    .max(OFFER_MAX_LENGTH, `Ogłoszenie jest za długie (maks. ${OFFER_MAX_LENGTH} znaków).`),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;

/**
 * What the model must return, field by field, in this order (the order is also the order in
 * which fields appear on screen while streaming).
 *
 * Every field is required and nullable instead of optional: strict structured output
 * (OpenAI) needs all keys present. Salaries are plain numbers, not z.int(): that adds
 * +-2^53 min/max bounds to the JSON schema; the form mapper rounds them. Limits (max items,
 * lengths) are enforced when we map the result onto the form, not here, so a slightly long
 * answer is trimmed instead of rejected.
 */
export const offerExtractionSchema = z.object({
  company: z.string().describe("Employer name. Empty string when the offer does not say."),
  role: z.string().describe("Job title as written in the offer."),
  seniority: z
    .enum(["Junior", "Mid", "Senior", "Lead"])
    .nullable()
    .describe("Level of the role, null when not stated."),
  workMode: z.enum(WORK_MODES).nullable().describe("Where the work happens, null when not stated."),
  city: z.string().nullable().describe("Office city in Polish spelling, null for fully remote."),
  salaryMin: z.number().nullable().describe("Lower bound, monthly, PLN. Null when not given."),
  salaryMax: z.number().nullable().describe("Upper bound, monthly, PLN. Null when not given."),
  stack: z.array(z.string()).describe("Technologies, canonical names, most important first."),
  redFlags: z.array(z.string()).describe("Short warnings for the candidate, in Polish."),
});

export type OfferExtraction = z.infer<typeof offerExtractionSchema>;
