import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth/session";
import { listApplicationsForSession } from "@/lib/db/queries/applications";

/**
 * Board data for TanStack Query refetches. Reads go through a GET Route Handler (cacheable,
 * parallel), writes go through Server Actions (ADR 006).
 */
export async function GET() {
  try {
    const applications = await listApplicationsForSession();
    return NextResponse.json(applications, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
