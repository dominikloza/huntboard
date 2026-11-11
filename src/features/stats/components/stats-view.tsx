import Link from "next/link";

import { STATUS_LABELS } from "@/features/board/constants";
import { pluralPl } from "@/lib/plural";
import { cn } from "@/lib/utils";

import { type FunnelStage, type Stats, WAITING_DAYS } from "../lib/stats";

const percent = (rate: number | null) => (rate === null ? "-" : `${Math.round(rate * 100)}%`);
const days = (n: number) => `${String(n).replace(".", ",")} ${n === 1 ? "dzień" : "dni"}`;
const shortDate = (date: Date) => `${date.getUTCDate()}.${date.getUTCMonth() + 1}`;

const STAGE_LABEL: Record<FunnelStage, string> = {
  applied: STATUS_LABELS.applied,
  interview: STATUS_LABELS.interview,
  offer: STATUS_LABELS.offer,
};

/** The statistics page body (server-rendered, no client JS). */
export function StatsView({ stats }: { stats: Stats }) {
  if (stats.total === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-3 border-[1.5px] border-dashed border-border p-6">
        <p className="font-display text-xl font-bold">Kartoteka jest pusta.</p>
        <p className="text-muted-foreground">
          Statystyki pojawią się, gdy dodasz pierwsze oferty i zaczniesz je przesuwać między
          etapami.
        </p>
        <Link
          href="/board"
          className="w-fit font-semibold text-primary-ink underline underline-offset-4"
        >
          Przejdź do kartoteki
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <Summary stats={stats} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <Funnel stats={stats} />
        <Waiting stats={stats} />
      </div>
      <Weekly stats={stats} />
    </div>
  );
}

function Summary({ stats }: { stats: Stats }) {
  const [sent, interview, offer] = stats.funnel;
  const figures = [
    {
      label: "Wysłane",
      value: String(sent?.reached ?? 0),
      note: `z ${stats.total} ${pluralPl(stats.total, ["teczki", "teczek", "teczek"])}`,
    },
    {
      label: "Rozmowy",
      value: String(interview?.reached ?? 0),
      note: `${percent(interview?.rate ?? null)} wysłanych`,
    },
    {
      label: "Oferty",
      value: String(offer?.reached ?? 0),
      note: `${percent(offer?.rate ?? null)} po rozmowie`,
    },
    {
      label: "Odpowiedź po",
      value: stats.answer.medianDays === null ? "-" : days(stats.answer.medianDays),
      note:
        stats.answer.count === 0
          ? "jeszcze bez odpowiedzi"
          : `mediana z ${stats.answer.count} ${pluralPl(stats.answer.count, ["odpowiedzi", "odpowiedzi", "odpowiedzi"])}`,
    },
  ];
  return (
    <dl className="grid grid-cols-2 border-y-[1.5px] border-ink sm:grid-cols-4">
      {figures.map((figure, index) => (
        <div
          key={figure.label}
          className={cn(
            "flex flex-col gap-1 px-1 py-5 sm:px-5",
            index > 0 && "sm:border-l sm:border-border",
            index % 2 === 1 && "max-sm:border-l max-sm:border-border max-sm:pl-4",
            index > 1 && "max-sm:border-t max-sm:border-border",
          )}
        >
          <dt className="text-sm font-semibold">{figure.label}</dt>
          <dd className="font-mono text-4xl leading-none font-semibold tracking-tight">
            {figure.value}
          </dd>
          <dd className="text-sm text-muted-foreground">{figure.note}</dd>
        </div>
      ))}
    </dl>
  );
}

