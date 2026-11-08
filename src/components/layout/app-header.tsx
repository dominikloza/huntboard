import Link from "next/link";
import { Suspense } from "react";

import { Stamp } from "@/components/paper/stamp";
import { ThemeToggle } from "@/components/theme-toggle";
import { MainNav } from "@/components/layout/main-nav";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/lib/auth/session";

async function UserBadge() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3">
      {user.isGuest ? (
        <Stamp title="Konto gościa z przykładowymi danymi">Gość</Stamp>
      ) : (
        <span className="text-sm font-medium">{user.name}</span>
      )}
      <SignOutButton isGuest={user.isGuest} />
    </div>
  );
}

/** Header for signed-in pages. The user part streams in; the rest is static. */
export function AppHeader() {
  return (
    <header className="flex flex-wrap items-center gap-5 border-b-2 border-ink px-4 py-3 sm:px-7">
      <Link href="/board" className="font-display text-[22px] font-extrabold tracking-[-0.03em]">
        Huntboard
      </Link>
      <MainNav />
      <div className="ml-auto flex items-center gap-4">
        <Suspense fallback={<div className="h-8 w-32" aria-hidden />}>
          <UserBadge />
        </Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
