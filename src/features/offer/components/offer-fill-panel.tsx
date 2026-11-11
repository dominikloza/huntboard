"use client";

import { StopIcon } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { OFFER_MAX_LENGTH } from "@/features/board/constants";

import { type FillPhase, type OfferFill } from "../hooks/use-offer-fill";
import { OFFER_SITE_NAMES } from "../lib/offer-url";

const PHASE_COPY: Partial<Record<FillPhase, string>> = {
  "loading-page": "Pobieram ogłoszenie...",
  streaming: "AI czyta ogłoszenie i uzupełnia puste pola...",
  done: "Gotowe. Uzupełnione pola są podświetlone. Sprawdź je i kliknij Zapisz zmiany.",
  stopped: "Zatrzymano. Zapisz to, co AI zdążyło uzupełnić, albo spróbuj ponownie.",
  incomplete: "AI nie dokończyło odpowiedzi. Sprawdź pola albo spróbuj ponownie.",
  empty: "To nie wygląda na ogłoszenie o pracę. Wklej pełną treść oferty.",
};

/**
 * The entry point of ADR 018 inside a card: a link (downloaded by the server) or the pasted
 * offer. Open by default when the card has no stack, folded away when it is complete.
 */
export function OfferFillPanel({
  fill,
  offerUrl,
  incomplete,
}: {
  fill: OfferFill;
  offerUrl: string | null;
  incomplete: boolean;
}) {
  const [source, setSource] = useState(offerUrl ?? "");
  const busy = fill.phase === "loading-page" || fill.phase === "streaming";
  const status = PHASE_COPY[fill.phase];

  function submit(event: FormEvent) {
    event.preventDefault();
    void fill.start(source);
  }

  return (
    <details
      open={incomplete || undefined}
      className="group border-[1.5px] border-dashed border-ink bg-folder/40"
    >
      <summary className="cursor-pointer px-4 py-3 text-sm">
        <span className="font-semibold">Uzupełnij z ogłoszenia</span>
        {incomplete && (
          <span className="text-muted-foreground"> - tej teczce brakuje stacku i opisu oferty</span>
        )}
      </summary>
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-3 border-t border-dashed border-border px-4 py-4"
      >
        <p className="text-sm text-muted-foreground">
          Bez stacku dopasowanie, roast i fiszki nie mają z czego korzystać. AI uzupełni tylko puste
          pola, a nic się nie zapisze bez Twojego kliknięcia.
        </p>
        <FormField
          label="Link albo treść ogłoszenia"
          hint={`Link pobiorę z: ${OFFER_SITE_NAMES}. Z innych stron wklej treść.`}
          error={fill.error ?? undefined}
        >
          {(field) => (
            <Textarea
              {...field}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submit(event);
              }}
              rows={3}
              maxLength={OFFER_MAX_LENGTH}
              placeholder="https://justjoin.it/job-offer/..."
              className="font-mono text-sm"
              readOnly={busy}
            />
          )}
        </FormField>
        <div className="flex flex-wrap items-center gap-3">
          {fill.phase === "streaming" ? (
            <Button type="button" size="sm" variant="secondary" onClick={fill.stop}>
              <StopIcon aria-hidden weight="fill" /> Zatrzymaj
            </Button>
          ) : (
            <Button type="submit" size="sm" disabled={busy || source.trim() === ""}>
              {fill.phase === "loading-page" ? "Pobieram..." : "Uzupełnij z AI"}
            </Button>
          )}
          {offerUrl && (
            <a
              href={offerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-primary-ink underline underline-offset-4"
            >
              Otwórz ogłoszenie
            </a>
          )}
        </div>
        <p role="status" className="text-sm text-muted-foreground">
          {status}
        </p>
      </form>
    </details>
  );
}
