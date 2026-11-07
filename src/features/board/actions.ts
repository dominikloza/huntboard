"use server";

import { z } from "zod";

import { UnauthorizedError } from "@/lib/auth/session";
import {
  createApplicationForSession,
  deleteApplicationForSession,
  updateApplicationForSession,
} from "@/lib/db/queries/applications";

import { applicationIdSchema, applicationInputSchema } from "./schemas";
import { type Application } from "./types";

/*
 * Mutations for the board. Each action: validates input with the same Zod schema as the form,
 * re-checks the session (inside the DAL), and returns a result object instead of throwing,
 * so the UI can show field errors and keep the user's input.
 */

export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: FieldErrors };

function invalid(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Popraw zaznaczone pola.",
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

async function run<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." };
    }
    console.error("Board action failed", error);
    return { ok: false, error: "Coś poszło nie tak po naszej stronie. Spróbuj ponownie." };
  }
}

export async function createApplication(values: unknown): Promise<ActionResult<Application>> {
  return run(async () => {
    const parsed = applicationInputSchema.safeParse(values);
    if (!parsed.success) return invalid(parsed.error);
    return { ok: true, data: await createApplicationForSession(parsed.data) };
  });
}

export async function updateApplication(
  id: unknown,
  values: unknown,
): Promise<ActionResult<Application>> {
  return run(async () => {
    const parsedId = applicationIdSchema.safeParse(id);
    if (!parsedId.success) return { ok: false, error: "Nie znaleziono tej aplikacji." };
    const parsed = applicationInputSchema.safeParse(values);
    if (!parsed.success) return invalid(parsed.error);
    const row = await updateApplicationForSession(parsedId.data, parsed.data);
    return row ? { ok: true, data: row } : { ok: false, error: "Nie znaleziono tej aplikacji." };
  });
}

export async function deleteApplication(id: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const parsedId = applicationIdSchema.safeParse(id);
    if (!parsedId.success) return { ok: false, error: "Nie znaleziono tej aplikacji." };
    const deleted = await deleteApplicationForSession(parsedId.data);
    return deleted
      ? { ok: true, data: { id: parsedId.data } }
      : { ok: false, error: "Nie znaleziono tej aplikacji." };
  });
}
