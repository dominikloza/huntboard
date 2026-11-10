/**
 * Domain constants shared by the database schema, Zod schemas and UI.
 * No server imports here: this file is safe to use in Client Components.
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

export const WORK_MODES = ["remote", "hybrid", "office"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const REMOTE_PREFERENCES = ["remote", "hybrid", "office", "any"] as const;
export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];

export const AI_USAGE_KINDS = ["extract", "match", "roast", "questions"] as const;
export type AiUsageKind = (typeof AI_USAGE_KINDS)[number];

/** Pasted job offer text: long enough to extract from, short enough to keep AI cost bounded. */
export const OFFER_MIN_LENGTH = 80;
export const OFFER_MAX_LENGTH = 12_000;
export const MAX_RED_FLAGS = 5;
