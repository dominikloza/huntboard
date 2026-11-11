import { type ApplicationStatus } from "@/features/board/constants";

export type StatsCard = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  createdAt: Date;
};
export type StatsEvent = { applicationId: string; status: ApplicationStatus; createdAt: Date };

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** An application sent this long ago without any answer is worth a follow-up. */
export const WAITING_DAYS = 14;
export const WEEKS = 8;

/** How far along the process a stage is. "rejected" ends the process at any stage. */
const LEVEL: Partial<Record<ApplicationStatus, number>> = {
  saved: 0,
  applied: 1,
  interview: 2,
  offer: 3,
};
const FUNNEL_STAGES = ["applied", "interview", "offer"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export type FunnelStep = {
  stage: FunnelStage;
  reached: number;
  /** Share of the previous step that got here (the first step: of all cards). */
  rate: number | null;
};

export type Stats = {
  total: number;
  funnel: FunnelStep[];
  /** Days from "applied" to the first answer (interview, offer or rejection). */
  answer: { medianDays: number | null; count: number };
  waiting: { id: string; company: string; role: string; days: number }[];
  /** Applications sent per week, oldest first; `start` is a Monday (UTC). */
  weekly: { start: Date; sent: number }[];
};

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return Math.round(value * 10) / 10;
};

/** Monday 00:00 UTC of the week that contains `date`. */
export function weekStart(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const shift = (day.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(day.getTime() - shift * DAY_MS);
}

/**
 * Funnel, answer time, follow-ups and weekly activity of one user's search. Pure: the page
 * passes the cards and their stage history (application_events).
 *
 * A card's furthest stage is the furthest one in its history or its current stage. A rejected
 * card without history (created before the history existed) counts as sent.
 */
export function computeStats(cards: StatsCard[], events: StatsEvent[], now: Date): Stats {
  const historyOf = Map.groupBy(
    [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    (e) => e.applicationId,
  );

  const furthest = cards.map((card) => {
    const levels = [card.status, ...(historyOf.get(card.id) ?? []).map((e) => e.status)]
      .map((status) => LEVEL[status])
      .filter((level): level is number => level !== undefined);
    const best = Math.max(0, ...levels);
    return card.status === "rejected" ? Math.max(best, 1) : best;
  });

  let previous = cards.length;
  const funnel = FUNNEL_STAGES.map((stage) => {
    const reached = furthest.filter((level) => level >= (LEVEL[stage] ?? 0)).length;
    const step = { stage, reached, rate: previous > 0 ? reached / previous : null };
    previous = reached;
    return step;
  });

  const answerDays: number[] = [];
  const waiting: Stats["waiting"] = [];
  for (const card of cards) {
    const history = historyOf.get(card.id) ?? [];
    const sent = history.find((e) => e.status === "applied");
    if (!sent) continue;
    const answer = history.find(
      (e) => e.createdAt > sent.createdAt && e.status !== "applied" && e.status !== "saved",
    );
    if (answer) {
      answerDays.push((answer.createdAt.getTime() - sent.createdAt.getTime()) / DAY_MS);
    } else if (card.status === "applied") {
      const days = Math.floor((now.getTime() - sent.createdAt.getTime()) / DAY_MS);
      if (days >= WAITING_DAYS) {
        waiting.push({ id: card.id, company: card.company, role: card.role, days });
      }
    }
  }
  waiting.sort((a, b) => b.days - a.days);

  const thisWeek = weekStart(now).getTime();
  const weekly = Array.from({ length: WEEKS }, (_, i) => ({
    start: new Date(thisWeek - (WEEKS - 1 - i) * WEEK_MS),
    sent: 0,
  }));
  for (const event of events) {
    if (event.status !== "applied") continue;
    const index =
      WEEKS - 1 - Math.round((thisWeek - weekStart(event.createdAt).getTime()) / WEEK_MS);
    const week = weekly[index];
    if (week) week.sent += 1;
  }

  return {
    total: cards.length,
    funnel,
    answer: { medianDays: median(answerDays), count: answerDays.length },
    waiting,
    weekly,
  };
}
