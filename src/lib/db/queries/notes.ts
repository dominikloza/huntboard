import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { applicationIdSchema } from "@/features/board/schemas";
import { type NoteInput } from "@/features/notes/schemas";
import { type Note } from "@/features/notes/types";
import { requireSessionUser, requireUser } from "@/lib/auth/session";

import { getDb } from "../client";
import { applications, notes } from "../schema";

/* Data Access Layer for notes. Notes carry userId too, so every query filters by the owner. */

const columns = { id: notes.id, body: notes.body, createdAt: notes.createdAt };
const toNote = (row: { id: string; body: string; createdAt: Date }): Note => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});

/** Server Components: notes of one card, newest first. Empty for unknown or foreign cards. */
export async function getNotesForApplication(applicationId: string): Promise<Note[]> {
  const user = await requireUser();
  if (!applicationIdSchema.safeParse(applicationId).success) return [];
  await connection();
  const rows = await getDb()
    .select(columns)
    .from(notes)
    .where(and(eq(notes.applicationId, applicationId), eq(notes.userId, user.id)))
    .orderBy(desc(notes.createdAt));
  return rows.map(toNote);
}

/** Returns null when the card does not exist or belongs to someone else. */
export async function addNoteForSession(input: NoteInput): Promise<Note | null> {
  const user = await requireSessionUser();
  const db = getDb();
  const [card] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.id, input.applicationId), eq(applications.userId, user.id)))
    .limit(1);
  if (!card) return null;

  const [row] = await db
    .insert(notes)
    .values({ applicationId: card.id, userId: user.id, body: input.body })
    .returning(columns);
  return row ? toNote(row) : null;
}

export async function deleteNoteForSession(noteId: string): Promise<boolean> {
  const user = await requireSessionUser();
  const deleted = await getDb()
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .returning({ id: notes.id });
  return deleted.length > 0;
}
