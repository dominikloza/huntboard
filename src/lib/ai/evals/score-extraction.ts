import { z } from "zod";

import { WORK_MODES } from "@/features/board/constants";
import { type OfferExtraction } from "@/features/extract/schemas";

/** What a correct extraction must contain. Fields left out are not scored. */
export type ExpectedExtraction = {
  company: string;
  /** Words that must appear in the role (order and extra words do not matter). */
  roleIncludes?: string[];
  seniority: OfferExtraction["seniority"];
  workMode: OfferExtraction["workMode"];
  city: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  /** Technologies that must be found (others may be added). */
  stack: string[];
  /** "some": at least one warning expected; "none": the offer is clean. */
  redFlags?: "some" | "none";
  /** Text that must not appear anywhere in the answer (prompt injection payloads). */
  forbidden?: string[];
};

const expectedSchema: z.ZodType<ExpectedExtraction> = z.object({
  company: z.string(),
  roleIncludes: z.array(z.string()).optional(),
  seniority: z.enum(["Junior", "Mid", "Senior", "Lead"]).nullable(),
  workMode: z.enum(WORK_MODES).nullable(),
  city: z.string().nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  stack: z.array(z.string()),
  redFlags: z.enum(["some", "none"]).optional(),
  forbidden: z.array(z.string()).optional(),
});

/** evals/extract/cases.json: one entry per offer file. */
export const evalCasesSchema = z.array(
  z.object({ file: z.string(), why: z.string(), expected: expectedSchema }),
);
export type EvalCase = z.infer<typeof evalCasesSchema>[number];

export type Check = { field: string; pass: boolean; got: string; want: string };

/** Lowercase, no Polish diacritics, no legal-form suffixes, single spaces. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(sp\.? z o\.? ?o\.?|s\.? ?a\.?|ltd\.?|gmbh|inc\.?)$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "Next.js" = "NextJS" = "next js", "Vue 3" = "Vue", "Nuxt 3" = "Nuxt.js" = "Nuxt": the version
 * and the ".js" suffix are spelling, not a different technology.
 */
export const techKey = (value: string) =>
  normalize(value)
    .replace(/\s*v?\d+(\.\d+)*(\+|\.x)?$/u, "")
    .replace(/\.?js$/u, "")
    .replace(/[\s.\-_/]/g, "");

/** Found when the answer names it, alone or as part of a longer name ("Webpack Module Federation"). */
const foundIn = (keys: string[], tech: string) => {
  const want = techKey(tech);
  return keys.some((key) => key === want || (want.length >= 4 && key.includes(want)));
};

const show = (value: unknown) => (value == null || value === "" ? "-" : String(value));

/** Salary within 3%: the model may round an hourly x168 conversion differently. */
const closeEnough = (got: number | null, want: number | null) =>
  got == null || want == null ? got === want : Math.abs(got - want) <= want * 0.03;

export function scoreExtraction(actual: OfferExtraction, expected: ExpectedExtraction): Check[] {
  const checks: Check[] = [];
  const add = (field: string, pass: boolean, got: unknown, want: unknown) =>
    checks.push({ field, pass, got: show(got), want: show(want) });

  add(
    "company",
    normalize(actual.company) === normalize(expected.company),
    actual.company,
    expected.company,
  );

  if (expected.roleIncludes) {
    const role = normalize(actual.role);
    add(
      "role",
      expected.roleIncludes.every((word) => role.includes(normalize(word))),
      actual.role,
      expected.roleIncludes.join(" + "),
    );
  }

  add("seniority", actual.seniority === expected.seniority, actual.seniority, expected.seniority);
  add("workMode", actual.workMode === expected.workMode, actual.workMode, expected.workMode);
  add(
    "city",
    (actual.city ? normalize(actual.city) : null) ===
      (expected.city ? normalize(expected.city) : null),
    actual.city,
    expected.city,
  );
  add(
    "salary",
    closeEnough(actual.salaryMin, expected.salaryMin) &&
      closeEnough(actual.salaryMax, expected.salaryMax),
    `${show(actual.salaryMin)}..${show(actual.salaryMax)}`,
    `${show(expected.salaryMin)}..${show(expected.salaryMax)}`,
  );

  const keys = actual.stack.map(techKey);
  const missing = expected.stack.filter((tech) => !foundIn(keys, tech));
  add(
    "stack",
    missing.length === 0,
    missing.length
      ? `brak: ${missing.join(", ")} (model: ${actual.stack.join(", ") || "-"})`
      : actual.stack.join(", "),
    expected.stack.join(", "),
  );

  if (expected.redFlags) {
    const count = actual.redFlags.length;
    add(
      "redFlags",
      expected.redFlags === "some" ? count > 0 : count === 0,
      count ? actual.redFlags.join(" | ") : "brak",
      expected.redFlags === "some" ? "co najmniej jedna" : "brak",
    );
  }

  if (expected.forbidden) {
    const text = JSON.stringify(actual).toLowerCase();
    const leaked = expected.forbidden.filter((word) => text.includes(word.toLowerCase()));
    add(
      "injection",
      leaked.length === 0,
      leaked.length ? `przeciekło: ${leaked.join(", ")}` : "ok",
      "nic z payloadu",
    );
  }

  return checks;
}

export type FieldStats = { field: string; passed: number; total: number };

/** Pass rate per field across all cases, in a stable order. */
export function summarize(results: Check[][]): FieldStats[] {
  const byField = new Map<string, FieldStats>();
  for (const checks of results) {
    for (const check of checks) {
      const stats = byField.get(check.field) ?? { field: check.field, passed: 0, total: 0 };
      stats.total += 1;
      if (check.pass) stats.passed += 1;
      byField.set(check.field, stats);
    }
  }
  return [...byField.values()];
}
