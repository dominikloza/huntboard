# 018: Filling a card from its offer (link or text)

- **Status:** Accepted
- **Date:** 2026-11-11

## Context

Mail sync (ADR 017) creates cards from confirmations, but an e-mail says only that you applied,
not what for: company and title, no stack, level or salary. Without them the match score, the
coach and roast comments and the interview prep have nothing to work on. Offers also expire, so
the details must be captured soon after applying.

## Decision

- **"Uzupełnij z ogłoszenia" in every card**: one field for a link or the pasted offer. A link
  is downloaded by the server (`loadOfferPage`, Server Action, session required), then the text
  goes through the same extraction as a new card (`/api/extract`, same limits and evals). The
  result fills **only the empty fields** (`fillFromOffer`): what the user or the e-mail wrote
  stays, except the default work mode of a card never read from an offer. Nothing is saved
  until "Zapisz zmiany"; the offer text and the red flags are saved with it.
- **The link comes from the e-mail.** Gmail's plain body keeps links as `<https://...>`, so the
  script needs no change: `offerUrlInMail` takes the offer link whose path shares most words with
  the card's company and title (confirmations also list "similar offers"). It runs for every
  batch, also for e-mails seen before, so running `setup()` again links older cards.
- **Downloads only from an allowlist** (`OFFER_SITES`: JustJoin.it, No Fluff Jobs, RocketJobs,
  theprotocol.it, Pracuj.pl, Bulldogjob, Solid.Jobs): https, default port, a single-offer path.
  Every redirect is checked again (`redirect: "manual"`), 10 s timeout, 3 MB cap. An expired
  offer redirects to a listing, fails the check, and the user is asked to paste the text.
- **Reading the page:** the page description first, then the schema.org `JobPosting` that
  boards publish for Google Jobs (structured, no menus or cookie banners), and the visible text
  as a fallback. Boards localise the visible salary by the visitor's country: from Vercel's US
  region JustJoin.it shows USD, while the description keeps the PLN rate.
- **Salaries stay in PLN.** The prompt prefers PLN amounts and forbids converting other
  currencies; `salaryCanBePln` also drops a salary in code when the offer names only a foreign
  currency (the model once turned 21-25 USD/h into "3064-3639 zł"). Eval cases 13 and 14.
- **Visible gaps:** a card without a stack says "Brak stacku - do uzupełnienia" on the board and
  hides its score; inside, the panel is open and the match and prep sections point to it.

## Alternatives considered

- **Fill automatically when the e-mail arrives:** no click, but 18 confirmations at once spend
  the daily AI limit and nothing would be confirmed by a person (ADR 009).
- **Fetch any URL the user pastes:** works for every site, but makes the server an open proxy
  into private addresses (SSRF). Other sites still work by pasting the text.
- **The job boards' private APIs:** precise, but undocumented and different per board.

## Consequences

- A board that changes its URL shape needs a new pattern in `OFFER_SITES` (unit-tested).
- E2E never fetches a real page: with `AI_PROVIDER=mock` the demo link returns a scripted page.
- LinkedIn and company career pages need the pasted text.
