import { connection, NextResponse } from "next/server";

import { isAuthorizedCron, staleGuestCutoff } from "@/lib/cron";
import { deleteStaleGuests } from "@/lib/db/queries/guest-cleanup";
import { autoRejectStale } from "@/lib/db/queries/mail";

/**
 * Daily Vercel Cron (vercel.json), `Authorization: Bearer $CRON_SECRET`:
 * - deletes guest accounts whose last session expired more than a week ago (ADR 013);
 * - moves applications without an answer for too long to "rejected" (mail sync, ADR 017).
 * One route because the Hobby plan allows one daily job.
 */
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const deleted = await deleteStaleGuests(staleGuestCutoff(now));
  const autoRejected = await autoRejectStale(now);
  console.info(`cron: deleted ${deleted} stale guests, auto-rejected ${autoRejected} applications`);
  return NextResponse.json({ deleted, autoRejected }, { headers: { "Cache-Control": "no-store" } });
}
