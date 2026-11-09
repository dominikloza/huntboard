import { type RemotePreference, type WorkMode } from "@/features/board/constants";
import { sameTech } from "@/lib/tech";

/** What the score needs from the profile (the ProfileRow subset). */
export type MatchProfile = {
  skills: string[];
  yearsExperience: number | null;
  salaryMin: number | null;
  remotePreference: RemotePreference;
};

/** What the score needs from a card. */
export type MatchOffer = {
  stack: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  workMode: WorkMode;
  seniority: string | null;
};

export type MatchPartKey = "stack" | "salary" | "workMode" | "seniority";

export type MatchPart = {
  key: MatchPartKey;
  label: string;
  /** 0..1 */
  score: number;
  /** Share of the total, the four weights add up to 1. */
  weight: number;
  /** One sentence in Polish for the breakdown. */
  summary: string;
  /** False when the offer or the profile says nothing about it: scored as neutral. */
  known: boolean;
};

export type MatchBreakdown = {
  score: number;
  parts: MatchPart[];
  matchedSkills: string[];
  missingSkills: string[];
};

/** Share of each part in the total (also shown on the landing page). */
export const MATCH_WEIGHTS: Record<MatchPartKey, number> = {
  stack: 0.55,
  salary: 0.2,
  workMode: 0.15,
  seniority: 0.1,
};

export const MATCH_PART_LABELS: Record<MatchPartKey, string> = {
  stack: "Stack",
  salary: "Widełki",
  workMode: "Tryb pracy",
  seniority: "Poziom",
};

/** Unknown is not a match and not a mismatch. */
const NEUTRAL = 0.6;

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const pln = (n: number) => `${new Intl.NumberFormat("pl-PL").format(n).replace(/\s/g, " ")} zł`;

/** The first technologies in an offer are the important ones: they count double. */
function stackPart(profile: MatchProfile, offer: MatchOffer) {
  const stack = offer.stack.filter(Boolean);
  if (stack.length === 0) {
    return {
      part: part("stack", NEUTRAL, "Oferta nie podaje technologii.", false),
      matched: [],
      missing: [],
    };
  }
  let earned = 0;
  let possible = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  stack.forEach((tech, index) => {
    const weight = index < 3 ? 2 : 1;
    possible += weight;
    // One direction only: knowing "React" does not mean knowing "React Native".
    if (profile.skills.some((skill) => sameTech(skill, tech))) {
      earned += weight;
      matched.push(tech);
    } else {
      missing.push(tech);
    }
  });
  const summary =
    missing.length === 0
      ? `Znasz cały stack (${stack.length} z ${stack.length}).`
      : `Znasz ${matched.length} z ${stack.length}. Brakuje: ${missing.join(", ")}.`;
  return { part: part("stack", earned / possible, summary, true), matched, missing };
}

function salaryPart(profile: MatchProfile, offer: MatchOffer): MatchPart {
  const top = offer.salaryMax ?? offer.salaryMin;
  if (profile.salaryMin == null || top == null) {
    const why = top == null ? "Oferta nie podaje widełek." : "Nie podałeś minimalnych widełek.";
    return part("salary", NEUTRAL, why, false);
  }
  if (top >= profile.salaryMin) {
    return part("salary", 1, `Do ${pln(top)}, Twoje minimum to ${pln(profile.salaryMin)}.`, true);
  }
  // 30% below your minimum (or more) scores zero.
  const score = clamp((top / profile.salaryMin - 0.7) / 0.3);
  return part(
    "salary",
    score,
    `Maksymalnie ${pln(top)}, o ${pln(profile.salaryMin - top)} poniżej Twojego minimum.`,
    true,
  );
}

const MODE_FIT: Record<Exclude<RemotePreference, "any">, Record<WorkMode, number>> = {
  remote: { remote: 1, hybrid: 0.5, office: 0 },
  hybrid: { remote: 1, hybrid: 1, office: 0.4 },
  office: { remote: 0.6, hybrid: 0.8, office: 1 },
};
const MODE_LABEL: Record<WorkMode, string> = {
  remote: "zdalna",
  hybrid: "hybrydowa",
  office: "stacjonarna",
};
/** "wolisz zdalną": accusative. */
const MODE_WISH: Record<WorkMode, string> = {
  remote: "zdalną",
  hybrid: "hybrydową",
  office: "stacjonarną",
};

