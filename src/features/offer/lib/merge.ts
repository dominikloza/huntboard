import { type ApplicationFormValues } from "@/features/board/schemas";

const FILLABLE = [
  "company",
  "role",
  "seniority",
  "workMode",
  "city",
  "salaryMin",
  "salaryMax",
  "stack",
] as const satisfies readonly (keyof ApplicationFormValues)[];

const isEmpty = (value: ApplicationFormValues[keyof ApplicationFormValues]) =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

/**
 * "Uzupełnij z ogłoszenia" (ADR 018) on a card that already exists: the offer fills the gaps,
 * it never overwrites what the user (or the e-mail) wrote. One exception: a card that was
 * never read from an offer has the default work mode, a guess, so the offer's answer wins.
 *
 * Returns the merged values and the fields the offer actually filled (for the highlight).
 */
export function fillFromOffer(
  card: ApplicationFormValues,
  offer: ApplicationFormValues,
  answered: ReadonlySet<string>,
  { workModeIsGuess }: { workModeIsGuess: boolean },
): { values: ApplicationFormValues; filled: Set<string> } {
  const values = { ...card };
  const filled = new Set<string>();
  for (const key of FILLABLE) {
    if (!answered.has(key) || isEmpty(offer[key])) continue;
    const replace = isEmpty(card[key]) || (key === "workMode" && workModeIsGuess);
    if (replace && card[key] !== offer[key]) {
      Object.assign(values, { [key]: offer[key] });
      filled.add(key);
    }
  }
  return { values, filled };
}
