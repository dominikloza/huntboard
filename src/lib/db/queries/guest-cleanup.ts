import "server-only";

import { and, eq, gt, lt, notExists, sql } from "drizzle-orm";

import { getDb } from "../client";
import { session, user } from "../schema";

/**
 * Deletes guest accounts nobody can come back to: anonymous users created before `cutoff` with
 * no session that is still valid or expired after `cutoff`. Their cards, notes, profile and AI
 * usage go with them (ON DELETE CASCADE).
 *
 * A system job, so it does not take a user from the session (the one exception to the
 * "every query takes userId from the session" rule): the Route Handler that calls it checks
 * CRON_SECRET instead. Returns how many accounts were deleted.
 */
export async function deleteStaleGuests(cutoff: Date): Promise<number> {
  const deleted = await getDb()
    .delete(user)
    .where(
      and(
        eq(user.isAnonymous, true),
        lt(user.createdAt, cutoff),
        notExists(
          getDb()
            .select({ one: sql`1` })
            .from(session)
            .where(and(eq(session.userId, user.id), gt(session.expiresAt, cutoff))),
        ),
      ),
    )
    .returning({ id: user.id });
  return deleted.length;
}
