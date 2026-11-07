import "server-only";

import { asc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { requireUser } from "@/lib/auth/session";

import { getDb } from "../client";
import { applications } from "../schema";

import { type Application } from "@/features/board/types";

/** Cards of the signed-in user, ordered for the board. The user always comes from the session. */
export async function getBoardApplications(): Promise<Application[]> {
  const user = await requireUser();
  // The session read above is a private cache, so Next.js may still treat what follows as
  // prerendering. Opening a Postgres connection (SCRAM auth) uses crypto randomness, which is not
  // allowed there. Mark the database read as request-time explicitly.
  await connection();
  return listApplicationsByUser(user.id);
}

// Not exported: callers cannot ask for another user's cards (IDOR protection).
async function listApplicationsByUser(userId: string): Promise<Application[]> {
  return getDb()
    .select({
      id: applications.id,
      status: applications.status,
      company: applications.company,
      role: applications.role,
      salaryMin: applications.salaryMin,
      salaryMax: applications.salaryMax,
      workMode: applications.workMode,
      city: applications.city,
      stack: applications.stack,
      matchScore: applications.matchScore,
    })
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(asc(applications.status), asc(applications.position));
}
