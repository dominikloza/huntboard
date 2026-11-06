# Huntboard: plan projektu portfolio (Mid Frontend)

> Robocza nazwa: **Huntboard**. Aplikacja AI do prowadzenia procesu szukania pracy: tablica aplikacji, analiza ofert przez AI, dopasowanie do Twojego profilu i tryb „Roast” z jajem.
> Czas: 10 dni roboczych + 2 dni bufora. Praca z agentami AI (Cursor / Claude Code / Cline).

---

## 1. Dlaczego ten projekt

- **Sam z niego korzystasz.** Budujesz narzędzie, którym właśnie szukasz pracy. To świetna historia na rozmowę („zbudowałem to, żeby znaleźć tę pracę”) i od razu daje realne dane testowe.
- **Pokrywa wymagania z ofert na Mida w 2026:** TypeScript (strict), React 19, Next.js App Router (RSC, Server Actions), state management, formularze z walidacją, a11y, testy (unit + E2E), CI/CD, wydajność i integracja AI w UI (streaming, structured output, generative UI).
- **Jest wąski, ale głęboki.** Dwie trudne rzeczy zrobione porządnie: interaktywna tablica z optimistic UI oraz streaming danych strukturalnych z AI. Reszta to solidny standard.
- **Ma element zabawy.** Tryb „Roast my application”: AI w roli zgryźliwego rekrutera ocenia, jak Twój profil pasuje do oferty. Zapada w pamięć i dobrze wygląda na demo.

---

## 2. Zakres

### MVP (musi być)

1. **Logowanie:** GitHub OAuth i przycisk **„Wejdź jako gość”** z gotowymi danymi demo. Rekruter nie będzie zakładał konta.
2. **Tablica Kanban aplikacji:** kolumny `Saved → Applied → Interview → Offer → Rejected`.
   - drag & drop z obsługą klawiatury i czytnika ekranu,
   - optimistic update i rollback z toastem przy błędzie,
   - kolejność kart oparta na fractional indexing.
3. **Dodawanie oferty przez AI:** wklejasz treść ogłoszenia, a AI **na żywo streamuje** ustrukturyzowane dane (firma, stanowisko, seniority, stack, widełki, tryb pracy, red flags). Pola wypełniają się na oczach użytkownika, użytkownik je poprawia (RHF + Zod) i zapisuje.
4. **Profil użytkownika:** skille, lata doświadczenia, preferencje (widełki, remote).
5. **Match score:** AI porównuje ofertę z profilem i zwraca wynik, mocne strony i braki, renderowane jako komponenty (generative UI).
6. **Tryb Roast 🔥:** ta sama analiza w tonie zgryźliwego rekrutera, z przełącznikiem tonu.
7. **Szczegóły aplikacji:** modal przez intercepting route (`/board/(.)app/[id]`) z działającym deep linkiem i notatkami.
8. **Filtry i wyszukiwanie** trzymane w URL (nuqs): da się je udostępnić linkiem i działa przycisk wstecz.

### Stretch (tylko jeśli zostanie czas)

- Generator pytań rekrutacyjnych pod stack z oferty (flashcards).
- Statystyki lejka (wykres: ile aplikacji na którym etapie, czas odpowiedzi).
- Command palette (⌘K).
- PWA / tryb offline tylko do odczytu.

### Świadomie poza zakresem (zapisz w README, to też pokazuje dojrzałość)

- Scraping ofert z portali (ToS, kruchość). Użytkownik wkleja tekst.
- Współdzielenie tablic i real-time multiplayer.
- Osobny backend, mikroserwisy, AWS/Terraform.

---

## 3. Stack i uzasadnienie (każdy punkt to potencjalne pytanie na rozmowie)

