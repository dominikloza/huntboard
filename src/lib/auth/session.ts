import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "./server";

/** The narrow user object the UI is allowed to see (no email, no tokens). */
export type CurrentUser = {
  id: string;
  name: string;
  image: string | null;
  isGuest: boolean;
};

async function readSessionUser(): Promise<CurrentUser | null> {
  // Read the request first: nothing before it may run during prerendering.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    image: user.image ?? null,
    isGuest: user.isAnonymous === true,
  };
}

/**
 * For Server Components. `use cache: private` dedupes the lookup within a request and lets the
 * client router reuse it for prefetched navigations (never stored on the server).
 * Always call it inside a <Suspense> boundary (Cache Components).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  "use cache: private";
  return readSessionUser();
}

/** Server Components: the Data Access Layer entry point. Redirects to /login without a session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Server Actions and Route Handlers: always re-reads the session (no cache), throws instead of
 * redirecting so the caller can answer with 401 or a form error.
 */
export async function requireSessionUser(): Promise<CurrentUser> {
  const user = await readSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
