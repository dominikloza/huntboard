"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { getAuth } from "@/lib/auth/server";

export type SignInState = { error: string | null };

/**
 * Server Actions instead of client-side SDK calls: the forms work before JavaScript loads
 * (progressive enhancement) and auth cookies are set by the server (nextCookies plugin).
 */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const method = formData.get("method");
  const next = safeRedirectPath(formData.get("next"));

  if (method === "guest") {
    const requestHeaders = await headers();
    // Already signed in (e.g. the login form was open in another tab, or a session from an
    // earlier visit): Better Auth refuses a second anonymous sign-in, so just continue.
    const session = await getAuth().api.getSession({ headers: requestHeaders });
    if (session) redirect(next);
    try {
      await getAuth().api.signInAnonymous({ headers: requestHeaders });
    } catch (error) {
      console.error("Guest sign-in failed", error);
      return { error: "Nie udało się otworzyć konta gościa. Spróbuj ponownie." };
    }
    redirect(next);
  }

  if (method === "github") {
    let url: string | undefined;
    try {
      const result = await getAuth().api.signInSocial({
        body: { provider: "github", callbackURL: next },
        headers: await headers(),
      });
      url = result.url;
    } catch (error) {
      console.error("GitHub sign-in failed", error);
    }
    if (!url) return { error: "Nie udało się połączyć z GitHubem. Spróbuj ponownie." };
    redirect(url);
  }

  return { error: "Nieznana metoda logowania." };
}

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}