| Obszar       | Wybór                                                                   | Dlaczego                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | **Next.js (App Router), React 19**                                      | Standard w ofertach; RSC, Server Actions, streaming, parallel/intercepting routes                                                            |
| Język        | **TypeScript strict** + `noUncheckedIndexedAccess`                      | Wymóg rynkowy; ostrzejszy tryb to sygnał jakości                                                                                             |
| UI           | **Tailwind CSS + shadcn/ui** (Radix)                                    | Szybkość pracy i dostępne prymitywy (focus, ARIA)                                                                                            |
| Baza         | **Postgres (Neon) + Drizzle ORM**                                       | Relacyjne dane, typy z bazy do UI, migracje                                                                                                  |
| Auth         | **Auth.js** lub **Better Auth**                                         | Sesja w ciasteczku httpOnly, GitHub OAuth i konto gościa                                                                                     |
| Server state | **TanStack Query** (tablica) + **Server Actions** (formularze)          | TanStack daje kontrolę nad cache i optimistic update w interaktywnej tablicy; Server Actions upraszczają formularze. Uzasadnij podział w ADR |
| Client state | **URL (nuqs)** dla filtrów; **Zustand** tylko jeśli naprawdę potrzebny  | Stan „do udostępnienia” w URL, a nie w globalnym store                                                                                       |
| Formularze   | **React Hook Form + Zod**                                               | Ten sam schemat Zod dla formularza, Server Action i wyniku AI                                                                                |
| DnD          | **dnd-kit**                                                             | Gotowe sensory klawiatury i komunikaty dla czytników ekranu                                                                                  |
| AI           | **Vercel AI SDK** (`streamObject` / `useObject`) + OpenAI lub Anthropic | Streaming structured output, łatwa podmiana providera                                                                                        |
| Rate limit   | **Upstash Ratelimit**                                                   | Ochrona kosztów AI na publicznym demo                                                                                                        |
| Testy        | **Vitest + Testing Library**, **Playwright**, **axe-core**              | Unit, komponenty, E2E i automatyczne a11y                                                                                                    |
| CI/CD        | **GitHub Actions** + **Vercel** (preview na każdy PR)                   | lint, typecheck, test, e2e na preview                                                                                                        |
| Monitoring   | **Sentry** (opcjonalnie)                                                | Błędy produkcyjne                                                                                                                            |

---

## 4. Architektura

```
app/
  (marketing)/page.tsx          ← landing + „Wejdź jako gość”
  (app)/board/page.tsx          ← RSC: prefetch danych → HydrationBoundary
  (app)/board/@modal/(.)app/[id]/page.tsx  ← intercepting route (modal)
  (app)/app/[id]/page.tsx       ← pełna strona (deep link)
  (app)/profile/page.tsx
  api/ai/extract/route.ts       ← streamObject (ekstrakcja oferty)
  api/ai/match/route.ts         ← streamObject (match + roast)
src/
  features/board/               ← komponenty, hooki, mutacje, fractional index
  features/offers/
  features/ai/                  ← prompty, schematy, adapter providera
  lib/db/ (schema, queries)     ← Drizzle; zapytania zawsze filtrują po userId
  lib/auth/
  lib/validation/               ← wspólne schematy Zod
```

**Zasady:**

- **Feature-based folders**, nie „components/hooks/utils” dla całej aplikacji.
- **Każde zapytanie do bazy przyjmuje `userId` z sesji**, nigdy z parametru od klienta (ochrona przed IDOR). Wydziel to do jednej warstwy (`lib/db/queries`).
- **Jedno źródło prawdy dla typów:** schemat Zod → typ TS → formularz, Server Action i parser odpowiedzi AI.
- **Klucze AI tylko na serwerze.** Route Handler sprawdza sesję i limit, dopiero potem woła model.

### Model danych (szkic)

```
users(id, name, email, isGuest, createdAt)
profiles(userId, yearsExp, skills text[], salaryMin, remotePref, bio)
applications(id, userId, status, position /*fractional key*/, company, role,
             seniority, stack text[], salaryMin, salaryMax, workMode,
             redFlags jsonb, rawOffer text, matchScore int, createdAt, updatedAt)
notes(id, applicationId, body, createdAt)
ai_usage(id, userId, kind, inputTokens, outputTokens, createdAt)  ← koszt i limity
```

---

## 5. Dwie trudne rzeczy: tu jest Twoja głębia

### A. Tablica z optimistic UI

