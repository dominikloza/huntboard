"use server";

import { z } from "zod";

import { type ActionResult } from "@/features/board/actions";
import { UnauthorizedError } from "@/lib/auth/session";
import {
  acceptMailProposalForSession,
  createMailTokenForSession,
  deleteMailConnectionForSession,
  setAutoRejectDaysForSession,
  undoMailForSession,
} from "@/lib/db/queries/mail";

import { AUTO_REJECT_CHOICES } from "./schemas";

async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." };
    }
    console.error("Mail action failed", error);
    return { ok: false, error: "Coś poszło nie tak po naszej stronie. Spróbuj ponownie." };
  }
}

/** A new personal token for the Gmail script; the old one stops working. Shown once. */
export async function createMailToken(): Promise<ActionResult<{ token: string }>> {
  return guarded(async () => {
    const token = await createMailTokenForSession();
    return { ok: true, data: { token } };
  });
}

export async function disconnectMail(): Promise<ActionResult<null>> {
  return guarded(async () => {
    await deleteMailConnectionForSession();
    return { ok: true, data: null };
  });
}

const autoRejectSchema = z.enum(AUTO_REJECT_CHOICES);

export async function setAutoRejectDays(choice: unknown): Promise<ActionResult<null>> {
  const parsed = autoRejectSchema.safeParse(choice);
  if (!parsed.success) return { ok: false, error: "Wybierz jedną z opcji." };
  return guarded(async () => {
    await setAutoRejectDaysForSession(parsed.data === "off" ? null : Number(parsed.data));
    return { ok: true, data: null };
  });
}

const idSchema = z.uuid();

export async function undoMail(id: unknown): Promise<ActionResult<null>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowe dane." };
  return guarded(async () =>
    (await undoMailForSession(parsed.data))
      ? { ok: true, data: null }
      : { ok: false, error: "Tej zmiany nie da się już cofnąć." },
  );
}

export async function acceptMailProposal(id: unknown): Promise<ActionResult<null>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowe dane." };
  return guarded(async () =>
    (await acceptMailProposalForSession(parsed.data))
      ? { ok: true, data: null }
      : { ok: false, error: "Tej propozycji nie da się już zatwierdzić." },
  );
}
