import { type Metadata } from "next";

import { NewApplicationSheet } from "@/features/board/components/new-application-sheet";
import { SheetPage } from "@/features/board/components/sheet-frame";

export const metadata: Metadata = { title: "Nowa oferta" };

/** /board/new opened directly (link, refresh): a full page. */
export default function NewApplicationPage() {
  return (
    <main className="px-4 sm:px-7">
      <SheetPage title="Nowa oferta">
        <NewApplicationSheet />
      </SheetPage>
    </main>
  );
}
