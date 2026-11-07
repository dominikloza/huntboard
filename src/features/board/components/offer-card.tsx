import Link from "next/link";
import { type ReactNode } from "react";

import { Stamp } from "@/components/paper/stamp";
import { formatSalaryRange } from "@/lib/format";
import { cn } from "@/lib/utils";

import { formatWorkMode } from "../lib/work-mode";
import { type ApplicationCard } from "../types";

import { MatchBadge } from "./match-badge";

type OfferCardProps = {
  application: ApplicationCard;
  /** Opens the card. The whole sheet is clickable; the link itself sits on the role heading. */
  href?: string;
  /** Drag handle (keyboard and screen reader entry point for moving the card). */
  handle?: ReactNode;
  className?: string;
};

/** One application as a perforated sheet of paper. */
export function OfferCard({ application, href, handle, className }: OfferCardProps) {
  const { company, role, salaryMin, salaryMax, matchScore, stamp } = application;

  return (
    <article
      className={cn(
        // 2px dashed top edge = the perforation of a tear-off sheet
        "relative border border-t-2 [border-top-style:dashed] border-border border-t-muted-foreground/40 bg-card px-3 pt-3 pb-2.5 shadow-sheet",
        href &&
          "transition-[translate] duration-100 focus-within:-translate-y-px hover:-translate-y-px",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        {handle}
        <p className="text-xs text-muted-foreground">{company}</p>
      </div>
      <h3 className="mt-0.5 mb-2 pr-9 font-display text-[15px] leading-tight font-bold tracking-tight">
        {href ? (
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary-ink"
          >
            {role}
          </Link>
        ) : (
          role
        )}
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
