import { type Metadata } from "next";
import { type ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { PenCircle, PenNote, PenStrike, PenUnderline } from "@/components/paper/pen";
import { Stamp } from "@/components/paper/stamp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BoardScroller } from "@/features/board/components/board-scroller";
import { FolderColumn } from "@/features/board/components/folder-column";
import { MatchBadge } from "@/features/board/components/match-badge";
import { OfferCard } from "@/features/board/components/offer-card";
import { DEMO_APPLICATIONS } from "@/features/board/lib/demo-data";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/features/board/constants";

export const metadata: Metadata = {
  title: "Styleguide",
  description: "Tokeny i komponenty kierunku B: Biuro podawcze.",
};

const COLOR_TOKENS = [
  { name: "background", note: "szary papier" },
  { name: "card", note: "kartka" },
  { name: "folder", note: "wnętrze teczki" },
  { name: "foreground", note: "tusz" },
  { name: "muted-foreground", note: "tekst pomocniczy" },
  { name: "border", note: "linie" },
  { name: "primary", note: "kobalt: wypełnienia przycisków" },
  { name: "primary-ink", note: "kobalt jako tekst i linie" },
  { name: "primary-soft", note: "aktywna zakładka" },
  { name: "pen", note: "tylko Roast i błędy" },
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/\W+/g, "-");
  return (
    <section aria-labelledby={id} className="border-t-2 border-ink py-10">
      <h2 id={id} className="mb-6 font-display text-2xl font-extrabold tracking-[-0.03em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-7">
        <div className="py-10">
          <h1 className="font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
            Styleguide
          </h1>
          <p className="mt-3 max-w-[65ch] text-muted-foreground">
            Kierunek B: Biuro podawcze. Jedyne źródło prawdy dla kolorów, typografii i komponentów.
            Sprawdzaj każdą zmianę w obu motywach.
          </p>
        </div>

        <Section title="Kolory">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {COLOR_TOKENS.map(({ name, note }) => (
              <li key={name} className="flex flex-col gap-2">
                <span
                  aria-hidden
                  className="h-16 border-[1.5px] border-ink"
                  style={{ backgroundColor: `var(--${name})` }}
                />
                <span className="font-mono text-xs">--{name}</span>
                <span className="text-xs text-muted-foreground">{note}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Typografia">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
                Kartoteka rekrutacji
              </p>
              <p className="font-display text-2xl font-bold tracking-tight">
                Mid Frontend Developer
              </p>
              <p className="max-w-[60ch]">
                IBM Plex Sans do tekstu. Szukamy osoby, która lubi porządek w kodzie i w procesie
                rekrutacji.
              </p>
              <p className="font-mono text-sm">17 000-22 000 zł B2B</p>
              <PenNote>a Ty masz 0 testów E2E</PenNote>
            </div>
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-2 self-start text-sm">
              <dt className="text-muted-foreground">Nagłówki</dt>
              <dd>Bricolage Grotesque 700-800, ciasny tracking</dd>
              <dt className="text-muted-foreground">Tekst</dt>
              <dd>IBM Plex Sans 400-600</dd>
              <dt className="text-muted-foreground">Liczby</dt>
              <dd>IBM Plex Mono: widełki, wyniki, pieczątki</dd>
              <dt className="text-muted-foreground">Długopis</dt>
              <dd>Caveat, wyłącznie w trybie Roast</dd>
            </dl>
          </div>
        </Section>

        <Section title="Przyciski i formularze">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Złóż nową ofertę</Button>
            <Button variant="secondary">Popraw ręcznie</Button>
            <Button variant="pen">Czerwony długopis</Button>
            <Button variant="pen" aria-pressed="true">
              Czerwony długopis
            </Button>
            <Button variant="ghost">Anuluj</Button>
            <Button size="sm">Zatwierdź</Button>
            <Button disabled>Niedostępny</Button>
          </div>
          <form
            className="mt-8 grid max-w-xl gap-6 sm:grid-cols-2"
            aria-label="Przykładowy formularz"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="sg-company">Firma</Label>
              <Input id="sg-company" defaultValue="Kropla Software" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="sg-salary">Widełki od</Label>
              <Input
                id="sg-salary"
                inputMode="numeric"
                defaultValue="abc"
                aria-invalid="true"
                aria-describedby="sg-salary-error"
                className="font-mono"
              />
              <p id="sg-salary-error" className="text-xs text-pen">
                Wpisz kwotę w złotych, np. 17000.
              </p>
            </div>
          </form>
        </Section>

        <Section title="Pieczątki i czerwony długopis">
          <div className="flex flex-wrap items-center gap-6">
            <Stamp>Wysłano 04.11</Stamp>
            <Stamp>Wtorek 10:00</Stamp>
            <Stamp tone="pen">Do poprawki</Stamp>
            <MatchBadge score={88} />
            <MatchBadge score={64} />
            <MatchBadge score={38} />
            <MatchBadge score={88} size="lg" />
          </div>
          <div className="mt-8 max-w-xl space-y-3 leading-relaxed">
            <p>
              Szukamy osoby z <PenStrike>doświadczeniem w Playwright</PenStrike>{" "}
              <PenNote delay={0}>a Ty masz 0 testów E2E</PenNote>
            </p>
            <p>
              Oferujemy <PenUnderline>17 000-22 000 zł</PenUnderline>{" "}
              <PenNote delay={150}>celujesz w 20k, negocjuj!</PenNote>
            </p>
            <p>
              Praca w <PenCircle>dynamicznym środowisku</PenCircle>{" "}
              <PenNote delay={300}>czyli chaos?</PenNote>
            </p>
          </div>
        </Section>

        <Section title="Kartoteka">
          <BoardScroller label="Kartoteka aplikacji, przewijana w poziomie">
            {APPLICATION_STATUSES.map((status) => {
              const items = DEMO_APPLICATIONS.filter((a) => a.status === status);
              return (
                <FolderColumn
                  key={status}
                  title={STATUS_LABELS[status]}
                  count={items.length}
                  active={status === "interview"}
                  emptyMessage="Na razie pusta teczka. Tu trafi pierwsza oferta."
                >
                  {items.map((application) => (
                    <OfferCard key={application.id} application={application} />
                  ))}
                </FolderColumn>
              );
            })}
          </BoardScroller>
        </Section>
      </main>
    </>
  );
}
