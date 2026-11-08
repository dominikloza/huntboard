import { createHash, timingSafeEqual } from "node:crypto";

/** Guest accounts are kept this long after their last session expired (ADR 013). */
export const GUEST_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Without a configured secret nothing
 * is authorized: an unset variable must not turn the endpoint into a public delete button.
 * Hashing both sides first makes the comparison constant-time for any length.
 */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/** Sessions that expired before this moment belong to guests nobody will come back as. */
export function staleGuestCutoff(now: Date, days = GUEST_RETENTION_DAYS): Date {
  return new Date(now.getTime() - days * DAY_MS);
}
