import "server-only";

import { and, asc, count, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { resolveMovePosition } from "@/features/board/lib/move";
import { positionAtTop } from "@/features/board/lib/position";
import {
  applicationIdSchema,
  type ApplicationInput,
  type MoveInput,
} from "@/features/board/schemas";
import { type Application } from "@/features/board/types";
import { scoreMatch } from "@/features/match/lib/score";
import { requireSessionUser, requireUser } from "@/lib/auth/session";

import { getDb, type Database } from "../client";
import { profileOf } from "./profile";
import { firstPosition, recordStage } from "./stage";
import { applications, type ApplicationRow } from "../schema";

/*
 * Data Access Layer for applications. Every exported function resolves the user from the
 * session itself; the unexported helpers take a userId and always filter by it (IDOR protection).
 */

const columns = {
  id: applications.id,
  status: applications.status,
  position: applications.position,
  version: applications.version,
  company: applications.company,
  role: applications.role,
  seniority: applications.seniority,
  salaryMin: applications.salaryMin,
  salaryMax: applications.salaryMax,
  workMode: applications.workMode,
  city: applications.city,
  stack: applications.stack,
  matchScore: applications.matchScore,
};

// ---------------------------------------------------------------- Server Components

/** Board cards of the signed-in user, ordered for the board. */
export async function getBoardApplications(): Promise<Application[]> {
  const user = await requireUser();
  // The session read above is a private cache, so Next.js may still treat what follows as
  // prerendering. Opening a Postgres connection (SCRAM auth) uses crypto randomness, which is not
  // allowed there. Mark the database read as request-time explicitly.
  await connection();
  return listByUser(getDb(), user.id);
}

/** One card for the details page/modal. 404 for invalid ids and for other users' cards. */
/** The sheet shows more than the board card: the AI's warnings about the offer. */
export type ApplicationDetails = Application &
  Pick<ApplicationRow, "redFlags" | "matchComment" | "roastComment" | "interviewQuestions">;

export async function getApplicationOr404(id: string): Promise<ApplicationDetails> {
  const user = await requireUser();
  if (!applicationIdSchema.safeParse(id).success) notFound();
  await connection();
  const [row] = await getDb()
    .select({
      ...columns,
      redFlags: applications.redFlags,
      matchComment: applications.matchComment,
      roastComment: applications.roastComment,
      interviewQuestions: applications.interviewQuestions,
    })
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
    .limit(1);
  if (!row) notFound();
  return row;
}

// ---------------------------------------------------------------- Route Handlers / Server Actions

export async function listApplicationsForSession(): Promise<Application[]> {
  const user = await requireSessionUser();
  return listByUser(getDb(), user.id);
}

export async function createApplicationForSession(input: ApplicationInput): Promise<Application> {
  const user = await requireSessionUser();
  const db = getDb();
  return db.transaction(async (tx) => {
    const position = positionAtTop(await firstPosition(tx, user.id, input.status));
    const matchScore = scoreMatch(await profileOf(tx, user.id), input)?.score ?? null;
    const [row] = await tx
      .insert(applications)
      .values({ ...input, userId: user.id, position, matchScore })
      .returning(columns);
    if (!row) throw new Error("Insert returned no row");
    await recordStage(tx, row, user.id);
    return row;
  });
}

/** Returns null when the card does not exist or belongs to someone else. */
export async function updateApplicationForSession(
  id: string,
  input: ApplicationInput,
): Promise<Application | null> {
  const user = await requireSessionUser();
  const db = getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: applications.status })
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);
    if (!current) return null;

    // Moving to another column puts the card on top of it; same column keeps its place.
    const position =
      current.status === input.status
        ? undefined
        : positionAtTop(await firstPosition(tx, user.id, input.status));
    const matchScore = scoreMatch(await profileOf(tx, user.id), input)?.score ?? null;

    const [row] = await tx
      .update(applications)
      .set({
        ...input,
        matchScore,
        ...(position ? { position } : {}),
        version: sql`${applications.version} + 1`,
      })
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .returning(columns);
    if (row && row.status !== current.status) await recordStage(tx, row, user.id);
    return row ?? null;
  });
}

export type MoveResult =
  { ok: true; card: Application } | { ok: false; reason: "not-found" | "conflict" };

/**
 * Drag & drop move. Optimistic concurrency: the card must still be at the version the client
 * saw, and the neighbours must still be next to each other in the target column. Otherwise the
 * client's board is out of date and gets "conflict" (it rolls back and refetches).
 */
export async function moveApplicationForSession(move: MoveInput): Promise<MoveResult> {
  const user = await requireSessionUser();
  return getDb().transaction(async (tx) => {
    const [card] = await tx
      .select({ id: applications.id, version: applications.version, status: applications.status })
      .from(applications)
      .where(and(eq(applications.id, move.id), eq(applications.userId, user.id)))
      .for("update");
    if (!card) return { ok: false, reason: "not-found" };
    if (card.version !== move.version) return { ok: false, reason: "conflict" };

    const neighbourIds = [move.prevId, move.nextId].filter((id): id is string => id != null);
    const neighbours = neighbourIds.length
      ? await tx
          .select({ id: applications.id, position: applications.position })
          .from(applications)
          .where(
            and(
              inArray(applications.id, neighbourIds),
              eq(applications.userId, user.id),
              eq(applications.status, move.status),
            ),
          )
      : [];
    const prev = neighbours.find((n) => n.id === move.prevId);
    const next = neighbours.find((n) => n.id === move.nextId);
    if ((move.prevId && !prev) || (move.nextId && !next)) return { ok: false, reason: "conflict" };

    const [between] = await tx
      .select({ n: count() })
      .from(applications)
      .where(
        and(
          eq(applications.userId, user.id),
          eq(applications.status, move.status),
          ne(applications.id, move.id),
          prev ? gt(applications.position, prev.position) : undefined,
          next ? lt(applications.position, next.position) : undefined,
        ),
      );

    const resolved = resolveMovePosition({
      prevPosition: prev?.position ?? null,
      nextPosition: next?.position ?? null,
      othersBetween: between?.n ?? 0,
    });
    if (!resolved.ok) return { ok: false, reason: "conflict" };

    const [row] = await tx
      .update(applications)
      .set({
        status: move.status,
        position: resolved.position,
        version: sql`${applications.version} + 1`,
      })
      .where(and(eq(applications.id, move.id), eq(applications.userId, user.id)))
      .returning(columns);
    if (row && row.status !== card.status) await recordStage(tx, row, user.id);
    return row ? { ok: true, card: row } : { ok: false, reason: "not-found" };
  });
}

/** Returns false when there was nothing to delete for this user. */
export async function deleteApplicationForSession(id: string): Promise<boolean> {
  const user = await requireSessionUser();
  const deleted = await getDb()
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
    .returning({ id: applications.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------- helpers (not exported)

async function listByUser(db: Database, userId: string): Promise<Application[]> {
  return db
    .select(columns)
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(asc(applications.status), asc(applications.position));
}
