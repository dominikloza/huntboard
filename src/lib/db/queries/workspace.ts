import "server-only";

import { eq } from "drizzle-orm";

import { buildGuestApplications, GUEST_PROFILE } from "@/features/board/lib/guest-workspace";

import { type Database } from "../client";
import { aiUsage, applications, notes, profiles } from "../schema";

/*
 * Workspace lifecycle, called only from Better Auth hooks (src/lib/auth/server.ts).
 * The userId here comes from Better Auth itself, never from client input.
 */

/** Fills a new guest account with demo data. */
export async function seedGuestWorkspace(db: Database, userId: string) {
  await db.transaction(async (tx) => {
    await tx
      .insert(profiles)
      .values({ userId, ...GUEST_PROFILE })
      .onConflictDoNothing();
    await tx.insert(applications).values(buildGuestApplications(userId));
  });
}

/**
 * A guest signed in with GitHub: keep their board. Moves cards, notes and usage to the real
 * account. The guest profile is moved only if the real account has none yet.
 */
export async function moveWorkspace(db: Database, fromUserId: string, toUserId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(applications)
      .set({ userId: toUserId })
      .where(eq(applications.userId, fromUserId));
    await tx.update(notes).set({ userId: toUserId }).where(eq(notes.userId, fromUserId));
    await tx.update(aiUsage).set({ userId: toUserId }).where(eq(aiUsage.userId, fromUserId));

    const existing = await tx.query.profiles.findFirst({ where: eq(profiles.userId, toUserId) });
    if (!existing) {
      await tx.update(profiles).set({ userId: toUserId }).where(eq(profiles.userId, fromUserId));
    }
  });
}
