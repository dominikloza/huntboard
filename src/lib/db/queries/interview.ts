import "server-only";

import { and, eq } from "drizzle-orm";

import { type StoredInterviewQuestions } from "@/features/interview/schemas";
import { requireSessionUser } from "@/lib/auth/session";

import { getDb } from "../client";
import { applications } from "../schema";

import { type MatchContext, OFFER_COLUMNS } from "./match";
import { type Profile, profileOf } from "./profile";

export type QuestionsContext = {
  offer: MatchContext["offer"];
  profile: Profile | null;
  /** Saves the finished set on this card (bound to the session user; runs in `after`). */
  save: (questions: StoredInterviewQuestions) => Promise<void>;
};

/** What interview questions need about one card. Null for unknown or foreign cards. */
export async function getQuestionsContextForSession(
  applicationId: string,
): Promise<QuestionsContext | null> {
  const user = await requireSessionUser();
  const db = getDb();
  const own = and(eq(applications.id, applicationId), eq(applications.userId, user.id));
  const [[offer], profile] = await Promise.all([
    db.select(OFFER_COLUMNS).from(applications).where(own).limit(1),
    profileOf(db, user.id),
  ]);
  if (!offer) return null;

  return {
    offer,
    profile,
    save: async (questions) => {
      await db.update(applications).set({ interviewQuestions: questions }).where(own);
    },
  };
}
