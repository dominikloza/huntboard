"use server";

import { z } from "zod";

import { UnauthorizedError } from "@/lib/auth/session";
import { addNoteForSession, deleteNoteForSession } from "@/lib/db/queries/notes";

import { noteIdSchema, noteInputSchema } from "./schemas";
import { type Note } from "./types";

/*
 * Notes use the plain React 19 path (ADR 008): the sheet is a Server Component that loads them,
 * the client list updates optimistically (useOptimistic) and keeps confirmed results itself.
 * No client cache library: notes are only shown in one place.
 *
 * No refresh() here on purpose: refreshing the router re-renders /board/app/[id] as the full
 * page and the modal (intercepted route) disappears under the user.
 */

export type NoteResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function guard<T>(fn: () => Promise<NoteResult<T>>): Promise<NoteResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." };
    }
    console.error("Note action failed", error);
    return { ok: false, error: "Nie udało się zapisać zmiany. Spróbuj ponownie." };
  }
}

export async function addNote(input: unknown): Promise<NoteResult<Note>> {
  return guard(async () => {
    const parsed = noteInputSchema.safeParse(input);
    if (!parsed.success) {
      const first = z.flattenError(parsed.error).fieldErrors.body?.[0];
      return { ok: false, error: first ?? "Nieprawidłowa notatka." };
    }
    const note = await addNoteForSession(parsed.data);
    if (!note) return { ok: false, error: "Nie znaleziono tej aplikacji." };
    return { ok: true, data: note };
  });
}

export async function deleteNote(noteId: unknown): Promise<NoteResult<{ id: string }>> {
  return guard(async () => {
    const parsed = noteIdSchema.safeParse(noteId);
    if (!parsed.success) return { ok: false, error: "Nie znaleziono tej notatki." };
    const deleted = await deleteNoteForSession(parsed.data);
    if (!deleted) return { ok: false, error: "Nie znaleziono tej notatki." };
    return { ok: true, data: { id: parsed.data } };
  });
}
