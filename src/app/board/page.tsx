import { type Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { BoardColumns, BoardSkeleton } from "@/features/board/components/board-columns";
import { getBoardApplications } from "@/lib/db/queries/applications";
import { pluralPl } from "@/lib/plural";

export const metadata: Metadata = { title: "Kartoteka" };

async function Board() {
  const applications = await getBoardApplications();
  const active = applications.filter((a) => a.status === "applied" || a.status === "interview");

  return (
    <>
      <p className="mb-5 text-sm text-muted-foreground">
        {applications.length === 0
          ? "Kartoteka jest pusta. Wkrótce dodasz tu pierwszą ofertę."
          : `${applications.length} ${pluralPl(applications.length, ["teczka", "teczki", "teczek"])}, ${active.length} w obiegu`}
      </p>
      <BoardColumns applications={applications} />
    </>
  );
}

export default function BoardPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-7">
        <h1 className="mb-2 font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
          Kartoteka
        </h1>
        <Suspense
          fallback={
            <>
              <p className="mb-5 h-5" aria-hidden />
              <BoardSkeleton />
            </>
          }
        >
          <Board />
        </Suspense>
      </main>
    </>
  );
}
