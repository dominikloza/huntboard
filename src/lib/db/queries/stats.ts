import "server-only";

import { eq } from "drizzle-orm";
import { connection } from "next/server";

import { type StatsCard, type StatsEvent } from "@/features/stats/lib/stats";
import { requireUser } from "@/lib/auth/session";

import { getDb } from "../client";
import { applicationEvents, applications } from "../schema";

/** Everything the statistics page needs: the user's cards and their stage history. */
export async function getStatsDataForSession(): Promise<{
  cards: StatsCard[];
  events: StatsEvent[];
}> {
  const user = await requireUser();
  await connection();
  const db = getDb();
  const [cards, events] = await Promise.all([
    db
      .select({
        id: applications.id,
        company: applications.company,
        role: applications.role,
        status: applications.status,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .where(eq(applications.userId, user.id)),
    db
      .select({
        applicationId: applicationEvents.applicationId,
        status: applicationEvents.status,
        createdAt: applicationEvents.createdAt,
      })
      .from(applicationEvents)
      .where(eq(applicationEvents.userId, user.id)),
  ]);
  return { cards, events };
}
