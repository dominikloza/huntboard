import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { type Metadata } from "next";
import { Suspense } from "react";

import { BoardSkeleton } from "@/features/board/components/board-columns";
import { BoardView } from "@/features/board/components/board-view";
import { applicationKeys } from "@/features/board/query-keys";
import { getBoardApplications } from "@/lib/db/queries/applications";
import { getQueryClient } from "@/lib/query-client";

export const metadata: Metadata = { title: "Kartoteka" };

/** Prefetch on the server, hand the cache to the client: no loading spinner on first paint. */
async function Board() {
  // Read first, then seed the cache: the query reads the session and opens a request-time
  // connection, and only after that may TanStack stamp the data with Date.now() (Cache
  // Components forbid the current time while prerendering).
  const applications = await getBoardApplications();
  const queryClient = getQueryClient();
  queryClient.setQueryData(applicationKeys.all, applications);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BoardView />
    </HydrationBoundary>
  );
}

export default function BoardPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-7">
      <h1 className="mb-2 font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
        Kartoteka
      </h1>
      <Suspense
        fallback={
          <>
            <div className="mb-5 h-10" aria-hidden />
            <BoardSkeleton />
          </>
        }
      >
        <Board />
      </Suspense>
    </main>
  );
}