function workModePart(profile: MatchProfile, offer: MatchOffer): MatchPart {
  const mode = MODE_LABEL[offer.workMode];
  if (profile.remotePreference === "any") {
    return part("workMode", 1, `Praca ${mode}, każdy tryb Ci pasuje.`, true);
  }
  const score = MODE_FIT[profile.remotePreference][offer.workMode];
  const wish = MODE_WISH[profile.remotePreference];
  return part(
    "workMode",
    score,
    score === 1 ? `Praca ${mode}, tak jak chcesz.` : `Praca ${mode}, a wolisz ${wish}.`,
    true,
  );
}

const LEVELS = ["Junior", "Mid", "Senior", "Lead"] as const;

/** "Regular" = Mid, "Staff"/"Principal" = Lead, "Mid/Senior" = the first one mentioned. */
export function levelOf(seniority: string | null): number | null {
  if (!seniority) return null;
  const text = seniority.toLowerCase();
  const found = [
    { level: 0, words: ["junior", "intern", "staż", "trainee"] },
    { level: 1, words: ["mid", "regular"] },
    { level: 2, words: ["senior"] },
    { level: 3, words: ["lead", "staff", "principal", "architect"] },
  ]
    .flatMap(({ level, words }) =>
      words.map((word) => ({ level, at: text.indexOf(word) })).filter((m) => m.at >= 0),
    )
    .sort((a, b) => a.at - b.at);
  return found[0]?.level ?? null;
}

/** Years of experience as a level: under 2 Junior, 2-4 Mid, 5-7 Senior, 8+ Lead. */
const levelFromYears = (years: number) => (years < 2 ? 0 : years < 5 ? 1 : years < 8 ? 2 : 3);

function seniorityPart(profile: MatchProfile, offer: MatchOffer): MatchPart {
  const wanted = levelOf(offer.seniority);
  if (wanted == null || profile.yearsExperience == null) {
    const why = wanted == null ? "Oferta nie podaje poziomu." : "Nie podałeś lat doświadczenia.";
    return part("seniority", NEUTRAL, why, false);
  }
  const yours = levelFromYears(profile.yearsExperience);
  const gap = wanted - yours;
  const score = gap === 0 ? 1 : Math.abs(gap) === 1 ? 0.5 : 0;
  const label = LEVELS[wanted] ?? "";
  const summary =
    gap === 0
      ? `Szukają poziomu ${label}, pasuje do Twoich ${profile.yearsExperience} lat.`
      : gap > 0
        ? `Szukają poziomu ${label}, przy ${profile.yearsExperience} latach to krok w górę.`
        : `Szukają poziomu ${label}, masz więcej doświadczenia.`;
  return part("seniority", score, summary, true);
}

function part(key: MatchPartKey, score: number, summary: string, known: boolean) {
  const label = MATCH_PART_LABELS[key];
  return { key, label, score: clamp(score), weight: MATCH_WEIGHTS[key], summary, known };
}

/**
 * Match score 0-100 of one offer against the profile (ADR 011). Deterministic on purpose: the
 * same data always gives the same number, it costs nothing and every point can be explained.
 * The AI only comments on this result. Null when the profile has no skills yet.
 */
export function scoreMatch(profile: MatchProfile | null, offer: MatchOffer): MatchBreakdown | null {
  if (!profile || profile.skills.length === 0) return null;
  const stack = stackPart(profile, offer);
  const parts = [
    stack.part,
    salaryPart(profile, offer),
    workModePart(profile, offer),
    seniorityPart(profile, offer),
  ];
  const score = Math.round(100 * parts.reduce((sum, p) => sum + p.score * p.weight, 0));
  return { score, parts, matchedSkills: stack.matched, missingSkills: stack.missing };
}
