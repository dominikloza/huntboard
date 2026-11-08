import { generateNKeysBetween } from "fractional-indexing";

import { APPLICATION_STATUSES } from "../constants";

import { scoreMatch } from "../../match/lib/score";

import { DEMO_APPLICATIONS } from "./demo-data";

import { type NewApplicationRow, type NewProfileRow } from "@/lib/db/schema";

/**
 * Rows inserted for a new guest, so the demo board is not empty.
 * Pure function: easy to test, no database access.
 */
export function buildGuestApplications(userId: string): NewApplicationRow[] {
  return APPLICATION_STATUSES.flatMap((status) => {
    const items = DEMO_APPLICATIONS.filter((a) => a.status === status);
    const positions = generateNKeysBetween(null, null, items.length);
    return items.map(({ id: _demoId, stamp: _stamp, matchScore: _shown, ...rest }, index) => ({
      ...rest,
      userId,
      position: positions[index] ?? "a0",
      // Same formula as for real cards (the styleguide numbers are only for show).
      matchScore: scoreMatch(GUEST_PROFILE, rest)?.score ?? null,
    }));
  });
}

export const GUEST_PROFILE = {
  yearsExperience: 2,
  skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Jest"],
  salaryMin: 16000,
  remotePreference: "hybrid",
  bio: "Konto demonstracyjne Huntboard.",
} satisfies Omit<NewProfileRow, "userId">;
