import { type ApplicationStatus } from "@/features/board/constants";

import { roleSimilarity, sameCompany, senderCompany } from "./company";
import { type CardForMail, type MailReading } from "./types";

export type MailDecision =
  | { action: "create" }
  | { action: "move"; applicationId: string; from: ApplicationStatus; to: ApplicationStatus }
  /** Unsure or ambiguous: shown to the user, nothing changes until they accept. */
  | {
      action: "proposal";
      applicationId: string | null;
      from: ApplicationStatus | null;
      to: ApplicationStatus;
    }
  | { action: "none"; applicationId: string | null }
  | { action: "unmatched" };

const TARGET: Partial<Record<MailReading["kind"], ApplicationStatus>> = {
  applied: "applied",
  interview: "interview",
  offer: "offer",
  rejected: "rejected",
};

/** Stages an e-mail may move a card from: never backwards, never out of "rejected" by itself. */
const MOVES_FROM: Record<ApplicationStatus, ApplicationStatus[]> = {
  saved: [],
  applied: ["saved"],
  interview: ["saved", "applied"],
  offer: ["saved", "applied", "interview"],
  rejected: ["saved", "applied", "interview", "offer"],
};

/** The card an e-mail is about: same employer, and the closest title when there are several. */
export function findCard(
  reading: Pick<MailReading, "company" | "role">,
  sender: string,
  cards: CardForMail[],
): { card: CardForMail | null; ambiguous: boolean } {
  const names = [reading.company, senderCompany(sender)].filter((n): n is string => Boolean(n));
  const candidates = cards.filter((card) => names.some((name) => sameCompany(card.company, name)));
  if (candidates.length <= 1) return { card: candidates[0] ?? null, ambiguous: false };

  const role = reading.role;
  if (!role) return { card: candidates[0] ?? null, ambiguous: true };
  const ranked = candidates
    .map((card) => ({ card, score: roleSimilarity(card.role, role) }))
    .sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  const clear = best && best.score >= 0.5 && (!second || best.score > second.score);
  return { card: best?.card ?? null, ambiguous: !clear };
}

/**
 * What to do with one recruitment e-mail (ADR 017). Pure: the route applies the decision.
 * - "Thank you for applying" with no matching card -> a new card in "applied".
 * - An answer (interview, offer, rejection) -> move the matching card forward.
 * - The AI was unsure, or two cards fit -> a proposal the user accepts or ignores.
 */
export function decideMail(
  reading: MailReading,
  sender: string,
  cards: CardForMail[],
): MailDecision {
  const to = TARGET[reading.kind];
  const { card, ambiguous } = findCard(reading, sender, cards);

  // Same company, clearly another job: a new application, not an update of the old card.
  const otherJob =
    reading.kind === "applied" &&
    card &&
    reading.role &&
    roleSimilarity(card.role, reading.role) < 0.3;

  if (!to) return { action: "none", applicationId: card?.id ?? null };

  if (!card || otherJob) {
    if (reading.kind !== "applied") return { action: "unmatched" };
    if (!reading.company || !reading.role) return { action: "unmatched" };
    return reading.sure
      ? { action: "create" }
      : { action: "proposal", applicationId: null, from: null, to };
  }

  if (!MOVES_FROM[to].includes(card.status)) return { action: "none", applicationId: card.id };
  if (!reading.sure || ambiguous) {
    return { action: "proposal", applicationId: card.id, from: card.status, to };
  }
  return { action: "move", applicationId: card.id, from: card.status, to };
}
