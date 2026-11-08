"use server";

import { z } from "zod";

import { type ActionResult } from "@/features/board/actions";
import { UnauthorizedError } from "@/lib/auth/session";
import { saveProfileForSession } from "@/lib/db/queries/profile";

import { profileInputSchema } from "./schemas";

/** Saves the profile; every card's match score is recomputed in the same transaction. */
export async function saveProfile(values: unknown): Promise<ActionResult<{ rescored: number }>> {
  const parsed = profileInputSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Popraw zaznaczone pola.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  try {
    const { rescored } = await saveProfileForSession(parsed.data);
    return { ok: true, data: { rescored } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." };
    }
    console.error("Profile save failed", error);
    return { ok: false, error: "Coś poszło nie tak po naszej stronie. Spróbuj ponownie." };
  }
}
