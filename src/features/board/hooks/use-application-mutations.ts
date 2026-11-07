"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createApplication, deleteApplication, updateApplication } from "../actions";
import { removeCard, upsertCard } from "../lib/cache";
import { applicationKeys } from "../query-keys";
import { type ApplicationInput } from "../schemas";
import { type Application } from "../types";

/**
 * Board mutations: Server Actions + TanStack Query cache updates.
 * The action result is returned (not thrown) so forms can show field errors.
 * After a success the cache is updated right away, then re-synced with the server.
 */
export function useApplicationMutations() {
  const queryClient = useQueryClient();

  const syncCard = (card: Application) => {
    queryClient.setQueryData<Application[]>(applicationKeys.all, (list) => upsertCard(list, card));
    void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
  };

  const create = useMutation({
    mutationFn: (values: ApplicationInput) => createApplication(values),
    onSuccess: (result) => {
      if (result.ok) syncCard(result.data);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ApplicationInput }) =>
      updateApplication(id, values),
    onSuccess: (result) => {
      if (result.ok) syncCard(result.data);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData<Application[]>(applicationKeys.all, (list) =>
        removeCard(list, result.data.id),
      );
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });

  return { create, update, remove };
}