- `useMutation` z `onMutate` (snapshot cache → optymistyczny zapis), `onError` (rollback + toast), `onSettled` (invalidate).
- **Fractional indexing** (np. pakiet `fractional-indexing`): przesunięcie karty zmienia tylko jej klucz, a nie całą kolumnę.
- **Konflikty:** kolumna `updatedAt` jako wersja. Server Action odrzuca zapis ze starą wersją, UI robi rollback i refetch. Opisz w ADR, dlaczego wystarczy to przy jednym użytkowniku.
- **A11y:** sterowanie klawiaturą (spacja = podnieś, strzałki = przenieś, Esc = anuluj), `aria-live` z komunikatami („Przeniesiono kartę X do kolumny Interview, pozycja 2 z 4”) oraz alternatywa bez DnD (menu „Przenieś do…”).
- **Edge case’y do przetestowania:** szybkie podwójne przeciągnięcie, błąd sieci w trakcie, pusta kolumna, przeniesienie w obrębie tej samej kolumny.

### B. Streaming danych strukturalnych z AI

- `streamObject` po stronie serwera, `useObject` po stronie klienta, schemat Zod `OfferExtraction`.
- **Częściowe dane:** w trakcie streamu masz `DeepPartial<OfferExtraction>`. Renderuj skeletony dla pustych pól, a walidację pełnym schematem robisz dopiero na końcu.
- **UX:** przycisk Stop (abort), ponów, czytelne stany (`idle / streaming / done / error`) i to, że po zakończeniu użytkownik **edytuje** wynik w formularzu RHF, zanim go zapisze (human in the loop).
- **Bezpieczeństwo i koszty:** limit długości wejścia, rate limit (np. 10 wywołań na godzinę dla gościa), zapis tokenów do `ai_usage`, zabezpieczenie promptu przed prompt injection z treści oferty (oferta trafia jako dane w osobnym bloku, nie jako instrukcje).
- **Adapter providera:** jedna funkcja `getModel()`, zmiana dostawcy przez zmienną środowiskową.
- **Mini-evale:** 10–15 prawdziwych ofert w `fixtures/` z oczekiwanymi polami i skrypt `pnpm eval`, który liczy trafność ekstrakcji (np. stack, seniority, widełki). To rzadko spotykany, mocny element w portfolio.

---

## 6. Jakość

- **Testy jednostkowe (Vitest):** fractional indexing, mapowanie i normalizacja danych z AI, logika filtrów, reducery i utilsy.
- **Testy komponentów (Testing Library):** formularz oferty (walidacja), karta, zachowanie przy błędzie mutacji.
- **E2E (Playwright):** gość → dodanie oferty (AI zamockowane przez `MockLanguageModel` z AI SDK) → przeciągnięcie karty → otwarcie modala → odświeżenie strony i sprawdzenie, że stan przetrwał. Plus `@axe-core/playwright` na głównych ekranach.
- **CI:** `lint → typecheck → test → build → e2e` na preview deploymencie Vercela.
- **Wydajność:** Lighthouse ≥ 90 na landingu i tablicy, `next/font`, dynamic import ciężkich części, brak layout shiftu przy streamie (stałe wysokości skeletonów).
- **Stany UI:** loading (`loading.tsx` + Suspense), error (`error.tsx`), empty state, not found. Rekruterzy to klikają.
- **Dark mode i responsywność**: tablica na mobile jako przewijane kolumny lub lista.

---

## 7. Harmonogram (10 dni + bufor)

