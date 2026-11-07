type UrlEnv = {
  BETTER_AUTH_URL?: string | undefined;
  VERCEL_ENV?: string | undefined;
  VERCEL_URL?: string | undefined;
  VERCEL_BRANCH_URL?: string | undefined;
  VERCEL_PROJECT_PRODUCTION_URL?: string | undefined;
};

const https = (host: string | undefined) => (host ? `https://${host}` : undefined);

/**
 * Where Better Auth lives and which origins may call it.
 * - Local / production: BETTER_AUTH_URL (explicit).
 * - Vercel previews: no BETTER_AUTH_URL set, so use the deployment URL; both the per-deployment
 *   and the per-branch preview URLs are trusted (each preview has two addresses).
 */
export function resolveAuthUrls(env: UrlEnv): { baseURL: string; trustedOrigins: string[] } {
  const isPreview = env.VERCEL_ENV === "preview";
  const baseURL =
    (isPreview ? undefined : env.BETTER_AUTH_URL) ??
    https(env.VERCEL_URL) ??
    env.BETTER_AUTH_URL ??
    https(env.VERCEL_PROJECT_PRODUCTION_URL);

  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL is missing (e.g. http://localhost:3000). See .env.example.");
  }

  const trustedOrigins = [
    baseURL,
    https(env.VERCEL_URL),
    https(env.VERCEL_BRANCH_URL),
    https(env.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter((origin): origin is string => Boolean(origin));

  return { baseURL: new URL(baseURL).origin, trustedOrigins: [...new Set(trustedOrigins)] };
}
