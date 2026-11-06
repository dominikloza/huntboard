import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { Stamp } from "@/components/paper/stamp";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[1400px] flex-col items-start gap-6 px-4 py-16 sm:px-7 sm:py-24">
        <Stamp>W budowie</Stamp>
        <h1 className="max-w-[16ch] font-display text-5xl leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-6xl">
          Kartoteka Twoich rekrutacji.
        </h1>
        <p className="max-w-[48ch] text-lg text-muted-foreground">
          Wklejasz ofertę, AI ją rozpisuje, Ty decydujesz. Bez arkusza w Excelu.
        </p>
        <Button asChild>
          <Link href="/styleguide">Zobacz styleguide</Link>
        </Button>
      </main>
    </>
  );
}
