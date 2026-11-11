import "server-only";

import { and, desc, eq, gte, inArray, isNotNull, isNull, max, sql } from "drizzle-orm";
import { connection } from "next/server";

import { type ApplicationStatus, type MailKind } from "@/features/board/constants";
import { positionAtTop } from "@/features/board/lib/position";
import { decideMail } from "@/features/mail/lib/decide";
import { generateMailToken, hashMailToken, tokenHint } from "@/features/mail/lib/token";
import { type CardForMail, type IncomingMail, type MailReading } from "@/features/mail/lib/types";
import { scoreMatch } from "@/features/match/lib/score";
import { offerUrlInMail } from "@/features/offer/lib/offer-url";
import { requireSessionUser, requireUser } from "@/lib/auth/session";

import { getDb } from "../client";
import { applicationEvents, applications, mailConnections, mailMessages, user } from "../schema";

import { profileOf } from "./profile";
import { firstPosition, moveCardToStage, recordStage, type Tx } from "./stage";

/*
 * Mail sync (ADR 017). Two kinds of callers:
 * - the Gmail script, identified by a personal token (the user id comes from the token's hash,
 *   never from the request body): `mailUserForToken`, `unseenMessageIds`, `applyMailReadings`;
 * - the signed-in user (session): settings, the feed, undo and proposals.
 * `autoRejectStale` runs from the cron route (CRON_SECRET), for every connected user.
 */

// ------------------------------------------------------------------- token (the Gmail script)

/** The owner of a token, or null. Also notes the time of the last sync. */
export async function mailUserForToken(
  token: string,
): Promise<{ userId: string; isGuest: boolean } | null> {
  const db = getDb();
  const [row] = await db
    .update(mailConnections)
    .set({ lastSyncAt: new Date() })
    .where(eq(mailConnections.tokenHash, hashMailToken(token)))
    .returning({ userId: mailConnections.userId });
  if (!row) return null;
  const [owner] = await db
    .select({ isAnonymous: user.isAnonymous })
    .from(user)
    .where(eq(user.id, row.userId));
  return { userId: row.userId, isGuest: owner?.isAnonymous === true };
}

/** The ids from this batch Huntboard has not seen yet (the script may send an e-mail twice). */
export async function unseenMessageIds(userId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const seen = await getDb()
    .select({ messageId: mailMessages.messageId })
    .from(mailMessages)
    .where(and(eq(mailMessages.userId, userId), inArray(mailMessages.messageId, ids)));
  const known = new Set(seen.map((row) => row.messageId));
  return new Set(ids.filter((id) => !known.has(id)));
}

export type MailSummary = Record<"created" | "moved" | "proposal" | "unmatched" | "none", number>;

/**
 * Applies what the e-mails say, oldest first, in one transaction: new cards, moves, proposals,
 * and one `mail_messages` row each (the body is not stored). Stage changes are dated with the
 * e-mail, so the statistics measure real answer times.
 */
