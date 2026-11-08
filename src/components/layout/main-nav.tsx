"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/board", label: "Kartoteka" },
  { href: "/profile", label: "Profil" },
] as const;

/** Main navigation; the current page is underlined and announced (aria-current). */
export function MainNav() {
  return (
    // usePathname is request data: the plain links render first, the current page streams in.
    <Suspense fallback={<Links pathname={null} />}>
      <CurrentLinks />
    </Suspense>
  );
}

function CurrentLinks() {
  return <Links pathname={usePathname()} />;
}

function Links({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Główna" className="flex gap-4 text-sm">
      {LINKS.map(({ href, label }) => {
        const current = pathname != null && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "font-semibold underline-offset-[5px] hover:underline",
              current ? "underline decoration-2" : "text-muted-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
