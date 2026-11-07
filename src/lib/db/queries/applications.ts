import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { positionAtTop } from "@/features/board/lib/position";
import { applicationIdSchema, type ApplicationInput } from "@/features/board/schemas";
import { type Application } from "@/features/board/types";
import { requireSessionUser, requireUser } from "@/lib/auth/session";

import { getDb, type Database } from "../client";
import { applications } from "../schema";

/*
 * Data Access Layer for applications. Every exported function resolves the user from the
 * session itself; the unexported helpers take a userId and always filter by it (IDOR protection).
 */

const columns = {
  id: applications.id,
  status: applications.status,
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
export async function getApplicationOr404(id: string): Promise<Application> {
  const user = await requireUser();
  if (!applicationIdSchema.safeParse(id).success) notFound();
  await connection();
  const [row] = await getDb()
    .select(columns)
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
    const [row] = await tx
      .insert(applications)
      .values({ ...input, userId: user.id, position })
      .returning(columns);
    if (!row) throw new Error("Insert returned no row");
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

    const [row] = await tx
      .update(applications)
      .set({ ...input, ...(position ? { position } : {}) })
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .returning(columns);
    return row ?? null;
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

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function listByUser(db: Database, userId: string): Promise<Application[]> {
  return db
    .select(columns)
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(asc(applications.status), asc(applications.position));
}

async function firstPosition(tx: Tx, userId: string, status: Application["status"]) {
  const [first] = await tx
    .select({ position: applications.position })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.status, status)))
    .orderBy(asc(applications.position))
    .limit(1);
  return first?.position ?? null;
}
