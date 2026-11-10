import { type AiUsageKind } from "@/features/board/constants";

/** Hourly AI calls per user and kind. Guests get less: they need no account to start. */
export type AiLimits = { guestPerHour: number; memberPerHour: number; dailyBudget: number };

const positiveInt = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/**
 * Defaults fit a free Gemini tier with a few recruiters clicking around. Overridable per
 * environment (e2e uses tiny limits to test the 429 path quickly).
 */
export function aiLimits(env: Record<string, string | undefined> = process.env): AiLimits {
  return {
    guestPerHour: positiveInt(env.AI_LIMIT_GUEST_PER_HOUR, 10),
    memberPerHour: positiveInt(env.AI_LIMIT_MEMBER_PER_HOUR, 30),
    // All users together, per day: a hard ceiling on the bill (or the free quota).
    dailyBudget: positiveInt(env.AI_DAILY_BUDGET, 300),
  };
}

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export type QuotaInput = {
  /** Calls of this user and kind in the last hour, oldest first. */
  userCalls: Date[];
  /** Calls of everyone in the last 24 hours, oldest first (for the daily budget). */
  allCalls: { count: number; oldest: Date | null };
  isGuest: boolean;
  limits: AiLimits;
  now: Date;
};

export type QuotaDecision =
  { ok: true } | { ok: false; reason: "user" | "budget"; limit: number; retryAfterSeconds: number };

/** Sliding windows: a slot frees up exactly one hour (or day) after the call that used it. */
export function checkQuota({
  userCalls,
  allCalls,
  isGuest,
  limits,
  now,
}: QuotaInput): QuotaDecision {
  const userLimit = isGuest ? limits.guestPerHour : limits.memberPerHour;
  if (userCalls.length >= userLimit) {
    // The call that has to leave the window before a new one fits.
    const blocking = userCalls[userCalls.length - userLimit] ?? now;
    return {
      ok: false,
      reason: "user",
      limit: userLimit,
      retryAfterSeconds: secondsUntil(blocking.getTime() + HOUR_MS, now),
    };
  }
  if (allCalls.count >= limits.dailyBudget) {
    return {
      ok: false,
      reason: "budget",
      limit: limits.dailyBudget,
      retryAfterSeconds: secondsUntil((allCalls.oldest ?? now).getTime() + DAY_MS, now),
    };
  }
  return { ok: true };
}

function secondsUntil(timestamp: number, now: Date) {
  return Math.max(1, Math.ceil((timestamp - now.getTime()) / 1000));
}

const KIND_LABEL: Record<AiUsageKind, string> = {
  extract: "wypełnień z AI",
  match: "ocen dopasowania",
  roast: "roastów",
  questions: "zestawów pytań",
};

/** "Następne za 23 min." in Polish, rounded up so it never says "0 min". */
export function quotaMessage(
  decision: Extract<QuotaDecision, { ok: false }>,
  kind: AiUsageKind,
  isGuest: boolean,
): string {
  const minutes = Math.ceil(decision.retryAfterSeconds / 60);
  const wait = minutes >= 90 ? `${Math.ceil(minutes / 60)} godz.` : `${minutes} min`;
  if (decision.reason === "budget") {
    return kind === "extract"
      ? `AI ma na dziś wyczerpany limit dla wszystkich użytkowników. Spróbuj za ${wait} albo wpisz dane ręcznie.`
      : `AI ma na dziś wyczerpany limit dla wszystkich użytkowników. Spróbuj za ${wait}.`;
  }
  const who = isGuest ? " na koncie gościa (zaloguj się przez GitHub, żeby mieć więcej)" : "";
  // Only the offer form has a manual way around the AI.
  const manual = kind === "extract" ? " Możesz też wpisać dane ręcznie." : "";
  return `Limit: ${decision.limit} ${KIND_LABEL[kind]} na godzinę${who}. Następne za ${wait}.${manual}`;
}
