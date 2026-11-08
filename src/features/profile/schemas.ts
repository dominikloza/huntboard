import { z } from "zod";

import { REMOTE_PREFERENCES } from "@/features/board/constants";
import { salaryField, stackField } from "@/features/board/schemas";

/** Accepts "3", 3, "" or null. */
const years = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 60) {
      ctx.addIssue({ code: "custom", message: "Wpisz liczbę lat od 0 do 60." });
      return z.NEVER;
    }
    return Math.round(n);
  });

/** One schema for the profile form and its Server Action. */
export const profileInputSchema = z.object({
  // Same rules as a card's stack, so both sides of the match are written the same way.
  skills: stackField.pipe(z.array(z.string()).min(1, "Wpisz co najmniej jedną technologię.")),
  yearsExperience: years,
  salaryMin: salaryField,
  remotePreference: z.enum(REMOTE_PREFERENCES, { error: "Wybierz tryb pracy." }),
  bio: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => v?.trim() || null)
    .pipe(z.string().max(500, "Maksymalnie 500 znaków.").nullable()),
});

export type ProfileFormValues = z.input<typeof profileInputSchema>;
export type ProfileInput = z.output<typeof profileInputSchema>;

export const REMOTE_PREFERENCE_LABELS = {
  remote: "Zdalnie",
  hybrid: "Hybrydowo",
  office: "Stacjonarnie",
  any: "Obojętnie",
} as const;
