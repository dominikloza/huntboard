import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { SignInButtons } from "@/features/auth/components/sign-in-buttons";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Logowanie" };

async function RedirectIfSignedIn() {
  const user = await getCurrentUser();
  if (user) redirect("/board");
  return null;
}

/** Streams in after the form; without JS the form still works and falls back to /board. */
async function NextField({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return typeof next === "string" ? <input type="hidden" name="next" value={next} /> : null;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[1400px] flex-col items-start gap-5 px-4 py-16 sm:px-7 sm:py-24">
        <h1 className="font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
          Wejdź do kartoteki
        </h1>
        <p className="max-w-[52ch] text-muted-foreground">
          Konto gościa ma przykładowe aplikacje, żebyś od razu zobaczył, jak to działa. Jeśli potem
          zalogujesz się przez GitHub, Twoja tablica przejdzie na to konto.
        </p>
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <SignInButtons
          hiddenFields={
            <Suspense fallback={null}>
              <NextField searchParams={searchParams} />
            </Suspense>
          }
        />
      </main>
    </>
  );
}
