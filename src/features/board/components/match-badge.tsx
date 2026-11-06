import { getMatchTier } from "@/lib/format";
import { cn } from "@/lib/utils";

const tierStyles = {
  strong: "border-primary-ink text-primary-ink",
  medium: "border-muted-foreground text-muted-foreground",
  weak: "border-border text-muted-foreground",
} as const;

type MatchBadgeProps = {
  score: number;
  size?: "sm" | "lg";
  className?: string;
};

/** Match score written in a circle, like a grade on a form. */
export function MatchBadge({ score, size = "sm", className }: MatchBadgeProps) {
  const tier = getMatchTier(score);
  return (
    <span
      role="img"
      aria-label={`Dopasowanie ${score} na 100`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] font-mono font-semibold",
        size === "sm" ? "size-[30px] text-[11px]" : "size-16 border-2 text-[22px]",
        tierStyles[tier],
        className,
      )}
    >
      {score}
    </span>
  );
}