function Funnel({ stats }: { stats: Stats }) {
  const rows = [
    { key: "all", label: "Wszystkie teczki", reached: stats.total, rate: null as number | null },
    ...stats.funnel.map((step) => ({ key: step.stage, label: STAGE_LABEL[step.stage], ...step })),
  ];
  return (
    <section aria-labelledby="funnel-heading" className="flex flex-col gap-5">
      <div>
        <h2 id="funnel-heading" className="font-display text-2xl font-bold tracking-tight">
          Lejek
        </h2>
        <p className="text-sm text-muted-foreground">
          Ile teczek doszło do każdego etapu. Odrzucone liczą się do etapu, na którym odpadły.
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const share = stats.total > 0 ? row.reached / stats.total : 0;
          return (
            <li
              key={row.key}
              className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1"
            >
              <span className="font-semibold">{row.label}</span>
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  title={`${row.label}: ${row.reached}`}
                  className={cn(
                    "h-6 rounded-[2px]",
                    row.reached > 0 ? "bg-primary" : "bg-transparent",
                  )}
                  style={{ width: `${Math.max(share * 100, row.reached > 0 ? 2 : 0)}%` }}
                />
                <span className="font-mono text-sm font-semibold">{row.reached}</span>
              </span>
              {index > 0 && (
                <span className="col-start-2 font-mono text-xs text-muted-foreground">
                  {percent(row.rate)} z poprzedniego etapu
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Waiting({ stats }: { stats: Stats }) {
  return (
    <section aria-labelledby="waiting-heading" className="flex flex-col gap-5">
      <div>
        <h2 id="waiting-heading" className="font-display text-2xl font-bold tracking-tight">
          Czekają na odpowiedź
        </h2>
        <p className="text-sm text-muted-foreground">
          Wysłane ponad {WAITING_DAYS} dni temu i bez ruchu. Dobry moment, żeby się przypomnieć.
        </p>
      </div>
      {stats.waiting.length === 0 ? (
        <p className="border-[1.5px] border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          Nic nie wisi dłużej niż {WAITING_DAYS} dni.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {stats.waiting.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 border-[1.5px] border-ink bg-card px-4 py-3 shadow-sheet"
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-muted-foreground">{item.company}</span>
                <Link
                  href={`/board/app/${item.id}`}
                  className="truncate font-display font-bold underline-offset-4 hover:underline"
                >
                  {item.role}
                </Link>
              </span>
              <span className="shrink-0 font-mono text-sm">{days(item.days)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Weekly({ stats }: { stats: Stats }) {
  const max = Math.max(1, ...stats.weekly.map((week) => week.sent));
  const total = stats.weekly.reduce((sum, week) => sum + week.sent, 0);
  return (
    <section aria-labelledby="weekly-heading" className="flex flex-col gap-5">
      <div>
        <h2 id="weekly-heading" className="font-display text-2xl font-bold tracking-tight">
          Wysłane w tygodniu
        </h2>
        <p className="text-sm text-muted-foreground">
          Ostatnie {stats.weekly.length} tygodni, od poniedziałku: razem {total}.
        </p>
      </div>
      <figure className="flex flex-col gap-2">
        <div aria-hidden className="flex h-40 items-end gap-2 border-b-[1.5px] border-ink sm:gap-4">
          {stats.weekly.map((week) => (
            <div
              key={week.start.toISOString()}
              title={`Tydzień od ${shortDate(week.start)}: ${week.sent}`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              {week.sent > 0 && (
                <span className="font-mono text-xs font-semibold">{week.sent}</span>
              )}
              <span
                className="w-full max-w-10 rounded-t-[2px] bg-primary"
                style={{ height: `${(week.sent / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div aria-hidden className="flex gap-2 sm:gap-4">
          {stats.weekly.map((week) => (
            <span
              key={week.start.toISOString()}
              className="flex-1 text-center font-mono text-xs text-muted-foreground"
            >
              {shortDate(week.start)}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>Wysłane aplikacje w kolejnych tygodniach</caption>
          <thead>
            <tr>
              <th scope="col">Tydzień od</th>
              <th scope="col">Wysłane</th>
            </tr>
          </thead>
          <tbody>
            {stats.weekly.map((week) => (
              <tr key={week.start.toISOString()}>
                <td>{shortDate(week.start)}</td>
                <td>{week.sent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </section>
  );
}
