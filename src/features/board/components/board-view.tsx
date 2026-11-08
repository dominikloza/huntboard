"use client";

import { Plus, X } from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { useMemo } from "react";

import { IntentLink } from "@/components/intent-link";
import { Button } from "@/components/ui/button";
import { pluralPl } from "@/lib/plural";

import {
  boardFilterParsers,
  filterApplications,
  isFiltering,
  neighboursInFullColumn,
} from "../filters";
import { useMoveCard } from "../hooks/use-move-card";
import { toColumnItems } from "../lib/move";
import { type MoveInput } from "../schemas";
import { applicationsQuery, SessionExpiredError } from "../queries";

import { BoardColumns } from "./board-columns";
import { FilterBar } from "./filter-bar";

/** Client board: reads the hydrated TanStack Query cache, updates when mutations change it. */
export function BoardView() {
  const { data, error, refetch, isRefetching } = useQuery(applicationsQuery);
  const applications = useMemo(() => data ?? [], [data]);
  const active = applications.filter((a) => a.status === "applied" || a.status === "interview");
  const { move, error: moveError, dismissError } = useMoveCard();

  const [filters, setFilters] = useQueryStates(boardFilterParsers);
  const filtering = isFiltering(filters);
  // Memoised: the board holds the dropped order until this array changes (ADR 007).
  const visible = useMemo(
    () => (filtering ? filterApplications(applications, filters) : applications),
    [applications, filters, filtering],
  );

  // With a filter on, hidden cards may sit between the visible ones: use real neighbours.
  const moveVisible = (target: Omit<MoveInput, "version">) =>
    move(
      filtering
        ? {
            ...target,
            ...neighboursInFullColumn(
              toColumnItems(applications)[target.status],
              target.id,
              target.prevId,
            ),
          }
        : target,
    );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {applications.length === 0
            ? "Kartoteka jest pusta. Dodaj pierwszą ofertę."
            : `${applications.length} ${pluralPl(applications.length, ["teczka", "teczki", "teczek"])}, ${active.length} w obiegu`}
        </p>
        <Button asChild>
          <IntentLink href="/board/new">
            <Plus aria-hidden weight="bold" />
            Dodaj ofertę
          </IntentLink>
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center gap-3 border-[1.5px] border-pen px-4 py-3 text-sm"
        >
          {error instanceof SessionExpiredError ? (
            <>
              <span>Sesja wygasła.</span>
              <Link
                href="/login?next=/board"
                className="font-semibold underline underline-offset-4"
              >
                Zaloguj się ponownie
              </Link>
            </>
          ) : (
            <>
              <span>Nie udało się odświeżyć kartoteki. Pokazuję ostatnią wersję.</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                Spróbuj ponownie
              </Button>
            </>
          )}
        </div>
      )}

      {moveError && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center gap-3 border-[1.5px] border-pen px-4 py-3 text-sm"
        >
          <span>{moveError}</span>
          <Button size="sm" variant="ghost" onClick={dismissError} aria-label="Zamknij komunikat">
            <X aria-hidden weight="bold" />
          </Button>
        </div>
      )}

      <FilterBar className="mb-3" />
      <p className="mb-4 min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {filtering &&
          (visible.length === 0 ? (
            <>
              Nic nie pasuje do filtrów.{" "}
              <button
                type="button"
                onClick={() => setFilters({ q: null, mode: null, min: null })}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Pokaż wszystko
              </button>
            </>
          ) : (
            `Pokazuję ${visible.length} z ${applications.length} ${pluralPl(applications.length, ["teczki", "teczek", "teczek"])}.`
          ))}
      </p>

      <BoardColumns
        applications={visible}
        onMove={moveVisible}
        emptyMessage={filtering ? "Brak pasujących kart." : undefined}
      />
    </>
  );
}
