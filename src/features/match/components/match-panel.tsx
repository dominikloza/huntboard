"use client";

import { useObject } from "@ai-sdk/react";
import { type DeepPartial } from "ai";
import { ArrowClockwiseIcon, StopIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";

import { PenNote } from "@/components/paper/pen";
import { Button } from "@/components/ui/button";
import { MatchBadge } from "@/features/board/components/match-badge";
import { formatDateTime } from "@/lib/format";
import { aiFetch } from "@/lib/ai/client-fetch";
import { cn } from "@/lib/utils";

import { type MatchBreakdown } from "../lib/score";
import {
  type MatchComment,
  matchCommentSchema,
  type MatchTone,
  type StoredMatchComment,
} from "../schemas";

type ShownComment = DeepPartial<MatchComment> & { createdAt?: string; streaming?: boolean };

const TONES: { tone: MatchTone; label: string }[] = [
  { tone: "coach", label: "Komentarz" },
  { tone: "roast", label: "Roast" },
];

const ACTION: Record<MatchTone, { first: string; again: string; busy: string }> = {
  coach: { first: "Skomentuj z AI", again: "Skomentuj jeszcze raz", busy: "AI pisze komentarz..." },
  roast: { first: "Zrób roast", again: "Jeszcze jeden roast", busy: "Rekruter ostrzy długopis..." },
};

const points = (score: number, weight: number) => Math.round(score * weight * 100);

/**
 * Match score of one card (ADR 011): the computed breakdown, then an AI comment in one of two
 * tones. The score never comes from the AI; the comment is saved with the card.
 */
export function MatchPanel({
  applicationId,
  breakdown,
  saved,
  hasStack = true,
}: {
  applicationId: string;
  breakdown: MatchBreakdown | null;
  /** Without a stack (a card from an e-mail) the score and comments have little to work on. */
  hasStack?: boolean;
  saved: Record<MatchTone, StoredMatchComment | null>;
}) {
  const [tone, setTone] = useState<MatchTone>("coach");
  const [streamTone, setStreamTone] = useState<MatchTone | null>(null);
  // onFinish runs with the props of the render that started the request: read the tone from a ref.
  const streamToneRef = useRef<MatchTone | null>(null);
  // Comments finished in this visit (the server saves them too; this avoids a refetch).
  const [fresh, setFresh] = useState<Partial<Record<MatchTone, ShownComment>>>({});

  const comment = useObject({
    api: "/api/match",
    schema: matchCommentSchema,
    fetch: aiFetch,
    onFinish: ({ object }) => {
      const finished = streamToneRef.current;
      if (object && finished) {
        setFresh((all) => ({
          ...all,
          [finished]: { ...object, createdAt: new Date().toISOString() },
        }));
      }
    },
  });

  if (!breakdown) {
    return (
      <section aria-labelledby="match-heading" className="flex flex-col gap-2">
        <h3 id="match-heading" className="font-display text-lg font-bold">
          Dopasowanie
        </h3>
        <p className="text-sm text-muted-foreground">
          Uzupełnij profil, a policzę, jak ta oferta pasuje do Ciebie.
        </p>
        <Link
          href="/profile"
          className="w-fit text-sm font-semibold text-primary-ink underline underline-offset-2"
        >
          Przejdź do profilu
        </Link>
      </section>
    );
  }

  const ours = streamTone === tone;
  // While streaming: the partial answer. Then: the finished one (with its date), or, if the
  // stream was stopped or cut, what arrived. Otherwise the comment saved earlier.
  const shown: ShownComment | null =
    ours && comment.isLoading
      ? { ...comment.object, streaming: true }
      : (fresh[tone] ?? (ours && comment.object ? comment.object : saved[tone]));
  const hasComment = Boolean(fresh[tone] ?? saved[tone]);

  function run() {
    streamToneRef.current = tone;
    setStreamTone(tone);
    void comment.submit({ applicationId, tone });
  }

  return (
    <section aria-labelledby="match-heading" className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <MatchBadge score={breakdown.score} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id="match-heading" className="font-display text-lg font-bold">
            Dopasowanie
          </h3>
          <p className="text-sm text-muted-foreground">
            Policzone z Twojego profilu, bez AI. Szczegóły:
          </p>
        </div>
      </div>

      <dl className="grid gap-2 text-sm">
        {breakdown.parts.map((part) => (
          <div
            key={part.key}
            className="grid grid-cols-[5.5rem_3rem_1fr] items-baseline gap-2 sm:grid-cols-[7.5rem_3.5rem_1fr]"
          >
            <dt className="font-semibold">{part.label}</dt>
            <dd className="font-mono text-xs text-muted-foreground">
              {points(part.score, part.weight)}/{Math.round(part.weight * 100)}
            </dd>
            <dd className={cn(!part.known && "text-muted-foreground")}>{part.summary}</dd>
          </div>
        ))}
      </dl>

      {!hasStack && (
        <p className="border-l-[1.5px] border-ink pl-3 text-sm">
          Ta teczka nie ma stacku, więc wynik i komentarz będą mało warte. Najpierw uzupełnij ją z
          ogłoszenia poniżej.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Ton komentarza" className="flex">
          {TONES.map(({ tone: t, label }) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={t === "roast" ? "pen" : "secondary"}
              aria-pressed={tone === t}
              onClick={() => setTone(t)}
              className={cn(
                "first:rounded-r-none last:-ml-[1.5px] last:rounded-l-none",
                t === "coach" && tone === "coach" && "bg-ink text-background hover:bg-ink",
              )}
            >
              {label}
            </Button>
          ))}
        </div>
        {comment.isLoading ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => comment.stop()}>
            <StopIcon aria-hidden weight="fill" /> Zatrzymaj
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={tone === "roast" ? "pen" : "primary"}
            onClick={run}
          >
            {hasComment && <ArrowClockwiseIcon aria-hidden />}
            {hasComment ? ACTION[tone].again : ACTION[tone].first}
          </Button>
        )}
      </div>

      <p role="status" className="sr-only">
        {comment.isLoading && streamTone ? ACTION[streamTone].busy : ""}
      </p>
      {comment.error && streamTone === tone && (
        <p role="alert" className="text-sm text-pen">
          {comment.error.message}
        </p>
      )}

      {shown &&
        (tone === "roast" ? <RoastComment comment={shown} /> : <CoachComment comment={shown} />)}
    </section>
  );
}

