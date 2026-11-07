import { NewApplicationSheet } from "@/features/board/components/new-application-sheet";
import { SheetModal } from "@/features/board/components/sheet-frame";

/** /board/new opened from the board: a modal over it. */
export default function NewApplicationModal() {
  return (
    <SheetModal title="Nowa oferta">
      <NewApplicationSheet />
    </SheetModal>
  );
}
