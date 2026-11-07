import { Suspense } from "react";

import { ApplicationSheetContent } from "@/features/board/components/application-sheet-content";
import { SheetModal, SheetSkeleton } from "@/features/board/components/sheet-frame";

async function Sheet({ params }: { params: PageProps<"/board/app/[id]">["params"] }) {
  const { id } = await params;
  return <ApplicationSheetContent id={id} />;
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