| Dzień              | Cel                                                                                                                                                                                  | Definicja „gotowe”                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **0 (cały dzień)** | Setup: repo, Next.js, TS strict, ESLint/Prettier, shadcn, Vitest, Playwright, CI, `AGENTS.md`, 3 pierwsze ADR. **Design: moodboard, tokeny, font, ikony, `/styleguide`** (sekcja 11) | Pusty projekt deployuje się na Vercel z zielonym CI; `/styleguide` nie wygląda jak domyślny shadcn |
| **1**              | Baza (Neon + Drizzle), schemat, migracje, seed; auth (GitHub + gość)                                                                                                                 | Zalogowany użytkownik widzi pustą tablicę na produkcji                                             |
| **2**              | Tablica: odczyt (RSC prefetch + TanStack), kolumny, karty, CRUD ręczny                                                                                                               | Dodaję, edytuję i usuwam kartę                                                                     |
| **3**              | DnD + optimistic + fractional indexing + rollback + a11y klawiatury                                                                                                                  | Przeciąganie myszą i klawiaturą, błąd sieci robi rollback                                          |
| **4**              | Modal przez intercepting route, notatki, filtry w URL, wyszukiwarka                                                                                                                  | Deep link do aplikacji działa; filtry przeżywają odświeżenie                                       |
| **5**              | AI: ekstrakcja oferty (`streamObject`), UI streamu, formularz RHF, zapis                                                                                                             | Wklejam ofertę → widzę stream → poprawiam → zapisuję                                               |
| **6**              | AI: rate limit, `ai_usage`, abort/retry, obrona przed prompt injection, mini-evale                                                                                                   | `pnpm eval` pokazuje trafność; gość ma limit                                                       |
| **7**              | Profil + match score + tryb Roast (generative UI)                                                                                                                                    | Każda aplikacja ma wynik dopasowania i roast                                                       |
| **8**              | Testy: unit, komponenty, E2E happy path z mockiem AI, axe                                                                                                                            | CI zielone, E2E przechodzi na preview                                                              |
| **9**              | Polish: stany UI, dark mode, mobile, Lighthouse, seed danych demo                                                                                                                    | Lighthouse ≥ 90, demo gościa wygląda dobrze                                                        |
| **10**             | README (case study), GIF/wideo 60–90 s, diagram architektury, ADR-y                                                                                                                  | Repo gotowe do wysłania rekruterowi                                                                |
| **11–12**          | Bufor / stretch                                                                                                                                                                      | —                                                                                                  |

**Zasada:** jeśli dzień się przeciąga, tniesz stretch, a nie testy i README.

---

## 8. Praca z agentami AI

