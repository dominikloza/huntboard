import { Suspense } from "react";

import { EditApplicationSheet } from "@/features/board/components/edit-application-sheet";
import { SheetModal, SheetSkeleton } from "@/features/board/components/sheet-frame";
import { getApplicationOr404 } from "@/lib/db/queries/applications";

async function Sheet({ params }: { params: PageProps<"/board/app/[id]">["params"] }) {
  const { id } = await params;
  const application = await getApplicationOr404(id);
  return <EditApplicationSheet application={application} />;
}

/** /board/app/[id] opened from the board: a modal over it. */
export default function ApplicationModal({ params }: PageProps<"/board/app/[id]">) {
  return (
    <SheetModal title="Teczka aplikacji">
      <Suspense fallback={<SheetSkeleton />}>
        <Sheet params={params} />
      </Suspense>
    </SheetModal>
  );
}