function Written({ comment }: { comment: ShownComment }) {
  if (comment.streaming || !comment.createdAt) return null;
  return (
    <p className="font-mono text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</p>
  );
}

const list = (items: (string | undefined)[] | undefined) =>
  (items ?? []).filter((item): item is string => Boolean(item));

function CoachComment({ comment }: { comment: ShownComment }) {
  return (
    <article
      aria-label="Komentarz AI"
      aria-busy={comment.streaming === true}
      className="flex flex-col gap-3"
    >
      {comment.verdict && <p className="font-medium">{comment.verdict}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <CommentList title="Mocne strony" items={list(comment.strengths)} />
        <CommentList title="Braki" items={list(comment.gaps)} />
      </div>
      {comment.advice && (
        <p className="border-l-[1.5px] border-ink pl-3 text-sm">
          <span className="font-semibold">Następny krok: </span>
          {comment.advice}
        </p>
      )}
      <Written comment={comment} />
    </article>
  );
}

function CommentList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="font-display text-sm font-bold">{title}</h4>
      <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Roast mode: the only place in the app with the red pen and handwriting (ADR 002). */
function RoastComment({ comment }: { comment: ShownComment }) {
  const gaps = list(comment.gaps);
  const strengths = list(comment.strengths);
  return (
    <article
      aria-label="Roast"
      aria-busy={comment.streaming === true}
      className="flex flex-col gap-3 border-l-2 border-pen bg-card py-1 pl-4"
    >
      {comment.verdict && <PenNote className="text-[26px]">{comment.verdict}</PenNote>}
      {gaps.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {gaps.map((gap, index) => (
            <li key={gap}>
              <PenNote delay={index * 120}>{gap}</PenNote>
            </li>
          ))}
        </ul>
      )}
      {strengths.length > 0 && (
        <p className="text-sm">
          <span className="font-semibold">Na obronę: </span>
          {strengths.join(" ")}
        </p>
      )}
      {comment.advice && (
        <p className="text-sm">
          <span className="font-semibold">A na serio: </span>
          {comment.advice}
        </p>
      )}
      <Written comment={comment} />
    </article>
  );
}
