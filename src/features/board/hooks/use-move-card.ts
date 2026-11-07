"use client";

import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { moveApplication } from "../actions";
import { upsertCard } from "../lib/cache";
import { applyMove, resolveMovePosition, restoreCard } from "../lib/move";
import { applicationKeys } from "../query-keys";
import { type MoveInput } from "../schemas";
import { type Application } from "../types";

const MOVE_KEY = ["board-move"] as const;

type MoveVariables = MoveInput & { original: Application };

/**
 * Optimistic drag & drop (ADR 007):
 * 1. the cache is updated synchronously on drop (no flash of the old order),
 * 2. the Server Action runs; moves are queued one after another (mutation scope),
 * 3. on failure only the moved card goes back, the user gets a message, the board refetches.
 */
export function useMoveCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const pendingMoves = useIsMutating({ mutationKey: MOVE_KEY });

  const rollback = (original: Application, message: string) => {
    queryClient.setQueryData<Application[]>(applicationKeys.all, (list) =>
      list ? restoreCard(list, original) : list,
    );
    setError(message);
  };

  const mutation = useMutation({
    mutationKey: MOVE_KEY,
    scope: { id: "board-move" },
    mutationFn: ({ original: _original, ...move }: MoveVariables) => moveApplication(move),
    onSuccess: (result, { original }) => {
      if (result.ok) {
        queryClient.setQueryData<Application[]>(applicationKeys.all, (list) =>
          upsertCard(list, result.data),
        );
      } else {
        rollback(original, result.error);
      }
    },
    onError: (_error, { original }) => {
      rollback(original, "Nie udało się zapisać przeniesienia. Karta wróciła na swoje miejsce.");
    },
    onSettled: () => {
      // Re-sync with the server once the queue is empty, so a refetch never overwrites
      // an optimistic move that is still waiting for its turn.
      if (queryClient.isMutating({ mutationKey: MOVE_KEY }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      }
    },
  });

  function move(target: Omit<MoveInput, "version">) {
    const list = queryClient.getQueryData<Application[]>(applicationKeys.all) ?? [];
    const original = list.find((card) => card.id === target.id);
    if (!original) return;

    const positionOf = (id: string | null) => list.find((c) => c.id === id)?.position ?? null;
    const resolved = resolveMovePosition({
      prevPosition: positionOf(target.prevId),
      nextPosition: positionOf(target.nextId),
      othersBetween: 0,
    });

    setError(null);
    void queryClient.cancelQueries({ queryKey: applicationKeys.all });
    if (resolved.ok) {
      queryClient.setQueryData<Application[]>(applicationKeys.all, (current) =>
        applyMove(current ?? list, {
          id: target.id,
          status: target.status,
          position: resolved.position,
        }).map((card) =>
          // Predict the server's version bump so a queued second move of this card is valid.
          card.id === target.id ? { ...card, version: card.version + 1 } : card,
        ),
      );
    }
    mutation.mutate({ ...target, version: original.version, original });
  }

  return { move, error, dismissError: () => setError(null), isSaving: pendingMoves > 0 };
}
