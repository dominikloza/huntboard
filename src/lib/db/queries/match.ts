import "server-only";

import { and, eq } from "drizzle-orm";

import { type MatchTone, type StoredMatchComment } from "@/features/match/schemas";
import { requireSessionUser } from "@/lib/auth/session";

import { getDb } from "../client";
import { applications } from "../schema";

import { type Profile, profileOf } from "./profile";

export type MatchContext = {
  offer: {
    company: string;
    role: string;
    seniority: string | null;
    workMode: "remote" | "hybrid" | "office";
    city: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    stack: string[];
    rawOffer: string | null;
  };
  profile: Profile | null;
  /** Saves the finished comment on this card (bound to the session user; runs in `after`). */
  save: (tone: MatchTone, comment: StoredMatchComment) => Promise<void>;
};

/** The offer fields every AI feature reads (match comments, interview questions). */
export const OFFER_COLUMNS = {
  company: applications.company,
  role: applications.role,
  seniority: applications.seniority,
  workMode: applications.workMode,
  city: applications.city,
  salaryMin: applications.salaryMin,
  salaryMax: applications.salaryMax,
  stack: applications.stack,
  rawOffer: applications.rawOffer,
};

/** Everything an AI comment needs about one card. Null for unknown or foreign cards. */
export async function getMatchContextForSession(
  applicationId: string,
): Promise<MatchContext | null> {
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
    save: async (tone, comment) => {
      await db
        .update(applications)
        .set(tone === "roast" ? { roastComment: comment } : { matchComment: comment })
        .where(own);
    },
  };
}
