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

/**
 * Reads the session at request time. `use cache: private` dedupes the lookup within a request
 * and lets the client router reuse it for prefetched navigations (never stored on the server).
 * Always call it inside a <Suspense> boundary (Cache Components).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  "use cache: private";

  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;

  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    image: user.image ?? null,
    isGuest: user.isAnonymous === true,
  };
}

/** Data Access Layer entry point: every protected read and mutation starts here. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
