import { RedFlags } from "@/features/extract/components/red-flags";
import { NotesSection } from "@/features/notes/components/notes-section";
import { getApplicationOr404 } from "@/lib/db/queries/applications";
import { getNotesForApplication } from "@/lib/db/queries/notes";

import { EditApplicationSheet } from "./edit-application-sheet";

/** Server Component shared by the modal and the full page: card data and its notes. */
export async function ApplicationSheetContent({ id }: { id: string }) {
  const [application, notes] = await Promise.all([
    getApplicationOr404(id),
    getNotesForApplication(id),
  ]);
  return (
    <EditApplicationSheet application={application}>
      <RedFlags flags={application.redFlags} />
      {/* New server data (e.g. reopening the card) remounts the list from the source of truth. */}
      <NotesSection
        key={notes.map((n) => n.id).join(",")}
        applicationId={application.id}
        notes={notes}
      />
    </EditApplicationSheet>
  );
}
