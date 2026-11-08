import { connection, NextResponse } from "next/server";

import { isAuthorizedCron, staleGuestCutoff } from "@/lib/cron";
import { deleteStaleGuests } from "@/lib/db/queries/guest-cleanup";

/**
 * Daily Vercel Cron (vercel.json): deletes guest accounts whose last session expired more than
 * a week ago (ADR 013). Vercel calls it with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deleted = await deleteStaleGuests(staleGuestCutoff(new Date()));
  console.info(`cleanup-guests: deleted ${deleted} stale guest accounts`);
  return NextResponse.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
}