1. **`AGENTS.md` / `CLAUDE.md` / `.cursor/rules`** w repo, z zawartością:
   - stack i konwencje (feature folders, nazewnictwo, Zod jako źródło typów),
   - zakazy: żadnego `any`, żadnych zapytań do bazy bez `userId` z sesji, żadnych kluczy po stronie klienta,
   - komendy: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`; agent uruchamia je przed zakończeniem zadania.
2. **Małe zadania:** jeden feature lub jeden PR na raz. Zaczynaj od opisu i testu, potem implementacja.
3. **Ty decydujesz, agent pisze.** Każdą decyzję zapisujesz w `docs/adr/NNN-tytul.md` (kontekst → decyzja → konsekwencje). Na rozmowie to Twoja ściąga.
4. **Code review każdej zmiany.** Jeśli nie umiesz wyjaśnić linijki, to jej nie mergujesz.
5. **Konwencjonalne commity** i PR-y z opisem. Historia repo też jest oceniana.

### Proponowane ADR-y

- 001: Next.js fullstack zamiast osobnego backendu
- 002: TanStack Query + Server Actions: gdzie który i dlaczego
- 003: Fractional indexing do kolejności kart
- 004: Stan filtrów w URL zamiast globalnego store
- 005: Streaming structured output i human in the loop
- 006: Ochrona kosztów AI (rate limit, limity wejścia, konto gościa)

---

## 9. README jako case study (to czyta rekruter)

1. Jedno zdanie + GIF + link do demo + przycisk „Wejdź jako gość”
2. Problem i rozwiązanie (2–3 zdania)
3. Najciekawsze wyzwania techniczne (optimistic DnD, streaming structured output, a11y), krótko z fragmentami kodu
4. Diagram architektury
5. Decyzje i kompromisy (link do ADR-ów) oraz to, co świadomie pominąłeś
6. Testy i jakość (badge CI, wynik Lighthouse, wyniki evali)
7. Jak uruchomić lokalnie
8. Co zrobiłbym dalej

---

## 10. Pytania, na które musisz umieć odpowiedzieć bez otwierania IDE

1. Co dokładnie dzieje się w cache TanStack Query, gdy przeciągam kartę, a serwer zwraca błąd?
2. Dlaczego fractional indexing, a nie liczby całkowite? Co, gdy klucze zrobią się bardzo długie?
3. Jak działa intercepting route i co widzi użytkownik po odświeżeniu strony z otwartym modalem?
4. Gdzie kończy się RSC, a zaczyna komponent kliencki na tablicy i dlaczego akurat tam?
5. Jak renderujesz częściowy obiekt w trakcie streamu i kiedy go walidujesz?
6. Jak chronisz się przed prompt injection z treści oferty i przed nabiciem rachunku za API?
7. Jak sprawdzasz, że użytkownik A nie odczyta aplikacji użytkownika B?
8. Jak testujesz funkcje AI deterministycznie?
9. Jak komunikujesz przeciąganie karty użytkownikowi czytnika ekranu?
10. Co byś zmienił, gdyby tablicę edytowało 5 osób jednocześnie? (Odpowiedź: real-time, CRDT/Liveblocks, inny model konfliktów.)

---

## 11. Design: jak uniknąć AI slopu

### Zanim agent napisze pierwszy komponent (Dzień 0, ok. 2 godziny)

1. **Moodboard 3–5 referencji** z produktów, które lubisz (np. Linear, Raycast, Things, Arc, Height). Zapisz je w `docs/design/references.md` i dopisz, _co konkretnie_ bierzesz z każdej (gęstość, typografia, animacje kart).
2. **Kierunek w jednym zdaniu**, np.: „Narzędzie robocze dla devów: gęste, spokojne, ciemne domyślnie, jeden ostry akcent, dużo detali w mikrointerakcjach”.
3. **Tokeny w `app/globals.css`** (zmienne CSS dla shadcn), ustalone przez Ciebie, a nie przez agenta:
   - jeden akcent, **nie fiolet ani niebieski gradient** (np. pomarańcz, limonka, koral) i neutralne szarości z jednej rodziny,
   - font: Geist, Satoshi albo inny, ale **nie domyślny Inter**, plus mono do liczb i widełek,
   - jedna skala zaokrągleń, cienie barwione kolorem tła albo brak cieni,
   - jedna rodzina ikon (np. Phosphor) zamiast domyślnego Lucide.
4. **Strona `/styleguide`:** wszystkie komponenty i stany (hover, focus, disabled, error, loading) na jednym ekranie, w trybie jasnym i ciemnym. To Twoje źródło prawdy i dobry materiał do README.

### Sygnatura produktu (to, co zapamięta rekruter)

- **Tryb Roast ma własną osobowość wizualną:** zmiana akcentu, inny ton copy, wyraźne przejście przy przełączeniu trybu. Bez fajerwerków na całej stronie, tylko tu.
- **Animacje z sensem** (Motion, `layout`/`layoutId`): karta płynnie przesuwa się między kolumnami, pola z AI pojawiają się po kolei w trakcie streamu, match score animuje się do wyniku. Każda animacja ma powód i działa z `prefers-reduced-motion`.
- **Empty states i copy z charakterem** (np. pusta kolumna „Offer”), ale konkretne, bez marketingowej waty typu „seamless” czy „elevate”.
- **Prawdziwe dane demo:** realistyczne firmy i oferty zamiast „Acme Corp” i „John Doe”.

### Lista zakazana (AI tells)

Fioletowe gradienty i glow, wyśrodkowany hero na ciemnym tle z blobem, trzy identyczne karty funkcji, glassmorphism wszędzie, domyślny shadcn bez zmian, emoji zamiast ikon, małe etykiety UPPERCASE nad każdą sekcją, em-dashe w copy, fałszywe zrzuty ekranu zbudowane z divów, kręcący się spinner zamiast skeletonu.

### Wybrany kierunek: B „Biuro podawcze”

**Idea:** kartoteka rekrutacyjna. Kolumny to teczki z zakładkami, oferty to karty z perforacją, statusy to pieczątki, a tryb Roast to czerwony długopis rekrutera. Projekt makiet: canvas „Huntboard: kierunki wizualne”, artboard B.

**Tokeny do `app/globals.css`** (aktualna wersja: `src/app/globals.css` w repo) (shadcn czyta te zmienne; kontrast sprawdzony pod WCAG AA):

```css
@import "tailwindcss";

:root {
  --background: #ecede8; /* szary papier, nie krem */
  --card: #fbfbf8; /* kartka */
  --folder: #e2e4de; /* wnętrze teczki */
  --foreground: #1d2125; /* tusz */
  --muted-foreground: #5b6168;
  --border: #c9ccc4;
  --ink-border: #1d2125; /* grube ramki 1.5px */
  --primary: #2340c8; /* kobalt: akcje, pieczątki, match >= 80 */
  --primary-foreground: #ffffff;
  --primary-ink: #2340c8; /* kobalt jako tekst i linie */
  --primary-soft: #dce2fa; /* zakładka aktywnej teczki */
  --pen: #c8261e; /* czerwony długopis: TYLKO tryb Roast i błędy */
  --radius: 2px;
  --shadow-hard: 3px 3px 0 var(--ink-border);
}

