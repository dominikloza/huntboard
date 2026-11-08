/**
 * node-postgres currently treats sslmode=prefer|require|verify-ca as verify-full and logs a
 * SECURITY WARNING on every cold start saying so (the meaning changes in its next major).
 * Saying verify-full explicitly keeps today's behaviour and silences the warning.
 *
 * Only for the app's pool: migrations (drizzle-kit) keep the URL as written.
 */
export function withExplicitSslMode(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }
  const mode = url.searchParams.get("sslmode");
  if (!mode || !["prefer", "require", "verify-ca"].includes(mode)) return connectionString;
  if (url.searchParams.has("uselibpqcompat")) return connectionString;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
