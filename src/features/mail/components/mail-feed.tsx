"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { type ApplicationStatus, STATUS_LABELS } from "@/features/board/constants";
import { applicationKeys } from "@/features/board/query-keys";
import { formatDateTime } from "@/lib/format";
import { pluralPl } from "@/lib/plural";
import { cn } from "@/lib/utils";

import { acceptMailProposal, undoMail } from "../actions";

export type FeedItem = {
  id: string;
  type: "mail" | "timeout";
  at: string;
  kind: string | null;
  action: "created" | "moved" | "none" | "unmatched" | "proposal" | "undone" | null;
  subject: string | null;
  company: string | null;
  role: string | null;
  previousStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus | null;
};

const label = (status: ApplicationStatus | null) => (status ? STATUS_LABELS[status] : "-");
const who = (item: FeedItem) =>
  [item.role, item.company].filter(Boolean).join(", ") || "nieznana firma";

/** One line in plain Polish: what happened to which card. */
function describe(item: FeedItem): string {
  if (item.type === "timeout") {
    return `${who(item)}: brak odpowiedzi, przeniesiono do ${label("rejected")}`;
  }
  switch (item.action) {
    case "created":
      return `Nowa teczka: ${who(item)}`;
    case "moved":
      return `${who(item)}: ${label(item.previousStatus)} → ${label(item.newStatus)}`;
    case "proposal":
      return item.previousStatus
        ? `${who(item)}: przenieść do ${label(item.newStatus)}?`
        : `Założyć teczkę: ${who(item)}?`;
    case "unmatched":
      return `Odpowiedź (${item.kind === "rejected" ? "odmowa" : item.kind === "interview" ? "zaproszenie" : "mail"}) od ${item.company ?? "firmy"} nie pasuje do żadnej teczki`;
    case "undone":
      return `Cofnięto: ${who(item)}`;
    default:
      return `${who(item)}: zgłoszenie w trakcie`;
  }
}

/**
 * What the mail sync changed on the board in the last two weeks (ADR 017), with "Cofnij" for
 * every automatic change and "Zatwierdź" for proposals the AI was not sure about.
 */
export function MailFeed({ items }: { items: FeedItem[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const proposals = items.filter((i) => i.action === "proposal").length;
  const changes = items.filter((i) => i.action !== "undone").length;

  const run = (action: (id: string) => Promise<{ ok: boolean; error?: string }>, id: string) =>
    startTransition(async () => {
      setError(null);
      const result = await action(id);
      if (!result.ok) {
        setError(result.error ?? "Coś poszło nie tak.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      router.refresh();
    });

  return (
    <details
      className="group mb-6 border-[1.5px] border-ink bg-card"
      open={proposals > 0 || undefined}
    >
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 px-4 py-3 text-sm">
        <span className="font-semibold">Z poczty</span>
        <span className="text-muted-foreground">
          {changes === 0
            ? "nic nowego w ostatnich 14 dniach"
            : `${changes} ${pluralPl(changes, ["zmiana", "zmiany", "zmian"])} w ostatnich 14 dniach`}
        </span>
        {proposals > 0 && (
          <span className="font-semibold text-primary-ink">{proposals} do zatwierdzenia</span>
        )}
      </summary>
      {items.length > 0 && (
        <ul aria-busy={pending} className="flex flex-col border-t border-dashed border-border">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2.5 last:border-b-0",
                item.action === "undone" && "text-muted-foreground",
              )}
            >
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                {formatDateTime(item.at)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("text-sm", item.action === "proposal" && "font-semibold")}>
                  {describe(item)}
                </span>
                {item.subject && (
                  <span className="truncate text-xs text-muted-foreground">{item.subject}</span>
                )}
              </span>
              {item.action === "proposal" && (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(acceptMailProposal, item.id)}
                >
                  Zatwierdź
                </Button>
              )}
              {(item.action === "created" || item.action === "moved") && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(undoMail, item.id)}
                >
                  Cofnij
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="border-t border-border px-4 py-2 text-sm text-pen">
          {error}
        </p>
      )}
    </details>
  );
}
