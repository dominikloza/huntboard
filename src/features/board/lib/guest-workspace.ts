import { generateNKeysBetween } from "fractional-indexing";

import { APPLICATION_STATUSES, type ApplicationStatus } from "../constants";

import { scoreMatch } from "../../match/lib/score";

import { DEMO_APPLICATIONS } from "./demo-data";

import {
  type ApplicationEventRow,
  type NewApplicationRow,
  type NewProfileRow,
} from "@/lib/db/schema";

/**
 * Rows inserted for a new guest, so the demo board is not empty.
 * Pure function: easy to test, no database access.
 */
export function buildGuestApplications(userId: string, now = new Date()): NewApplicationRow[] {
  return APPLICATION_STATUSES.flatMap((status) => {
    const items = DEMO_APPLICATIONS.filter((a) => a.status === status);
    const positions = generateNKeysBetween(null, null, items.length);
    return items.map(({ id: _demoId, stamp: _stamp, matchScore: _shown, ...rest }, index) => ({
      ...rest,
      userId,
      position: positions[index] ?? "a0",
      // Same formula as for real cards (the styleguide numbers are only for show).
      matchScore: scoreMatch(GUEST_PROFILE, rest)?.score ?? null,
      // The card was created when its history starts, so the statistics add up.
      createdAt: daysBefore(now, GUEST_HISTORY[rest.company]?.[0]?.daysAgo ?? 0),
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

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBefore = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);

/**
 * Stage history of the demo cards (days before the guest signed in), so the statistics page
 * shows a believable search: 5 sent, 2 interviews, answers after 8-9 days, one offer waiting
 * for an answer for over two weeks. The last entry is always the card's current stage.
 */
export const GUEST_HISTORY: Record<string, { status: ApplicationStatus; daysAgo: number }[]> = {
  "Polana Health": [{ status: "saved", daysAgo: 2 }],
  "Mewa Fintech": [{ status: "saved", daysAgo: 5 }],
  "Kropla Software": [
    { status: "saved", daysAgo: 9 },
    { status: "applied", daysAgo: 6 },
  ],
  "Szlak Logistics": [
    { status: "saved", daysAgo: 20 },
    { status: "applied", daysAgo: 16 },
  ],
  "Tartak Studio": [{ status: "applied", daysAgo: 3 }],
  "Brzeg Labs": [
    { status: "saved", daysAgo: 30 },
    { status: "applied", daysAgo: 22 },
    { status: "interview", daysAgo: 13 },
  ],
  "Wiór Games": [
    { status: "applied", daysAgo: 28 },
    { status: "interview", daysAgo: 20 },
    { status: "rejected", daysAgo: 9 },
  ],
};

/** History rows for the guest's freshly inserted cards (matched by company). */
export function buildGuestHistory(
  cards: { id: string; company: string }[],
  userId: string,
  now = new Date(),
): Omit<ApplicationEventRow, "id">[] {
  return cards.flatMap((card) =>
    (GUEST_HISTORY[card.company] ?? []).map(({ status, daysAgo }) => ({
      applicationId: card.id,
      userId,
      status,
      createdAt: daysBefore(now, daysAgo),
    })),
  );
}
