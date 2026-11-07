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
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: applicationKeys.all,
    queryFn: getBoardApplications,
  });
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
