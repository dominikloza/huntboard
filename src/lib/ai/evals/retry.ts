/* Helpers for running many model calls on a rate-limited (free tier) provider. */

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts calls at least `intervalMs` apart, however many run in parallel. */
export function createPacer(intervalMs: number) {
  let next = 0;
  return async () => {
    const now = Date.now();
    const at = Math.max(now, next);
    next = at + intervalMs;
    if (at > now) await sleep(at - now);
  };
}

/** The provider error inside whatever the SDK threw (retry wrappers, stream errors). */
export function providerDetails(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  const visit = (e: unknown) => {
    if (!e || typeof e !== "object" || seen.has(e)) return;
    seen.add(e);
    const record = e as Record<string, unknown>;
    for (const key of ["message", "responseBody", "statusCode"]) {
      if (record[key] != null) parts.push(String(record[key]));
    }
    for (const key of ["cause", "lastError", "data"]) visit(record[key]);
    if (Array.isArray(record.errors)) record.errors.forEach(visit);
  };
  visit(error);
  return parts.join("\n");
}

/** Temporary provider trouble (rate limit, overload) is retried, not scored as a failure. */
export function retryAfterMs(error: unknown): number | null {
  const details = providerDetails(error);
  if (!/\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded/i.test(details)) {
    return null;
  }
  const seconds = /retry in ([\d.]+)s/i.exec(details)?.[1];
  return seconds ? Math.ceil(Number(seconds) * 1000) + 1000 : 20_000;
}
