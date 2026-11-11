"use client";

import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { RedFlags } from "@/features/extract/components/red-flags";
import { OfferFillPanel } from "@/features/offer/components/offer-fill-panel";
import { useOfferFill } from "@/features/offer/hooks/use-offer-fill";

import { useApplicationMutations } from "../hooks/use-application-mutations";
import { type Application } from "../types";

import { ApplicationForm, toFormValues } from "./application-form";
import { useCloseSheet } from "./sheet-frame";

export function EditApplicationSheet({
  application,
  hasOffer,
  header,
  children,
}: {
  application: Application;
  /** The card was read from an offer (AI intake or "Uzupełnij z ogłoszenia"). */
  hasOffer: boolean;
  /** Shown above the form (e.g. the match score). */
  header?: ReactNode;
  /** Extra sections between the form and the danger zone (e.g. notes). */
  children?: ReactNode;
}) {
  const { update, remove } = useApplicationMutations();
  const close = useCloseSheet();
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // The sheet is keyed by version, so the first values stay right for its lifetime.
  const [defaults] = useState(() => toFormValues(application));
  const fill = useOfferFill({ card: defaults, workModeIsGuess: !hasOffer });
  const incomplete = application.stack.length === 0 || !hasOffer;

  async function confirmDelete() {
    setDeleteError(null);
    const result = await remove.mutateAsync(application.id);
    if (result.ok) close();
    else setDeleteError(result.error);
  }

  return (
    <div className="flex flex-col gap-8">
      {header && <div className="border-b-[1.5px] border-dashed border-border pb-6">{header}</div>}
      <OfferFillPanel fill={fill} offerUrl={application.offerUrl} incomplete={incomplete} />
      <ApplicationForm
        // Fresh server data (e.g. the card changed elsewhere) remounts the form with new values,
        // instead of showing a state kept alive from an earlier visit.
        key={JSON.stringify(application)}
        defaultValues={defaults}
        stream={fill.stream}
        beforeActions={<RedFlags flags={fill.redFlags} />}
        submitLabel="Zapisz zmiany"
        pendingLabel="Zapisuję..."
        onSubmit={(values) =>
          update.mutateAsync({ id: application.id, values: { ...values, ...fill.extras } })
        }
        onSuccess={close}
        onCancel={close}
      />

      {children && (
        <div className="border-t-[1.5px] border-dashed border-border pt-6">{children}</div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t-[1.5px] border-dashed border-border pt-5">
        {confirming ? (
          <>
            <p id="delete-question" className="text-sm">
              Usunąć tę aplikację z kartoteki? Tego nie da się cofnąć.
            </p>
            <Button
              variant="pen"
              size="sm"
              aria-describedby="delete-question"
              onClick={confirmDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Usuwam..." : "Tak, usuń"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Zostaw
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Usuń z kartoteki
          </Button>
        )}
        <p role="alert" className="text-sm text-pen">
          {deleteError}
        </p>
      </div>
    </div>
  );
}
