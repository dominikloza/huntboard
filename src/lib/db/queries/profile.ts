import "server-only";

import { eq } from "drizzle-orm";
import { connection } from "next/server";

import { type MatchProfile, scoreMatch } from "@/features/match/lib/score";
import { type ProfileInput } from "@/features/profile/schemas";
import { requireSessionUser, requireUser } from "@/lib/auth/session";

import { type Database, getDb } from "../client";
import { applications, profiles } from "../schema";

export type Profile = MatchProfile & { bio: string | null };

const columns = {
  skills: profiles.skills,
  yearsExperience: profiles.yearsExperience,
  salaryMin: profiles.salaryMin,
  remotePreference: profiles.remotePreference,
  bio: profiles.bio,
};

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** The profile of a user, or null if they never saved one. Used inside other queries. */
export async function profileOf(db: Database | Tx, userId: string): Promise<Profile | null> {
  const [row] = await db.select(columns).from(profiles).where(eq(profiles.userId, userId));
  return row ?? null;
}

/** Server Components: the signed-in user's profile. */
export async function getProfile(): Promise<Profile | null> {
  const user = await requireUser();
  await connection();
  return profileOf(getDb(), user.id);
}

/**
 * Saves the profile and recomputes the match score of every card of the user in the same
 * transaction: the board never shows scores computed from an older profile.
 */
export async function saveProfileForSession(
  input: ProfileInput,
): Promise<{ profile: Profile; rescored: number }> {
  const user = await requireSessionUser();
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(profiles)
      .values({ userId: user.id, ...input })
      .onConflictDoUpdate({ target: profiles.userId, set: input })
      .returning(columns);
    if (!row) throw new Error("Upsert returned no row");

    const cards = await tx
      .select({
        id: applications.id,
        stack: applications.stack,
        salaryMin: applications.salaryMin,
        salaryMax: applications.salaryMax,
        workMode: applications.workMode,
        seniority: applications.seniority,
        matchScore: applications.matchScore,
      })
      .from(applications)
      .where(eq(applications.userId, user.id));

    let rescored = 0;
    for (const card of cards) {
      const score = scoreMatch(row, card)?.score ?? null;
      if (score === card.matchScore) continue;
      // The score is derived data: the card's version (used for move conflicts) stays the same.
      await tx.update(applications).set({ matchScore: score }).where(eq(applications.id, card.id));
      rescored += 1;
    }
    return { profile: row, rescored };
  });
}
