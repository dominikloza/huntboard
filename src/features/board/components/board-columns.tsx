import { APPLICATION_STATUSES, STATUS_LABELS } from "../constants";
import { groupByStatus } from "../lib/group-by-status";
import { type Application } from "../types";

import { BoardScroller } from "./board-scroller";
import { FolderColumn } from "./folder-column";
import { OfferCard } from "./offer-card";

/** Read-only board. Drag & drop arrives on Day 3. */
export function BoardColumns({ applications }: { applications: Application[] }) {
  const columns = groupByStatus(applications);
  return (
    <BoardScroller label="Kartoteka aplikacji, przewijana w poziomie">
      {APPLICATION_STATUSES.map((status) => (
        <FolderColumn
          key={status}
          title={STATUS_LABELS[status]}
          count={columns[status].length}
          active={status === "interview" && columns.interview.length > 0}
        >
          {columns[status].map((application) => (
            <OfferCard key={application.id} application={application} />
          ))}
        </FolderColumn>
      ))}
    </BoardScroller>
  );
}

/** Shaped like the real board, so nothing jumps when data arrives. */
export function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Ładuję kartotekę...</span>
      <div aria-hidden className="overflow-hidden pb-2">
        <div className="grid min-w-[1060px] grid-cols-5 gap-3.5">
          {APPLICATION_STATUSES.map((status) => (
            <div key={status} className="flex flex-col">
              <div className="h-[30px] w-28 rounded-t-tab border-[1.5px] border-b-0 border-ink bg-card" />
              <div className="flex min-h-[420px] flex-col gap-2.5 border-[1.5px] border-ink bg-folder p-2.5">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[92px] animate-pulse border border-border bg-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
