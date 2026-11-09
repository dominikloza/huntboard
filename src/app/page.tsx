import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { PenNote } from "@/components/paper/pen";
import { Stamp } from "@/components/paper/stamp";
import { SignInButtons } from "@/features/auth/components/sign-in-buttons";
import { cn } from "@/lib/utils";

/**
 * Real screenshots from the app. All lazy: the hero shot is hidden on phones (unreadable at that
 * width), so a lazy image is never downloaded there and does not compete with the fonts.
 * Demo account, scripted AI, one file per theme in public/landing.
 */
const SHOTS = {
  board: { width: 1600, height: 867 },
  intake: { width: 1080, height: 1115 },
  roast: { width: 1080, height: 930 },
} as const;

function Shot({
  name,
  alt,
  sizes,
  label,
  className,
}: {
  name: keyof typeof SHOTS;
  alt: string;
  sizes: string;
  label: string;
  className?: string;
}) {
  const { width, height } = SHOTS[name];
  const common = { width, height, sizes };
  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="inline-block rounded-t-tab border-[1.5px] border-b-0 border-ink bg-card px-3 py-1 text-xs font-semibold">
        {label}
      </figcaption>
      <div className="overflow-hidden border-[1.5px] border-ink bg-card shadow-sheet">
        {/* The theme is a class on <html>, so both files are in the page and CSS picks one.
            The hidden one is display: none, so screen readers hear the description once. */}
        <Image
          src={`/landing/${name}-light.webp`}
          className="block dark:hidden"
          alt={alt}
          {...common}
        />
        <Image
          src={`/landing/${name}-dark.webp`}
          className="hidden dark:block"
          alt={alt}
          {...common}
        />
      </div>
    </figure>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <p className="font-mono text-sm text-primary-ink">
      <span className="text-2xl font-semibold">{String(n).padStart(2, "0")}</span> / 03
    </p>
  );
}

