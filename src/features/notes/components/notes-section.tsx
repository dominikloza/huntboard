"use client";

import { Trash } from "@phosphor-icons/react/ssr";
import { type FormEvent, useId, useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { addNote, deleteNote } from "../actions";
import { NOTE_MAX_LENGTH } from "../schemas";
import { type Note } from "../types";

type OptimisticNote = Note & { pending?: boolean };
type NoteAction = { type: "add"; note: OptimisticNote } | { type: "remove"; id: string };

function reduce(notes: OptimisticNote[], action: NoteAction): OptimisticNote[] {
  return action.type === "add"
    ? [action.note, ...notes]
    : notes.filter((note) => note.id !== action.id);
}

/**
 * Notes for one application. React 19 useOptimistic: the note shows up (or disappears) at once,
 * the Server Action saves it and the confirmed note replaces the optimistic one. If saving
 * fails, the optimistic state is dropped automatically and the draft comes back.
 */
export function NotesSection({ applicationId, notes }: { applicationId: string; notes: Note[] }) {
  const id = useId();
  // Confirmed notes: start from the server, then apply confirmed changes here. The next server
  // render (reopening the card) remounts this component with fresh data (see the key).
  const [saved, setSaved] = useState(notes);
  const [optimisticNotes, apply] = useOptimistic<OptimisticNote[], NoteAction>(saved, reduce);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body) {
      setError("Wpisz treść notatki.");
      return;
    }
    setError(null);
    setDraft("");
    startTransition(async () => {
      apply({
        type: "add",
        note: {
          id: `pending-${crypto.randomUUID()}`,
          body,
          createdAt: new Date().toISOString(),
          pending: true,
        },
      });
      const result = await addNote({ applicationId, body });
      if (result.ok) {
        setSaved((current) => [result.data, ...current]);
      } else {
        setError(result.error);
        setDraft(body);
      }
    });
  }

  function remove(note: Note) {
    setError(null);
    startTransition(async () => {
      apply({ type: "remove", id: note.id });
      const result = await deleteNote(note.id);
      if (result.ok) setSaved((current) => current.filter((n) => n.id !== note.id));
      else setError(result.error);
    });
  }

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h3 id={`${id}-title`} className="font-display text-lg font-bold tracking-tight">
        Notatki
      </h3>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor={`${id}-body`} className="sr-only">
          Nowa notatka
        </label>
        <Textarea
          id={`${id}-body`}
          value={draft}
          maxLength={NOTE_MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
          placeholder="Z kim rozmawiałeś, co ustaliliście, kiedy następny kontakt..."
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" variant="secondary">
            Dodaj notatkę
          </Button>
          <span id={`${id}-hint`} className="font-mono text-xs text-muted-foreground">
            Ctrl+Enter · {draft.length} / {NOTE_MAX_LENGTH}
          </span>
          <p role="alert" className="text-sm text-pen">
            {error}
          </p>
        </div>
      </form>

      {optimisticNotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Brak notatek. Zapisz, z kim rozmawiałeś i co ustaliliście.
        </p>
      ) : (
        <ol
          className="flex flex-col divide-y divide-border border-t border-border"
          aria-label="Lista notatek"
        >
          {optimisticNotes.map((note) => (
            <li key={note.id} className={cn("flex gap-3 py-3", note.pending && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className="text-sm break-words whitespace-pre-wrap">{note.body}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {note.pending ? "Zapisuję..." : formatDateTime(note.createdAt)}
                </p>
              </div>
              {!note.pending && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={`Usuń notatkę z ${formatDateTime(note.createdAt)}`}
                  onClick={() => remove(note)}
                >
                  <Trash aria-hidden weight="bold" />
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
