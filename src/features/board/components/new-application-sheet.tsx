"use client";

import { useApplicationMutations } from "../hooks/use-application-mutations";

import { ApplicationForm, EMPTY_APPLICATION_FORM } from "./application-form";
import { useCloseSheet } from "./sheet-frame";

export function NewApplicationSheet() {
  const { create } = useApplicationMutations();
  const close = useCloseSheet();

  return (
    <ApplicationForm
      defaultValues={EMPTY_APPLICATION_FORM}
      submitLabel="Dodaj do kartoteki"
      pendingLabel="Zapisuję..."
      onSubmit={(values) => create.mutateAsync(values)}
      onSuccess={close}
      onCancel={close}
      resetOnSuccess
    />
  );
}
