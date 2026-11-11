"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

import { createMailToken, disconnectMail, setAutoRejectDays } from "../actions";
import { AUTO_REJECT_CHOICES, type AutoRejectChoice } from "../schemas";

const CHOICE_LABEL: Record<AutoRejectChoice, string> = {
  off: "nigdy",
  "14": "14 dniach",
  "21": "21 dniach",
  "30": "30 dniach",
  "45": "45 dniach",
};

export type MailSettingsProps = {
  connection: {
    tokenHint: string;
    autoRejectDays: number | null;
    lastSyncAt: string | null;
  } | null;
  isGuest: boolean;
  script: string;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? "Skopiowano" : label}
    </Button>
  );
}

/**
 * Mail sync settings (ADR 017): a personal token for the Gmail script, the script itself with
 * the steps to install it, and the auto-reject rule.
 */
export function MailSettings({ connection, isGuest, script }: MailSettingsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Coś poszło nie tak.");
      else {
        after?.();
        router.refresh();
      }
    });

  const generate = () =>
    startTransition(async () => {
      setError(null);
      const result = await createMailToken();
      if (result.ok) {
        setToken(result.data.token);
        router.refresh();
      } else setError(result.error);
    });

  const choice: AutoRejectChoice =
    connection?.autoRejectDays == null
      ? "off"
      : (AUTO_REJECT_CHOICES.find((c) => c === String(connection.autoRejectDays)) ?? "30");

  return (
    <section aria-labelledby="mail-heading" className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 id="mail-heading" className="font-display text-2xl font-bold tracking-tight">
          Poczta
        </h2>
        <p className="text-sm text-muted-foreground">
          Huntboard może sam zakładać teczki i przesuwać je po mailach z rekrutacji: potwierdzeniach
          z JustJoin.it, No Fluff Jobs i eRecruitera oraz odpowiedziach firm. Działa przez mały
          skrypt w Twoim Gmailu. Do Huntboard trafiają tylko maile rekrutacyjne, a ich treść nie
          jest zapisywana, tylko wynik.
        </p>
      </div>

      {isGuest && (
        <p className="border-[1.5px] border-dashed border-border px-4 py-3 text-sm">
          Konto gościa znika po około dwóch tygodniach bez wizyty, a z nim token. Na stałe podłącz
          pocztę po zalogowaniu przez GitHub.
        </p>
      )}
      {connection ? (
        <div className="flex flex-col gap-3 border-[1.5px] border-ink bg-card px-4 py-3.5 text-sm">
          <p>
            <span className="font-semibold">Podłączono.</span> Token{" "}
            <span className="font-mono">{connection.tokenHint}</span>
            {connection.lastSyncAt ? (
              <>
                , ostatnia synchronizacja{" "}
                <span className="font-mono">{formatDateTime(connection.lastSyncAt)}</span>.
              </>
            ) : (
              ", skrypt jeszcze się nie odezwał."
            )}
          </p>
          <label className="flex flex-wrap items-center gap-2">
            <span>Przenieś do Odrzucone teczki bez odpowiedzi po</span>
            <select
              className="h-9 border-b-[1.5px] border-ink bg-transparent px-1 font-mono"
              defaultValue={choice}
              disabled={pending}
              onChange={(event) => run(() => setAutoRejectDays(event.target.value))}
            >
              {AUTO_REJECT_CHOICES.map((c) => (
                <option key={c} value={c}>
                  {CHOICE_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={generate}
            >
              Nowy token
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run(disconnectMail, () => setToken(null))}
            >
              Odłącz pocztę
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" className="w-fit" disabled={pending} onClick={generate}>
          Podłącz Gmaila
        </Button>
      )}

      {token && (
        <div className="flex flex-col gap-2 border-[1.5px] border-ink bg-card px-4 py-3.5">
          <label htmlFor="mail-token" className="text-sm font-semibold">
            Twój token (pokazuję go tylko raz)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="mail-token"
              readOnly
              value={token}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 border-b-[1.5px] border-ink bg-transparent py-1.5 font-mono text-sm"
            />
            <CopyButton text={token} label="Kopiuj token" />
          </div>
        </div>
      )}

      {(connection || token) && (
        <details className="group border-[1.5px] border-border" open={Boolean(token)}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
            Jak podłączyć skrypt (4 kroki, ok. 3 minuty)
          </summary>
          <ol className="flex list-decimal flex-col gap-2 border-t border-dashed border-border py-3 pr-4 pl-9 text-sm">
            <li>
              Otwórz{" "}
              <a
                href="https://script.google.com/home/projects/create"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary-ink underline underline-offset-4"
              >
                script.google.com
              </a>{" "}
              na koncie z pocztą rekrutacyjną i utwórz nowy projekt.
            </li>
            <li>Wklej poniższy skrypt w miejsce przykładowego kodu i zapisz.</li>
            <li>
              W ustawieniach projektu (koło zębate) dodaj właściwość skryptu{" "}
              <span className="font-mono">HUNTBOARD_TOKEN</span> z Twoim tokenem.
            </li>
            <li>
              Wybierz funkcję <span className="font-mono">setup</span> i kliknij Uruchom. Google
              zapyta o dostęp do Gmaila: to Twój własny skrypt, więc pokaże ostrzeżenie o
              niezweryfikowanej aplikacji. Potem skrypt sprawdza pocztę co godzinę.
            </li>
          </ol>
          <div className="flex flex-col gap-2 border-t border-dashed border-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">huntboard.gs</span>
              <CopyButton text={script} label="Kopiuj skrypt" />
            </div>
            <pre
              tabIndex={0}
              role="region"
              aria-label="Skrypt do Gmaila"
              className="max-h-72 overflow-auto bg-folder p-3 font-mono text-xs leading-relaxed"
            >
              {script}
            </pre>
          </div>
        </details>
      )}

      {error && (
        <p role="alert" className="text-sm text-pen">
          {error}
        </p>
      )}
    </section>
  );
}