export async function applyMailReadings(
  userId: string,
  items: { mail: IncomingMail; reading: MailReading }[],
): Promise<MailSummary> {
  const summary: MailSummary = { created: 0, moved: 0, proposal: 0, unmatched: 0, none: 0 };
  const sorted = [...items].sort((a, b) => a.mail.date.getTime() - b.mail.date.getTime());

  await getDb().transaction(async (tx) => {
    const cards: CardForMail[] = await tx
      .select({
        id: applications.id,
        company: applications.company,
        role: applications.role,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.userId, userId));
    const profile = await profileOf(tx, userId);

    for (const { mail, reading } of sorted) {
      const decision = decideMail(reading, mail.from, cards);
      let applicationId: string | null = null;
      let previousStatus: ApplicationStatus | null = null;
      let newStatus: ApplicationStatus | null = null;

      if (decision.action === "create" && reading.company && reading.role) {
        const card = await createCardFromMail(tx, userId, {
          company: reading.company,
          role: reading.role,
          city: reading.city,
          at: mail.date,
          profile,
        });
        cards.push(card);
        applicationId = card.id;
        newStatus = "applied";
      } else if (decision.action === "move") {
        await moveCardToStage(tx, userId, decision.applicationId, decision.to, {
          source: "email",
          at: mail.date,
        });
        const card = cards.find((c) => c.id === decision.applicationId);
        if (card) card.status = decision.to;
        applicationId = decision.applicationId;
        previousStatus = decision.from;
        newStatus = decision.to;
      } else if (decision.action === "proposal") {
        applicationId = decision.applicationId;
        previousStatus = decision.from;
        newStatus = decision.to;
      } else if (decision.action === "none") {
        applicationId = decision.applicationId;
      }

      summary[
        decision.action === "create"
          ? "created"
          : decision.action === "move"
            ? "moved"
            : decision.action
      ] += 1;
      await tx
        .insert(mailMessages)
        .values({
          userId,
          messageId: mail.messageId,
          receivedAt: mail.date,
          sender: mail.from.slice(0, 300),
          subject: mail.subject.slice(0, 300),
          kind: reading.kind,
          action:
            decision.action === "create"
              ? "created"
              : decision.action === "move"
                ? "moved"
                : decision.action,
          company: reading.company,
          role: reading.role,
          applicationId,
          previousStatus,
          newStatus,
        })
        .onConflictDoNothing();
    }
  });
  return summary;
}

/**
 * Links to the offer found in e-mails (ADR 018), for cards that have none yet. Runs on every
 * batch, also for e-mails seen before: re-running `setup` in the script fills the links of
 * cards created earlier. Raw bodies: the links are cut out of the text the rules read.
 */
export async function attachOfferLinks(
  userId: string,
  mails: { messageId: string; body: string }[],
): Promise<number> {
  if (mails.length === 0) return 0;
  const db = getDb();
  const rows = await db
    .select({
      messageId: mailMessages.messageId,
      id: applications.id,
      company: applications.company,
      role: applications.role,
    })
    .from(mailMessages)
    .innerJoin(
      applications,
      and(eq(applications.id, mailMessages.applicationId), eq(applications.userId, userId)),
    )
    .where(
      and(
        eq(mailMessages.userId, userId),
        inArray(
          mailMessages.messageId,
          mails.map((m) => m.messageId),
        ),
        isNull(applications.offerUrl),
      ),
    );

  const bodies = new Map(mails.map((m) => [m.messageId, m.body]));
  let linked = 0;
  for (const row of rows) {
    const url = offerUrlInMail(bodies.get(row.messageId) ?? "", row);
    if (!url) continue;
    const updated = await db
      .update(applications)
      .set({ offerUrl: url })
      .where(
        and(
          eq(applications.id, row.id),
          eq(applications.userId, userId),
          isNull(applications.offerUrl),
        ),
      )
      .returning({ id: applications.id });
    linked += updated.length;
  }
  return linked;
}

async function createCardFromMail(
  tx: Tx,
  userId: string,
  {
    company,
    role,
    city,
    at,
    profile,
  }: {
    company: string;
    role: string;
    city: string | null;
    at: Date;
    profile: Awaited<ReturnType<typeof profileOf>>;
  },
): Promise<CardForMail> {
  // The e-mail rarely says more: the user completes the card (or pastes the offer) later.
  const input = {
    company: company.slice(0, 120),
    role: role.slice(0, 120),
    city: city?.slice(0, 80) ?? null,
    status: "applied" as const,
    workMode: "remote" as const,
    stack: [],
    salaryMin: null,
    salaryMax: null,
    seniority: null,
  };
  const [row] = await tx
    .insert(applications)
    .values({
      ...input,
      userId,
      position: positionAtTop(await firstPosition(tx, userId, "applied")),
      matchScore: scoreMatch(profile, input)?.score ?? null,
      createdAt: at,
    })
    .returning({
      id: applications.id,
      company: applications.company,
      role: applications.role,
      status: applications.status,
    });
  if (!row) throw new Error("Insert returned no row");
  await recordStage(tx, row, userId, { source: "email", at });
  return row;
}

