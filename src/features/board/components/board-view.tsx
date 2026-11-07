"use client";

import { Plus, X } from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { pluralPl } from "@/lib/plural";

import { useMoveCard } from "../hooks/use-move-card";
import { applicationsQuery, SessionExpiredError } from "../queries";

import { BoardColumns } from "./board-columns";

/** Client board: reads the hydrated TanStack Query cache, updates when mutations change it. */
export function BoardView() {
  const { data: applications = [], error, refetch, isRefetching } = useQuery(applicationsQuery);
  const active = applications.filter((a) => a.status === "applied" || a.status === "interview");
  const { move, error: moveError, dismissError } = useMoveCard();

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {applications.length === 0
            ? "Kartoteka jest pusta. Dodaj pierwszą ofertę."
            : `${applications.length} ${pluralPl(applications.length, ["teczka", "teczki", "teczek"])}, ${active.length} w obiegu`}
        </p>
        <Button asChild>
          <Link href="/board/new">
            <Plus aria-hidden weight="bold" />
            Dodaj ofertę
          </Link>
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

      <BoardColumns applications={applications} onMove={move} />
    </>
  );
}
