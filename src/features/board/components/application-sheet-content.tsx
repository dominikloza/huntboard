import { RedFlags } from "@/features/extract/components/red-flags";
import { QuestionsPanel } from "@/features/interview/components/questions-panel";
import { MatchPanel } from "@/features/match/components/match-panel";
import { scoreMatch } from "@/features/match/lib/score";
import { NotesSection } from "@/features/notes/components/notes-section";
import { getApplicationOr404 } from "@/lib/db/queries/applications";
import { getNotesForApplication } from "@/lib/db/queries/notes";
import { getProfile } from "@/lib/db/queries/profile";

import { EditApplicationSheet } from "./edit-application-sheet";

/** Server Component shared by the modal and the full page: card data, match, interview prep and notes. */
export async function ApplicationSheetContent({ id }: { id: string }) {
  const [application, notes, profile] = await Promise.all([
    getApplicationOr404(id),
    getNotesForApplication(id),
    getProfile(),
  ]);
  const { matchComment, roastComment, interviewQuestions, ...card } = application;
  return (
    <EditApplicationSheet
      application={card}
      header={
        <MatchPanel
          // A new comment from the server (reopening the card) replaces local state.
          key={`${matchComment?.createdAt}-${roastComment?.createdAt}`}
          applicationId={application.id}
          breakdown={scoreMatch(profile, application)}
          saved={{ coach: matchComment, roast: roastComment }}
        />
      }
    >
      <RedFlags flags={application.redFlags} />
      <QuestionsPanel
        key={interviewQuestions?.createdAt}
        applicationId={application.id}
        hasStack={application.stack.length > 0}
        saved={interviewQuestions}
      />
      {/* New server data (e.g. reopening the card) remounts the list from the source of truth. */}
      <NotesSection
        key={notes.map((n) => n.id).join(",")}
        applicationId={application.id}
        notes={notes}
      />
    </EditApplicationSheet>
  );
}