.dark {
  /* „biuro po godzinach” */
  --background: #16181b;
  --card: #1f2226;
  --folder: #1a1d20;
  --foreground: #e9eae4;
  --muted-foreground: #9da2a8;
  --border: #33373c;
  --ink-border: #e9eae4;
  --primary: #3a57e8; /* tylko wypełnienia */
  --primary-foreground: #ffffff;
  --primary-ink: #8ea0ff; /* #3A57E8 jako tekst na ciemnym tle nie spełnia AA */
  --primary-soft: #232b52;
  --pen: #ff6b5e;
  --shadow-hard: 3px 3px 0 #000000;
}
```

**Fonty (`next/font/google`):** Bricolage Grotesque (nagłówki, 700–800, ciasny tracking), IBM Plex Sans (tekst), IBM Plex Mono (widełki, liczby, pieczątki), Caveat (wyłącznie dopiski czerwonym długopisem w trybie Roast).

**Komponenty sygnaturowe (zbuduj je jako pierwsze w `/styleguide`):**

- `FolderColumn`: zakładka teczki nad kolumną (`rounded-t-md`, ramka 1.5px bez dolnej krawędzi) i wnętrze `--folder`.
- `OfferCard`: kartka z `border-top: 2px dashed` (perforacja), wynik dopasowania w kółku, widełki w mono.
- `Stamp`: pieczątka statusu (`rotate(-4deg)`, ramka 2px, mono, uppercase). Wariant `pen` dla „DO POPRAWKI”.
- `PenNote`: dopisek odręczny (Caveat, `--pen`) + `PenStrike` (przekreślenie 2px) + `PenCircle` (zakreślenie).
- Przyciski: radius 2px, ramka 1.5px w kolorze tuszu, główny z `--shadow-hard`; na `:active` przesunięcie o 2px i zniknięcie cienia (efekt wciśnięcia).

**Zasady dla agenta (wklej do `AGENTS.md`):**

- Czerwień (`--pen`) tylko w trybie Roast i w komunikatach błędów. Nigdzie indziej.
- Caveat tylko w `PenNote`. Nigdy w nagłówkach ani przyciskach.
- Twarde cienie tylko na przyciskach głównych i panelu szczegółów, nie na każdej karcie.
- Pieczątki tylko tam, gdzie niosą informację (status, data). Maksymalnie jedna na kartę.
- Animacje: pieczątka „wbija się” przy zmianie statusu (scale 1.15 → 1, 150 ms), dopiski długopisu pojawiają się po kolei w trakcie streamu Roast. Wszystko wyłączone przy `prefers-reduced-motion`.

### Skille i pętla review

- **Landing (`/`)**: skill anti-slop (`design-taste-frontend`) albo `frontend-design` od Anthropic. Oba nadają się do stron marketingowych, nie do samej tablicy.
- **Aplikacja (tablica, formularze)**: Twoje tokeny + `/styleguide` + reguły w `AGENTS.md` (sekcja „Design rules” z listą zakazaną powyżej).
- **Pętla review co 2–3 dni:** Playwright robi zrzuty kluczowych ekranów (jasny/ciemny, desktop/mobile), a skill typu design critique je ocenia. Poprawki robisz od razu, nie na koniec.
- **Przed wysłaniem:** audyt a11y (kontrast, focus, klawiatura) i przegląd copy (UX writing).

---

## 12. Checklista przed wysłaniem do rekrutera

- [ ] Demo działa bez rejestracji (konto gościa z danymi)
- [ ] GIF/wideo w README
- [ ] CI zielone, badge w README
- [ ] Lighthouse ≥ 90, axe bez krytycznych błędów
- [ ] Brak sekretów w repo, `.env.example` obecny
- [ ] Limity AI działają (sprawdzone ręcznie)
- [ ] 5–6 ADR-ów
- [ ] Przypięte repo na GitHubie i link w CV + LinkedIn
- [ ] Żadnego punktu z „listy zakazanej” (sekcja 11), sprawdzone na zrzutach jasny/ciemny i desktop/mobile