// ------------------------------------------------------------------- session (settings, feed)

export type MailSettings = {
  tokenHint: string;
  autoRejectDays: number | null;
  lastSyncAt: Date | null;
} | null;

export async function getMailSettings(): Promise<MailSettings> {
  const user = await requireUser();
  await connection();
  const [row] = await getDb()
    .select({
      tokenHint: mailConnections.tokenHint,
      autoRejectDays: mailConnections.autoRejectDays,
      lastSyncAt: mailConnections.lastSyncAt,
    })
    .from(mailConnections)
    .where(eq(mailConnections.userId, user.id));
  return row ?? null;
}

/** Creates (or replaces) the user's token. The plain token is returned once and never stored. */
export async function createMailTokenForSession(): Promise<string> {
  const user = await requireSessionUser();
  const token = generateMailToken();
  const values = { tokenHash: hashMailToken(token), tokenHint: tokenHint(token) };
  await getDb()
    .insert(mailConnections)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: mailConnections.userId, set: values });
  return token;
}

export async function deleteMailConnectionForSession(): Promise<void> {
  const user = await requireSessionUser();
  await getDb().delete(mailConnections).where(eq(mailConnections.userId, user.id));
}

export async function setAutoRejectDaysForSession(days: number | null): Promise<void> {
  const user = await requireSessionUser();
  await getDb()
    .update(mailConnections)
    .set({ autoRejectDays: days })
    .where(eq(mailConnections.userId, user.id));
}

export type MailFeedItem = {
  id: string;
  /** A row from mail_messages, or a card moved by silence (auto-reject). */
  type: "mail" | "timeout";
  at: Date;
  kind: MailKind | null;
  action: (typeof mailMessages.$inferSelect)["action"] | null;
  subject: string | null;
  company: string | null;
  role: string | null;
  applicationId: string | null;
  previousStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus | null;
};

const FEED_DAYS = 14;

