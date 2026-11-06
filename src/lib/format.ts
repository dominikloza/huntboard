const plnFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

/**
 * Formats a monthly salary range for cards and the offer sheet.
 * Uses a plain hyphen (not an en-dash) by design, see AGENTS.md copy rules.
 */
export function formatSalaryRange(
  min: number | null,
  max: number | null,
  { compact = false }: { compact?: boolean } = {},
): string {
  const fmt = (value: number) =>
    compact ? `${Math.round(value / 1000)}k` : plnFormatter.format(value).replace(/ /g, " ");

  if (min != null && max != null) {
    const [lo, hi] = min <= max ? [min, max] : [max, min];
    return compact ? `${fmt(lo).replace("k", "")}-${fmt(hi)}` : `${fmt(lo)}-${fmt(hi)} zł`;
  }
  if (min != null) return compact ? `od ${fmt(min)}` : `od ${fmt(min)} zł`;
  if (max != null) return compact ? `do ${fmt(max)}` : `do ${fmt(max)} zł`;
  return "Brak widełek";
}

export type MatchTier = "strong" | "medium" | "weak";

/** Match score buckets drive color and copy. Kept in one place so UI and tests agree. */
export function getMatchTier(score: number): MatchTier {
  if (!Number.isFinite(score)) return "weak";
  if (score >= 80) return "strong";
  if (score >= 50) return "medium";
  return "weak";
}
