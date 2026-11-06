import { Stamp } from "@/components/paper/stamp";
import { formatSalaryRange } from "@/lib/format";
import { cn } from "@/lib/utils";

import { formatWorkMode } from "../lib/work-mode";
import { type Application } from "../types";

import { MatchBadge } from "./match-badge";

type OfferCardProps = {
  application: Application;
  className?: string;
};

/**
 * One application as a perforated sheet of paper.
 * Drag & drop and the details link are added on Day 3/4.
 */
export function OfferCard({ application, className }: OfferCardProps) {
  const { company, role, salaryMin, salaryMax, matchScore, stamp } = application;

  return (
    <article
      className={cn(
        // 2px dashed top edge = the perforation of a tear-off sheet
        "relative border border-t-2 [border-top-style:dashed] border-border border-t-muted-foreground/40 bg-card px-3 pt-3 pb-2.5 shadow-sheet",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">{company}</p>
      <h3 className="mt-0.5 mb-2 pr-9 font-display text-[15px] leading-tight font-bold tracking-tight">
        {role}
      </h3>
      <div className="flex items-center justify-between border-t border-border/60 pt-1.5 font-mono text-xs">
        <span>{formatSalaryRange(salaryMin, salaryMax, { compact: true })}</span>
        <span className="text-muted-foreground">{formatWorkMode(application)}</span>
      </div>
      {matchScore != null && (
        <MatchBadge score={matchScore} className="absolute top-2.5 right-2.5" />
      )}
      {stamp && <Stamp className="mt-2">{stamp}</Stamp>}
    </article>
  );
}