/** What mail and silence changed on the board in the last two weeks, newest first. */
export async function getMailFeed(): Promise<MailFeedItem[]> {
  const user = await requireUser();
  await connection();
  const since = new Date(Date.now() - FEED_DAYS * 24 * 60 * 60 * 1000);
  const db = getDb();
  const [mails, timeouts] = await Promise.all([
    db
      .select({
        mail: mailMessages,
        // The card's own names when the e-mail matched one (a rejection rarely names the role).
        cardCompany: applications.company,
        cardRole: applications.role,
      })
      .from(mailMessages)
      .leftJoin(applications, eq(applications.id, mailMessages.applicationId))
      .where(and(eq(mailMessages.userId, user.id), gte(mailMessages.createdAt, since)))
      .orderBy(desc(mailMessages.receivedAt))
      .limit(30),
    db
      .select({
        id: applicationEvents.id,
        at: applicationEvents.createdAt,
        applicationId: applicationEvents.applicationId,
        company: applications.company,
        role: applications.role,
      })
      .from(applicationEvents)
      .innerJoin(applications, eq(applications.id, applicationEvents.applicationId))
      .where(
        and(
          eq(applicationEvents.userId, user.id),
          eq(applicationEvents.source, "timeout"),
          gte(applicationEvents.createdAt, since),
        ),
      ),
  ]);
  const items: MailFeedItem[] = [
    ...mails
      // Nothing to show for e-mails that changed nothing and matched nothing.
      .filter(({ mail }) => mail.action !== "none" || mail.kind === "progress")
      .map(({ mail: m, cardCompany, cardRole }) => ({
        id: m.id,
        type: "mail" as const,
        at: m.receivedAt,
        kind: m.kind,
        action: m.action,
        subject: m.subject,
        company: cardCompany ?? m.company,
        role: cardRole ?? m.role,
        applicationId: m.applicationId,
        previousStatus: m.previousStatus,
        newStatus: m.newStatus,
      })),
    ...timeouts.map((t) => ({
      id: t.id,
      type: "timeout" as const,
      at: t.at,
      kind: null,
      action: null,
      subject: null,
      company: t.company,
      role: t.role,
      applicationId: t.applicationId,
      previousStatus: "applied" as const,
      newStatus: "rejected" as const,
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30);
}

/** Undo what an e-mail did: delete the card it created, or put the card back where it was. */
export async function undoMailForSession(id: string): Promise<boolean> {
  const user = await requireSessionUser();
  return getDb().transaction(async (tx) => {
    const [mail] = await tx
      .select()
      .from(mailMessages)
      .where(and(eq(mailMessages.id, id), eq(mailMessages.userId, user.id)))
      .limit(1);
    if (!mail || (mail.action !== "created" && mail.action !== "moved")) return false;
    if (mail.applicationId) {
      if (mail.action === "created") {
        await tx
          .delete(applications)
          .where(and(eq(applications.id, mail.applicationId), eq(applications.userId, user.id)));
      } else if (mail.previousStatus) {
        await moveCardToStage(tx, user.id, mail.applicationId, mail.previousStatus, {
          source: "board",
        });
      }
    }
    await tx.update(mailMessages).set({ action: "undone" }).where(eq(mailMessages.id, mail.id));
    return true;
  });
}

/** Accept a proposal: do what the e-mail suggested. */
export async function acceptMailProposalForSession(id: string): Promise<boolean> {
  const user = await requireSessionUser();
  return getDb().transaction(async (tx) => {
    const [mail] = await tx
      .select()
      .from(mailMessages)
      .where(and(eq(mailMessages.id, id), eq(mailMessages.userId, user.id)))
      .limit(1);
    if (!mail || mail.action !== "proposal" || !mail.newStatus) return false;
    if (mail.applicationId) {
      const moved = await moveCardToStage(tx, user.id, mail.applicationId, mail.newStatus, {
        source: "email",
        at: mail.receivedAt,
      });
      if (!moved) return false;
      await tx.update(mailMessages).set({ action: "moved" }).where(eq(mailMessages.id, mail.id));
      return true;
    }
    if (!mail.company || !mail.role) return false;
    const card = await createCardFromMail(tx, user.id, {
      company: mail.company,
      role: mail.role,
      city: null,
      at: mail.receivedAt,
      profile: await profileOf(tx, user.id),
    });
    await tx
      .update(mailMessages)
      .set({ action: "created", applicationId: card.id })
      .where(eq(mailMessages.id, mail.id));
    return true;
  });
}

// ------------------------------------------------------------------- cron (auto-reject)

/**
 * Silence is an answer too: for users with mail sync and auto-reject on, a card that has sat in
 * "applied" longer than their limit moves to "rejected" (source "timeout", not counted as an
 * answer in the statistics). Returns how many cards moved.
 */
export async function autoRejectStale(now: Date): Promise<number> {
  const db = getDb();
  const connections = await db
    .select({ userId: mailConnections.userId, days: mailConnections.autoRejectDays })
    .from(mailConnections)
    .where(isNotNull(mailConnections.autoRejectDays));

  let moved = 0;
  for (const { userId, days } of connections) {
    if (!days) continue;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const stale = await db
      .select({ id: applications.id })
      .from(applications)
      .leftJoin(applicationEvents, eq(applicationEvents.applicationId, applications.id))
      .where(and(eq(applications.userId, userId), eq(applications.status, "applied")))
      .groupBy(applications.id, applications.updatedAt)
      .having(
        sql`coalesce(${max(applicationEvents.createdAt)}, ${applications.updatedAt}) < ${cutoff}`,
      );
    if (stale.length === 0) continue;
    await db.transaction(async (tx) => {
      for (const { id } of stale) {
        if (await moveCardToStage(tx, userId, id, "rejected", { source: "timeout", at: now })) {
          moved += 1;
        }
      }
    });
  }
  return moved;
}
