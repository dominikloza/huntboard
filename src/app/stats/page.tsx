import { type Metadata } from "next";
import { Suspense } from "react";

import { StatsView } from "@/features/stats/components/stats-view";
import { computeStats } from "@/features/stats/lib/stats";
import { getStatsDataForSession } from "@/lib/db/queries/stats";

export const metadata: Metadata = { title: "Statystyki" };

async function StatsLoader() {
  const { cards, events } = await getStatsDataForSession();
  return <StatsView stats={computeStats(cards, events, new Date())} />;
}

/** Shaped like the summary strip and the two panels, so nothing jumps when data arrives. */
function StatsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-12">
      <div className="grid h-28 grid-cols-2 border-y-[1.5px] border-ink sm:grid-cols-4" />
      <div className="grid gap-12 lg:grid-cols-[7fr_5fr]">
        <div className="flex flex-col gap-4">
          {[100, 70, 30, 10].map((width) => (
            <div
              key={width}
              className="h-6 animate-pulse bg-folder"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div className="h-32 animate-pulse bg-folder" />
      </div>
    </div>
  );
}

export default function StatsPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-7">
      <h1 className="mb-2 font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
        Statystyki
      </h1>
      <p className="mb-10 max-w-[60ch] text-muted-foreground">
        Jak idą Twoje poszukiwania: ile ofert dochodzi do rozmowy, po ilu dniach przychodzi
        odpowiedź i gdzie warto się przypomnieć.
      </p>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsLoader />
      </Suspense>
    </main>
  );
}
