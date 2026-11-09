import { type ReactNode } from "react";

import { MATCH_PART_LABELS, MATCH_WEIGHTS, type MatchPartKey } from "@/features/match/lib/score";
import { cn } from "@/lib/utils";

/** The four weights of the match score (ADR 011), from the constants the scoring uses. */
export const PARTS = (Object.keys(MATCH_WEIGHTS) as MatchPartKey[]).map((key) => ({
  key,
  label: MATCH_PART_LABELS[key],
  percent: Math.round(MATCH_WEIGHTS[key] * 100),
}));

export function weightClass(index: number) {
  return cn(
    "flex min-w-0 basis-0 items-center justify-between gap-2 px-3 font-semibold",
    index === 0 ? "bg-background text-foreground" : "border-[1.5px] border-background",
    index === PARTS.length - 1 && "border-dashed",
  );
}

/** Label and number inside a bar; the screen reader text is always the final value. */
export function WeightContent({
  index,
  label,
  percent,
  number,
}: {
  index: number;
  label: string;
  percent: number;
  number: ReactNode;
}) {
  return (
    <>
      <span className="sr-only">
        {label}: {percent}% wyniku
      </span>
      <span aria-hidden className={cn("truncate", index > 0 && "max-sm:hidden")}>
        {label}
      </span>
      <span aria-hidden className="font-mono text-lg tabular-nums">
        {number}
      </span>
    </>
  );
}

/** On phones the small bars have no room for labels: they are listed under the bar. */
export function WeightsLegend() {
  return (
    <p aria-hidden className="mt-3 font-mono text-[13px] opacity-75 sm:hidden">
      {PARTS.slice(1)
        .map((part) => `${part.label} ${part.percent}`)
        .join(" · ")}
    </p>
  );
}

/** Server-rendered final state (and the whole thing without JavaScript). */
export function StaticWeights() {
  return (
    <>
      <ol className="flex h-16 gap-1.5">
        {PARTS.map((part, index) => (
          <li key={part.key} style={{ flexGrow: part.percent }} className={weightClass(index)}>
            <WeightContent
              index={index}
              label={part.label}
              percent={part.percent}
              number={part.percent}
            />
          </li>
        ))}
      </ol>
      <WeightsLegend />
    </>
  );
}
