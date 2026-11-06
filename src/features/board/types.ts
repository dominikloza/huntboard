/**
 * Temporary hand-written types. On Day 1 these are replaced by types inferred
 * from the Zod schemas / Drizzle tables (single source of truth, see PLAN.md §4).
 */
export const APPLICATION_STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Zapisane",
  applied: "Wysłane",
  interview: "Rozmowa",
  offer: "Oferta",
  rejected: "Odrzucone",
};

export type WorkMode = "remote" | "hybrid" | "office";

export type Application = {
  id: string;
  status: ApplicationStatus;
  company: string;
  role: string;
  salaryMin: number | null;
  salaryMax: number | null;
  workMode: WorkMode;
  city: string | null;
  stack: string[];
  matchScore: number | null;
  /** Short stamp text, e.g. "Wysłano 04.11". Only when it carries information. */
  stamp?: string;
};