function Facts({ children }: { children: ReactNode }) {
  return <ul className="mt-6 flex flex-col border-t border-border text-sm">{children}</ul>;
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-border py-2.5">
      <span className="font-semibold">{term}</span>
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

const DESK = [
  ["Przeciąganie", "myszą, palcem i klawiaturą, z komunikatami dla czytnika ekranu"],
  ["Filtry", "w adresie strony: link do widoku działa u kogoś innego"],
  ["Notatki", "przy każdej teczce, zapisane od razu"],
  ["Motyw", "jasny i ciemny, kontrast AA w obu"],
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-4 sm:px-7">
        <section
          aria-labelledby="hero-title"
          className="grid items-center gap-x-14 gap-y-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        >
          <div className="flex flex-col items-start gap-6">
            <Stamp>Demo bez rejestracji</Stamp>
            <h1
              id="hero-title"
              className="max-w-[16ch] font-display text-5xl leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-6xl"
            >
              Kartoteka Twoich rekrutacji.
            </h1>
            <p className="max-w-[44ch] text-lg text-muted-foreground">
              Wklejasz ofertę, AI ją rozpisuje, Ty decydujesz. Każda aplikacja ma swoją teczkę,
              wynik dopasowania i notatki. Bez arkusza w Excelu.
            </p>
            <SignInButtons />
            <p className="-mt-4 text-sm text-muted-foreground">
              Konto gościa startuje z siedmioma przykładowymi teczkami.
            </p>
          </div>
          <Shot
            name="board"
            label="Kartoteka"
            alt="Tablica Huntboard: kolumny Zapisane, Wysłane, Rozmowa, Oferta i Odrzucone, w nich karty ofert z firmą, stanowiskiem, widełkami i wynikiem dopasowania."
            sizes="(min-width: 1400px) 780px, (min-width: 1024px) 56vw, 100vw"
            className="hidden sm:block"
          />
        </section>

        <section aria-labelledby="flow-title" className="border-t-2 border-ink py-14 sm:py-20">
          <h2
            id="flow-title"
            className="max-w-[20ch] font-display text-4xl leading-[1.05] font-extrabold tracking-[-0.03em]"
          >
            Jak oferta przechodzi przez biurko
          </h2>

          <ol className="mt-12 flex flex-col gap-16 sm:gap-24">
            <li className="grid items-center gap-x-14 gap-y-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <StepNumber n={1} />
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">
                  Wklejasz ogłoszenie, pola wypełniają się same
                </h3>
                <p className="mt-3 max-w-[48ch] text-muted-foreground">
                  AI czyta tekst z JustJoin.it czy LinkedIna i na żywo wpisuje firmę, stanowisko,
                  widełki, tryb pracy i stack. Wyłapuje też to, na co warto uważać.
                </p>
                <Facts>
                  <Fact term="Szkic">nic się nie zapisze bez Twojego kliknięcia</Fact>
                  <Fact term="Limit">10 wywołań AI na godzinę dla gościa, liczone w bazie</Fact>
                  <Fact term="Jakość">sprawdzana regułami na 12 ogłoszeniach testowych</Fact>
                </Facts>
              </div>
              <Shot
                name="intake"
                label="Nowa oferta"
                alt="Okno Nowa oferta wypełnione przez AI: Kreska Software, Frontend Developer (React), Wrocław, hybrydowo, 16 000 do 22 000 zł, stack React, TypeScript, Next.js. Pod spodem ostrzeżenie: zadanie rekrutacyjne na 3 dni bez wynagrodzenia."
                sizes="(min-width: 1024px) 560px, 100vw"
                className="w-full max-w-[560px] lg:col-span-7 lg:justify-self-end"
              />
            </li>

            <li className="grid items-center gap-x-14 gap-y-8 lg:grid-cols-12">
              <div className="lg:order-2 lg:col-span-5">
                <StepNumber n={2} />
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">
                  Kod liczy dopasowanie, AI je komentuje
                </h3>
                <p className="mt-3 max-w-[48ch] text-muted-foreground">
                  Wynik od 0 do 100 liczy się z Twojego profilu: stack, widełki, tryb pracy i
                  poziom. Model go nie zmyśla, tylko tłumaczy. Spokojnie jak coach albo czerwonym
                  długopisem jak zmęczony rekruter.
                </p>
                <Facts>
                  <Fact term="Stack">
                    55% wyniku, pierwsze trzy technologie liczą się podwójnie
                  </Fact>
                  <Fact term="Widełki">20%, porównane z Twoim minimum</Fact>
                  <Fact term="Roast">żarty z oferty, nigdy z człowieka</Fact>
                </Facts>
              </div>
              <div className="relative mt-6 w-full max-w-[560px] lg:order-1 lg:col-span-7 lg:mt-0">
                <PenNote aria-hidden className="absolute -top-9 right-2 rotate-[-4deg] sm:right-6">
                  tryb roast, na własne ryzyko
                </PenNote>
                <Shot
                  name="roast"
                  label="Teczka aplikacji"
                  alt="Teczka aplikacji z wynikiem dopasowania 82 i rozbiciem na stack, widełki, tryb pracy i poziom. Pod spodem komentarz w trybie roast pisany czerwonym długopisem: Szukają ninja, a płacą jak za praktykanta z kawą w gratisie."
                  sizes="(min-width: 1024px) 560px, 100vw"
                />
              </div>
            </li>

            <li className="grid gap-x-14 gap-y-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <StepNumber n={3} />
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">
                  Prowadzisz teczkę do końca
                </h3>
                <p className="mt-3 max-w-[48ch] text-muted-foreground">
                  Od zapisanej oferty przez rozmowę do decyzji. Karty przesuwasz między kolumnami, a
                  tablica pamięta kolejność.
                </p>
              </div>
              <dl className="grid content-start gap-x-8 sm:grid-cols-2 lg:col-span-7">
                {DESK.map(([term, value]) => (
                  <div key={term} className="border-t-[1.5px] border-ink py-4">
                    <dt className="font-display text-lg font-bold">{term}</dt>
                    <dd className="mt-1 text-muted-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          </ol>
        </section>

        <footer className="flex flex-col gap-3 border-t-2 border-ink py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
