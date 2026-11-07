import { type Metadata } from "next";
import { Suspense } from "react";

import { EditApplicationSheet } from "@/features/board/components/edit-application-sheet";
import { SheetPage, SheetSkeleton } from "@/features/board/components/sheet-frame";
import { getApplicationOr404 } from "@/lib/db/queries/applications";

export const metadata: Metadata = { title: "Teczka aplikacji" };

async function Sheet({ params }: { params: PageProps<"/board/app/[id]">["params"] }) {
  const { id } = await params;
  const application = await getApplicationOr404(id);
  return <EditApplicationSheet application={application} />;
}

/** /board/app/[id] opened directly (shared link, refresh): a full page. */
export default function ApplicationPage({ params }: PageProps<"/board/app/[id]">) {
  return (
    <main className="px-4 sm:px-7">
      <SheetPage title="Teczka aplikacji">
        <Suspense fallback={<SheetSkeleton />}>
          <Sheet params={params} />
        </Suspense>
      </SheetPage>
    </main>
  );
}
