import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { type ApplicationStatus, type EventSource } from "@/features/board/constants";
import { positionAtTop } from "@/features/board/lib/position";

import { type Database } from "../client";
import { applicationEvents, applications } from "../schema";

/*
 * Stage changes shared by the board (session user), the mail sync (token user, ADR 017) and the
 * auto-reject job (cron). Every function takes the owner's id and filters by it; callers are
 * responsible for where that id comes from.
 */

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Stage history for the statistics (ADR 016): the card has just entered `status`. */
export async function recordStage(
  tx: Tx,
  card: { id: string; status: ApplicationStatus },
  userId: string,
  { source = "board", at }: { source?: EventSource; at?: Date } = {},
) {
  await tx.insert(applicationEvents).values({
    applicationId: card.id,
    userId,
    status: card.status,
    source,
    ...(at ? { createdAt: at } : {}),
  });
}

/** Position of the first card in a column, or null for an empty column. */
export async function firstPosition(tx: Tx, userId: string, status: ApplicationStatus) {
  const [first] = await tx
    .select({ position: applications.position })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.status, status)))
    .orderBy(asc(applications.position))
    .limit(1);
  return first?.position ?? null;
}

/**
 * Moves a card to the top of another column, bumps its version (an open board sees the change
 * as a conflict and refetches) and records the stage. Returns false when there is no such card.
 */
export async function moveCardToStage(
  tx: Tx,
  userId: string,
  id: string,
  status: ApplicationStatus,
  options: { source: EventSource; at?: Date },
): Promise<boolean> {
  const position = positionAtTop(await firstPosition(tx, userId, status));
  const [row] = await tx
    .update(applications)
    .set({ status, position, version: sql`${applications.version} + 1` })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning({ id: applications.id });
  if (!row) return false;
  await recordStage(tx, { id, status }, userId, options);
  return true;
}
