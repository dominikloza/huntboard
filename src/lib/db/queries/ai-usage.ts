import "server-only";

import { and, asc, count, eq, gt, min, sql } from "drizzle-orm";

import { type AiUsageKind } from "@/features/board/constants";
import { aiLimits, checkQuota, DAY_MS, HOUR_MS, quotaMessage } from "@/lib/ai/limits";
import { requireSessionUser } from "@/lib/auth/session";

import { getDb } from "../client";
import { aiUsage } from "../schema";

export type TokenUsage = { inputTokens?: number | undefined; outputTokens?: number | undefined };

export type AiReservation =
  | {
      ok: true;
      /** Fill in the tokens once the call is done (runs after the response, see `after`). */
      record: (usage: TokenUsage) => Promise<void>;
      /** Give the slot back: the provider failed before answering, the user got nothing. */
      refund: () => Promise<void>;
    }
  | { ok: false; message: string; retryAfterSeconds: number };

/**
 * Reserves one AI call for the signed-in user, or says when the next one is allowed (ADR 010).
 *
 * The row is written before the model is called, inside a transaction holding a per-user
 * advisory lock: two parallel requests of the same user cannot both see "9 of 10" and both pass.
 * The daily budget is shared by all users and checked without a global lock; with a few
 * requests per second at most it can overshoot by a handful, which is fine for a cost ceiling.
 */
export async function reserveAiCallForSession(
  kind: AiUsageKind,
  model: string,
): Promise<AiReservation> {
  const user = await requireSessionUser();
  const db = getDb();
  const now = new Date();

  const decision = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ai_usage:${user.id}`}))`);

    const userCalls = await tx
      .select({ createdAt: aiUsage.createdAt })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, user.id),
          eq(aiUsage.kind, kind),
          gt(aiUsage.createdAt, new Date(now.getTime() - HOUR_MS)),
        ),
      )
      .orderBy(asc(aiUsage.createdAt));

    const [all] = await tx
      .select({ count: count(), oldest: min(aiUsage.createdAt) })
      .from(aiUsage)
      .where(gt(aiUsage.createdAt, new Date(now.getTime() - DAY_MS)));

    const quota = checkQuota({
      userCalls: userCalls.map((row) => row.createdAt),
      allCalls: { count: all?.count ?? 0, oldest: all?.oldest ?? null },
      isGuest: user.isGuest,
      limits: aiLimits(),
      now,
    });
    if (!quota.ok) return quota;

    const [row] = await tx
      .insert(aiUsage)
      .values({ userId: user.id, kind, model, createdAt: now })
      .returning({ id: aiUsage.id });
    if (!row) throw new Error("Insert returned no row");
    return { ok: true as const, id: row.id };
  });

  if (!decision.ok) {
    return {
      ok: false,
      message: quotaMessage(decision, kind, user.isGuest),
      retryAfterSeconds: decision.retryAfterSeconds,
    };
  }

  const ownRow = and(eq(aiUsage.id, decision.id), eq(aiUsage.userId, user.id));
  return {
    ok: true,
    record: async ({ inputTokens, outputTokens }) => {
      await db
        .update(aiUsage)
        .set({ inputTokens: inputTokens ?? 0, outputTokens: outputTokens ?? 0 })
        .where(ownRow);
    },
    refund: async () => {
      await db.delete(aiUsage).where(ownRow);
    },
  };
}
