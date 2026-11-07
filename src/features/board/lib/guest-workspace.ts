import { generateNKeysBetween } from "fractional-indexing";

import { APPLICATION_STATUSES } from "../constants";

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
    return items.map(({ id: _demoId, stamp: _stamp, ...rest }, index) => ({
      ...rest,
      userId,
      position: positions[index] ?? "a0",
    }));
  });
}

export const GUEST_PROFILE = {
  yearsExperience: 2,
  skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
  salaryMin: 18000,
  remotePreference: "remote",
  bio: "Konto demonstracyjne Huntboard.",
} satisfies Omit<NewProfileRow, "userId">;
