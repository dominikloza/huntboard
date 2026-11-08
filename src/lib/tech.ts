/* Comparing names written by people and models: companies, cities, technologies. */

/** Lowercase, no Polish diacritics, no legal-form suffixes, single spaces. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(sp\.? z o\.? ?o\.?|s\.? ?a\.?|ltd\.?|gmbh|inc\.?)$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "Next.js" = "NextJS" = "next js", "Vue 3" = "Vue", "Nuxt 3" = "Nuxt.js" = "Nuxt": the version
 * and the ".js" suffix are spelling, not a different technology.
 */
export const techKey = (value: string) =>
  normalize(value)
    .replace(/\s*v?\d+(\.\d+)*(\+|\.x)?$/u, "")
    .replace(/\.?js$/u, "")
    .replace(/[\s.\-_/]/g, "");

/** Same technology, however it is spelled; also "Webpack Module Federation" contains "Module Federation". */
export function sameTech(have: string, want: string): boolean {
  const a = techKey(have);
  const b = techKey(want);
  return a === b || (b.length >= 4 && a.includes(b));
}
