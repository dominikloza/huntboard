/**
 * Only same-site relative paths are allowed as a post-login target.
 * Blocks open redirects like "//evil.com" or "https://evil.com".
 */
export function safeRedirectPath(next: unknown, fallback = "/board"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
