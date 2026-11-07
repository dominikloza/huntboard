import { z } from "zod";

export const NOTE_MAX_LENGTH = 2000;

export const noteInputSchema = z.object({
  applicationId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Wpisz treść notatki.")
    .max(NOTE_MAX_LENGTH, `Maksymalnie ${NOTE_MAX_LENGTH} znaków.`),
});

export const noteIdSchema = z.uuid();

export type NoteInput = z.infer<typeof noteInputSchema>;
