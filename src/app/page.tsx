import { type Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { PenNote } from "@/components/paper/pen";
import { Stamp } from "@/components/paper/stamp";
import { SignInButtons } from "@/features/auth/components/sign-in-buttons";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/features/board/constants";
import { DeferredRail, DeferredWeights } from "@/features/landing/components/deferred";
import { StaticRail } from "@/features/landing/components/rail-parts";
import { StaticWeights } from "@/features/landing/components/weights-parts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: { absolute: "Huntboard: kartoteka Twoich rekrutacji" } };

/*
 * Landing page (Day 9). The card rail and the score weights animate with Motion
 * (src/features/landing); the other scroll animations are pure CSS (globals.css, "Scroll-driven animations"):
 * every class named scroll-* animates as it crosses the viewport and falls back to its final,
 * static state. Sections below the first screen use content-visibility: auto, so their fonts
 * (Caveat) and images load when they come near, not with the first paint. Screenshots are the real app on the demo account: public/landing.
 */

const SHOTS = {
  board: { width: 1600, height: 867 },
  intake: { width: 1080, height: 1115 },
  roast: { width: 1080, height: 930 },
  mail: { width: 1600, height: 552 },
  questions: { width: 1080, height: 972 },
  stats: { width: 1600, height: 883 },
} as const;

/** Real screenshot, one file per theme. The hidden one is display: none: lazy, never fetched. */
function Shot({
  name,
  alt,
  sizes,
  className,
}: {
  name: keyof typeof SHOTS;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const { width, height } = SHOTS[name];
  const common = { width, height, sizes };
  const base = cn("h-auto w-full", className);
  return (
    <>
      <Image
        src={`/landing/${name}-light.webp`}
        alt={alt}
        className={cn(base, "block dark:hidden")}
        {...common}
      />
      <Image
        src={`/landing/${name}-dark.webp`}
        alt={alt}
        className={cn(base, "hidden dark:block")}
        {...common}
      />
    </>
  );
}

function Tab({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 rounded-t-tab border-[1.5px] border-b-0 border-ink bg-card px-3.5 py-1.5 text-sm font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function GiantNumber({ n, className }: { n: string; className?: string }) {
  return (
    <p
      aria-hidden
      className={cn(
        "scroll-rise font-mono text-8xl leading-[0.8] font-semibold tracking-[-0.06em] lg:text-[148px]",
        className,
      )}
    >
      {n}
    </p>
  );
}

const REGISTER = [
  ["Poczta", "Skrypt działa w Twoim Gmailu: Huntboard nie dostaje dostępu do konta Google."],
  ["Linki do ofert", "Pobierane tylko z listy portali, każde przekierowanie sprawdzane."],
  ["Przeciąganie", "Myszą, palcem i klawiaturą, z komunikatami po polsku dla czytnika ekranu."],
  ["Filtry", "Zapisane w adresie strony: link do widoku działa u kogoś innego."],
  ["Notatki", "Przy każdej teczce, widoczne od razu, zanim serwer odpowie."],
  ["Motyw", "Jasny i ciemny, kontrast AA w obu."],
  ["Limity AI", "10 wywołań na godzinę dla gościa i dzienny budżet, liczone w Postgresie."],
  ["Testy", "Jednostkowe, komponentowe, e2e po każdym deployu i ewaluacje odpowiedzi AI."],
] as const;

/**
 * Wide screenshots stay readable on a phone: below `sm` they keep 720px and scroll sideways
 * inside their own labelled region (the page itself never scrolls sideways).
 */
function WideShot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="max-sm:overflow-x-auto max-sm:overscroll-x-contain"
    >
      <div className="max-sm:w-[720px]">{children}</div>
    </div>
  );
}

/** Small print under a step: term and value, the way the records office writes it. */
function Facts({
  items,
  className,
}: {
  items: readonly (readonly [string, string])[];
  className?: string;
}) {
  return (
    <dl className={cn("border-t border-border text-sm", className)}>
      {items.map(([term, value]) => (
        <div key={term} className="grid grid-cols-[6rem_1fr] gap-3 border-b border-border py-2.5">
          <dt className="font-semibold">{term}</dt>
          <dd className="text-muted-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* 1. Hero: monumental title, folder with the board that opens on scroll */}
        <section
          aria-labelledby="hero-title"
          className="mx-auto max-w-[1400px] px-4 pt-12 pb-10 sm:px-7 sm:pt-14"
        >
          <p className="mb-7 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[13px] text-muted-foreground">
            <span>Akta nr HB/2026</span>
            <span>Kartoteka rekrutacyjna</span>
            <span className="hidden sm:inline">Projekt portfolio</span>
          </p>
          <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-6">
            <div className="relative lg:col-span-9">
              <h1
                id="hero-title"
                className="font-display leading-[0.86] font-extrabold tracking-[-0.05em]"
              >
                <span className="block text-[clamp(4.25rem,13vw,11.75rem)]">Kartoteka</span>
                <span className="mt-4 block text-[clamp(2.1rem,4.6vw,4rem)] leading-none tracking-[-0.035em]">
                  Twoich rekrutacji.
                </span>
              </h1>
              <Stamp
                animate
                className="absolute top-1 right-0 bg-background max-sm:top-auto max-sm:right-auto max-sm:-bottom-9 max-sm:left-0"
              >
                Demo bez rejestracji
              </Stamp>
            </div>
            <div className="flex flex-col gap-4 self-end max-sm:mt-6 lg:col-span-3 lg:pb-1.5">
              <p className="text-lg text-muted-foreground">
                Aplikujesz, a teczka zakłada się sama z maila. AI rozpisuje ofertę i przygotowuje
                Cię do rozmowy, Ty decydujesz.
              </p>
              <SignInButtons />
              <p className="-mt-4 text-sm text-muted-foreground">
                Konto gościa startuje z siedmioma przykładowymi teczkami.
              </p>
            </div>
          </div>

          <figure className="mt-16 max-sm:hidden">
            <figcaption className="flex gap-1.5 overflow-hidden pl-5">
              {APPLICATION_STATUSES.map((status, index) => (
                <Tab key={status} className={cn(index === 0 ? "bg-primary-soft" : "max-sm:hidden")}>
                  {STATUS_LABELS[status]}
                </Tab>
              ))}
              <span className="sr-only">: zrzut tablicy z aplikacji</span>
            </figcaption>
            <div className="scroll-open border-[1.5px] border-ink bg-folder p-3 shadow-sheet sm:p-4.5">
              <Shot
                name="board"
                alt="Tablica Huntboard: kolumny Zapisane, Wysłane, Rozmowa, Oferta i Odrzucone, w nich karty ofert z firmą, stanowiskiem, widełkami i wynikiem dopasowania."
                sizes="(min-width: 1400px) 1340px, 100vw"
                className="border-[1.5px] border-ink"
              />
            </div>
          </figure>
        </section>

        {/* 2. One folder hops through the five columns while the page scrolls */}
        <section
          aria-labelledby="rail-title"
          className="mx-auto max-w-[1400px] px-4 py-20 sm:px-7 sm:py-24"
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2
              id="rail-title"
              className="max-w-[14ch] font-display text-[40px] leading-none font-extrabold tracking-[-0.035em] sm:text-[52px]"
            >
              Jedna teczka, pięć przystanków.
            </h2>
            <p className="max-w-[38ch] text-muted-foreground">
              Przeciągasz kartę myszą, palcem albo klawiaturą. Tablica pamięta kolejność i mówi
              czytnikowi ekranu, gdzie karta wylądowała.
            </p>
          </div>
          <DeferredRail>
            <StaticRail />
          </DeferredRail>
        </section>

        {/* 3. Step 01: sticky text, the filled-in form lands on the desk */}
        <section
          aria-labelledby="flow-title"
          className="mx-auto max-w-[1400px] border-t-2 border-ink px-4 pt-5 pb-24 [contain-intrinsic-size:auto_2400px] [content-visibility:auto] sm:px-7 sm:pb-32"
        >
          <h2
            id="flow-title"
            className="mb-14 font-mono text-[13px] font-normal text-muted-foreground sm:mb-16"
          >
            Jak oferta przechodzi przez biurko
          </h2>
          {/* Step 01: the inbox does the typing. A wide feed under the heading row. */}
          <div className="mb-28 sm:mb-36">
            <div className="mb-10 grid items-end gap-y-6 lg:grid-cols-12 lg:gap-x-6">
              <GiantNumber n="01" className="text-primary-ink lg:col-span-2" />
              <h3 className="font-display text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] lg:col-span-6">
                Aplikujesz. Teczka zakłada się sama.
              </h3>
              <p className="text-muted-foreground lg:col-span-4">
                Mały skrypt w Twoim Gmailu przekazuje maile z rekrutacji. Potwierdzenie z
                JustJoin.it, No Fluff Jobs czy eRecruitera zakłada teczkę, odpowiedź firmy ją
                przesuwa, a cisza przez 30 dni odkłada do odrzuconych.
              </p>
            </div>
            <figure className="scroll-sheet">
              <figcaption>
                <Tab>Z poczty</Tab>
              </figcaption>
              <WideShot label="Zrzut sekcji Z poczty, przewijany w poziomie na telefonie">
                <Shot
                  name="mail"
                  alt="Sekcja Z poczty nad tablicą: nowe teczki z potwierdzeń JustJoin.it, No Fluff Jobs i eRecruitera, odmowa przesuwa Frontend Engineer do Odrzucone, zaproszenie przesuwa Mid Frontend Developer do Rozmowy, oferta przesuwa kartę do Oferty. Przy każdej zmianie przycisk Cofnij."
                  sizes="(min-width: 1400px) 1340px, (min-width: 640px) 100vw, 720px"
                  className="border-[1.5px] border-ink shadow-sheet"
                />
              </WideShot>
            </figure>
            <Facts
              className="mt-8 grid sm:grid-cols-3 sm:gap-x-6 [&>div]:sm:border-b-0"
              items={[
                ["Treść", "maili nie zapisuję, tylko wynik"],
                ["Kontrola", "każdą zmianę cofniesz jednym kliknięciem"],
                ["Pewność", "niepewne odczyty czekają na Twoje zatwierdzenie"],
              ]}
            />
          </div>

          <div className="grid gap-y-8 lg:grid-cols-12 lg:gap-x-6">
            <div className="lg:col-span-2">
              <GiantNumber n="02" className="text-primary-ink lg:sticky lg:top-24" />
            </div>
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <h3 className="font-display text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
                  Link albo ogłoszenie. Pola wypełniają się same.
                </h3>
                <p className="mt-4 text-muted-foreground">
                  Teczka z maila zna tylko firmę i stanowisko, ale pamięta link do oferty. Jedno
                  kliknięcie i AI czyta ogłoszenie: wpisuje widełki, tryb pracy i stack, wyłapuje,
                  na co uważać. Z LinkedIna wklejasz tekst.
                </p>
                <Facts
                  className="mt-7"
                  items={[
                    ["Szkic", "nic się nie zapisze bez Twojego kliknięcia"],
                    ["Uzupełnia", "tylko puste pola, Twoje zostają"],
                    ["Jakość", "sprawdzana regułami na 14 ogłoszeniach testowych"],
                  ]}
                />
              </div>
            </div>
            <figure className="scroll-sheet lg:col-span-5 lg:col-start-8 lg:pt-28">
              <figcaption>
                <Tab>Nowa oferta</Tab>
              </figcaption>
              <Shot
                name="intake"
                alt="Okno Nowa oferta wypełnione przez AI: Kreska Software, Frontend Developer (React), Wrocław, hybrydowo, 16 000 do 22 000 zł, stack React, TypeScript, Next.js. Pod spodem ostrzeżenie: zadanie rekrutacyjne na 3 dni bez wynagrodzenia."
                sizes="(min-width: 1024px) 560px, 100vw"
                className="border-[1.5px] border-ink shadow-sheet"
              />
            </figure>
          </div>
        </section>

        {/* 4. Step 03: inverted band, the red pen goes over a pasted offer (roast mode) */}
        <section
          aria-labelledby="score-title"
          className="band py-24 [contain-intrinsic-size:auto_1200px] [content-visibility:auto] sm:py-32"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-7">
            <div className="mb-16 grid items-end gap-y-6 lg:mb-18 lg:grid-cols-12 lg:gap-x-6">
              <GiantNumber n="03" className="lg:col-span-2" />
              <h3
                id="score-title"
                className="font-display text-[40px] leading-none font-extrabold tracking-[-0.035em] sm:text-[52px] lg:col-span-8"
              >
                Kod liczy wynik. AI go komentuje, czasem czerwonym długopisem.
              </h3>
            </div>

            <div className="grid items-start gap-y-16 lg:grid-cols-12 lg:gap-x-6">
              <div className="scroll-sheet-left relative border-[1.5px] border-background p-7 pb-9 text-[15px] lg:col-span-5">
                <p className="mb-3.5 font-mono text-xs opacity-75">Wklejone ogłoszenie</p>
                <div className="flex flex-col gap-3 opacity-90">
                  <p>
                    Szukamy <mark className="scroll-circle bg-transparent text-inherit">ninja</mark>{" "}
                    frontendu, który nie boi się wyzwań i dynamicznego środowiska.
                  </p>
                  <p>
                    Oferujemy: <del className="scroll-strike">owocowe czwartki</del>, młody zespół i
                    rodzinną atmosferę.
                  </p>
                  <p>
                    Proces: rozmowa z HR, potem{" "}
                    <mark className="scroll-underline bg-transparent text-inherit">
                      zadanie rekrutacyjne na 3 dni
                    </mark>
                    .
                  </p>
                </div>
                <span aria-hidden className="scroll-note absolute -top-7 right-2 sm:-right-4">
                  <PenNote className="rotate-[-5deg] text-[26px]">a widełki?</PenNote>
                </span>
                <span aria-hidden className="scroll-note absolute -bottom-9 left-6">
                  <PenNote className="rotate-[-3deg]">to nie benefit, to dieta</PenNote>
                </span>
              </div>
              <figure className="scroll-sheet lg:col-span-6 lg:col-start-7">
                <figcaption>
                  <Tab className="border-background bg-foreground">
                    Teczka aplikacji, tryb roast
                  </Tab>
                </figcaption>
                <Shot
                  name="roast"
                  alt="Teczka aplikacji z wynikiem dopasowania 82 i rozbiciem na stack, widełki, tryb pracy i poziom. Pod spodem komentarz w trybie roast pisany czerwonym długopisem: Szukają ninja, a płacą jak za praktykanta z kawą w gratisie."
                  sizes="(min-width: 1024px) 680px, 100vw"
                  className="border-[1.5px] border-background"
                />
              </figure>
            </div>

            <figure className="mt-24">
              <figcaption className="mb-3.5 font-mono text-[13px] opacity-75">
                Z czego jest wynik 0-100 (liczy go kod, nie model)
              </figcaption>
              <DeferredWeights>
                <StaticWeights />
              </DeferredWeights>
              <p className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm opacity-75">
                <span>Pierwsze trzy technologie z oferty liczą się podwójnie.</span>
                <span>Roast żartuje z oferty, nigdy z człowieka.</span>
              </p>
            </figure>
          </div>
        </section>

        {/* 5. Step 04: interview prep. The sheet on the left this time, the text beside it. */}
        <section
          aria-labelledby="prep-title"
          className="mx-auto max-w-[1400px] px-4 pt-24 [contain-intrinsic-size:auto_1200px] [content-visibility:auto] sm:px-7 sm:pt-32"
        >
          <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-6">
            <figure className="scroll-sheet-left order-2 lg:order-1 lg:col-span-6">
              <figcaption>
                <Tab>Teczka: Kropla Software, etap Rozmowa</Tab>
              </figcaption>
              <div className="border-[1.5px] border-ink bg-card p-4 shadow-sheet sm:p-6">
                <Shot
                  name="questions"
                  alt="Fiszki przed rozmową: pytania o React, TypeScript, Next.js i Playwright z tej oferty. Pod rozwiniętym pytaniem o TypeScript podpowiedź, co powinno paść w odpowiedzi."
                  sizes="(min-width: 1024px) 640px, 100vw"
                />
              </div>
            </figure>
            <div className="order-1 lg:order-2 lg:col-span-5 lg:col-start-8">
              <div className="lg:sticky lg:top-24">
                <GiantNumber n="04" className="mb-8 text-primary-ink" />
                <h3
                  id="prep-title"
                  className="font-display text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance"
                >
                  Zaproszenie przyszło. Fiszki już są.
                </h3>
                <p className="mt-4 text-muted-foreground">
                  Sześć pytań pod stack tej oferty, najwięcej o tym, czego brakuje w Twoim profilu,
                  i dwa pytania do zadania pracodawcy. Pod każdym schowana podpowiedź.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Step 05: the funnel, in a folder like the board in the hero */}
        <section
          aria-labelledby="stats-title"
          className="mx-auto max-w-[1400px] px-4 pt-28 [contain-intrinsic-size:auto_1200px] [content-visibility:auto] sm:px-7 sm:pt-36"
        >
          <div className="mb-10 grid items-end gap-y-6 lg:grid-cols-12 lg:gap-x-6">
            <GiantNumber n="05" className="text-primary-ink lg:col-span-2" />
            <h3
              id="stats-title"
              className="font-display text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] lg:col-span-6"
            >
              Widzisz, gdzie odpadasz.
            </h3>
            <p className="text-muted-foreground lg:col-span-4">
              Lejek od wysłanych do ofert, po ilu dniach firmy odpowiadają i komu warto się
              przypomnieć. Liczone z historii każdej teczki, bez AI.
            </p>
          </div>
          <figure className="scroll-open border-[1.5px] border-ink bg-folder p-3 shadow-sheet sm:p-4.5">
            <WideShot label="Zrzut statystyk, przewijany w poziomie na telefonie">
              <Shot
                name="stats"
                alt="Statystyki: 8 wysłanych z 10 teczek, 3 rozmowy, 1 oferta, odpowiedź średnio po 8 dniach. Lejek etapów i lista aplikacji czekających na odpowiedź ponad 14 dni."
                sizes="(min-width: 1400px) 1340px, (min-width: 640px) 100vw, 720px"
                className="border-[1.5px] border-ink"
              />
            </WideShot>
          </figure>
        </section>

        {/* 7. The register of what works underneath */}
        <section
          aria-labelledby="register-title"
          className="mx-auto max-w-[1400px] px-4 py-24 [contain-intrinsic-size:auto_1200px] [content-visibility:auto] sm:px-7 sm:py-32"
        >
          <div className="mb-12 grid items-end gap-y-6 lg:grid-cols-12 lg:gap-x-6">
            <h3
              id="register-title"
              className="font-display text-[40px] leading-none font-extrabold tracking-[-0.035em] sm:text-[52px] lg:col-span-8"
            >
              Prowadzisz teczkę do końca.
            </h3>
            <p className="text-muted-foreground lg:col-span-3 lg:col-start-10">
              Od maila z potwierdzeniem przez rozmowę do decyzji. Reszta to rejestr tego, co działa
              pod spodem.
            </p>
          </div>
          <ol className="border-t-2 border-ink">
            {REGISTER.map(([what, how], index) => (
              <li
                key={what}
                className="scroll-row grid grid-cols-[2.75rem_1fr] items-baseline gap-x-6 gap-y-1 border-b-[1.5px] border-ink py-4.5 sm:grid-cols-[4.5rem_13.75rem_1fr]"
              >
                <span className="font-mono font-semibold text-primary-ink">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-[22px] font-bold tracking-[-0.02em]">
                  {what}
                </span>
                <span className="text-muted-foreground max-sm:col-start-2">{how}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* 8. A fresh folder */}
        <section
          aria-labelledby="cta-title"
          className="mx-auto max-w-[1400px] px-4 pb-24 [contain-intrinsic-size:auto_1200px] [content-visibility:auto] sm:px-7"
        >
          <Tab className="ml-5 bg-primary-soft">Nowa teczka</Tab>
          <div className="scroll-rise grid items-end gap-10 border-[1.5px] border-ink bg-card px-6 py-12 shadow-sheet sm:px-12 sm:py-14 lg:grid-cols-[7fr_5fr] lg:gap-12">
            <h2
              id="cta-title"
              className="font-display text-[44px] leading-[0.92] font-extrabold tracking-[-0.045em] sm:text-[80px]"
            >
              Pierwsza teczka czeka na biurku.
            </h2>
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                Bez rejestracji: konto gościa ma przykładowe teczki i działające AI. Jeśli
                zostaniesz, zaloguj się przez GitHub, a tablica przejdzie razem z Tobą.
              </p>
              <SignInButtons />
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-[1400px] flex-col gap-3 border-t-2 border-ink px-4 pt-6 pb-10 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-7">
          <p>
            Projekt portfolio: Next.js 16, Postgres, AI SDK. Konta gości znikają po około dwóch
            tygodniach bez wizyty.
          </p>
          <Link href="/styleguide" className="underline underline-offset-4 hover:text-foreground">
            Zobacz styleguide
          </Link>
        </footer>
      </main>
    </>
  );
}
