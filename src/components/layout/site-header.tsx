import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center gap-5 border-b-2 border-ink px-4 py-3 sm:px-7">
      <Link
        href="/"
        className="font-display text-[22px] font-extrabold tracking-[-0.03em] text-foreground"
      >
        Huntboard
      </Link>
      <nav aria-label="Główna" className="flex gap-4 text-sm">
        <Link
          href="/styleguide"
          className="text-muted-foreground underline-offset-[5px] hover:text-foreground hover:underline"
        >
          Styleguide
        </Link>
      </nav>
      <ThemeToggle className="ml-auto" />
    </header>
  );
}
