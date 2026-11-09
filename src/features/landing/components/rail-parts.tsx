import { type ReactNode } from "react";

import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  STATUS_LABELS,
} from "@/features/board/constants";
import { OfferCard } from "@/features/board/components/offer-card";
import { type ApplicationCard } from "@/features/board/types";
import { cn } from "@/lib/utils";

/** The card the rail moves: the real board component with sample data. */
const CARD: ApplicationCard = {
  id: "landing-demo",
  status: "saved",
  company: "Kreska Software",
  role: "Frontend Developer (React)",
  seniority: "Mid",
  salaryMin: 16000,
  salaryMax: 22000,
  workMode: "hybrid",
  city: "Wrocław",
  stack: ["React", "TypeScript", "Next.js"],
  matchScore: 82,
};

/** Where the card stops while the page scrolls, with the stamp it gets in each column. */
export const STOPS = [
  { status: "saved", stamp: undefined },
  { status: "applied", stamp: "Wysłano 03.11" },
  { status: "interview", stamp: "Rozmowa 12.11" },
  { status: "offer", stamp: "Oferta 20.11" },
] as const satisfies readonly { status: ApplicationStatus; stamp: string | undefined }[];

/** Scroll progress (0-1) through the rail -> index of the stop. */
export function stopAt(progress: number): number {
  return Math.min(STOPS.length - 1, Math.max(0, Math.floor(progress * STOPS.length)));
}

export function RailCard({ stamp, lifted = false }: { stamp?: string; lifted?: boolean }) {
  return (
    <OfferCard
      application={{ ...CARD, stamp }}
      className={cn(
        "border-[1.5px] border-ink transition-shadow duration-200",
        lifted ? "shadow-hard" : "shadow-sheet",
      )}
    />
  );
}

/** The five folder columns; `card` is drawn in the column of `status`. */
export function RailColumns({ status, card }: { status: ApplicationStatus; card: ReactNode }) {
  return (
    <div aria-hidden className="grid gap-3 sm:grid-cols-5">
      {APPLICATION_STATUSES.map((column) => {
        const here = column === status;
        return (
          <div key={column} className="flex flex-col">
            <span
              className={cn(
                "inline-flex self-start rounded-t-tab border-[1.5px] border-b-0 border-ink px-3.5 py-1.5 text-sm font-semibold transition-colors duration-300",
                here ? "bg-primary-soft" : "bg-card",
              )}
            >
              {STATUS_LABELS[column]}
            </span>
            <div className="h-36 border-[1.5px] border-ink bg-folder p-2.5 sm:h-48">
              {here && card}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Server-rendered first frame (and the whole thing without JavaScript). */
export function StaticRail() {
  return (
    <RailColumns
      status="saved"
      card={
        <div className="relative z-10 -rotate-1">
          <RailCard />
        </div>
      }
    />
  );
}
