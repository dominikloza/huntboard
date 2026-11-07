import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { Stamp } from "@/components/paper/stamp";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[1400px] flex-col items-start gap-5 px-4 py-16 sm:px-7 sm:py-24">
        <Stamp>Brak w aktach</Stamp>
        <h1 className="font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
          Nie ma takiej teczki
        </h1>
        <p className="max-w-[52ch] text-muted-foreground">
          Ta strona nie istnieje albo należy do innej kartoteki.
        </p>
        <Button asChild>
          <Link href="/board">Wróć do kartoteki</Link>
        </Button>
      </main>
    </>
  );
}
