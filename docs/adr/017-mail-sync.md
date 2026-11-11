# 017: Mail sync through a Gmail Apps Script

- **Status:** Accepted
- **Date:** 2026-11-11

## Context

Most of the board's state is already in the inbox: job boards (JustJoin.it, No Fluff Jobs) and
ATS systems (eRecruiter) send a confirmation for every application, and companies answer with
invitations, offers and rejections. Typing all of it by hand is the reason trackers get
abandoned. Many companies never answer at all, so a card can wait in "Wysłane" forever.

## Decision

- **A Google Apps Script in the user's own Gmail**, not OAuth in Huntboard. The script (built by
  `appsScript()` and shown on the profile page) searches recruitment mail every hour and sends
  sender, subject, date and the first 6000 characters of the body to `POST /api/mail/messages`.
  It runs under the user's account, so Huntboard never holds a Gmail token.
- **A personal token** (`hb_mail_…`) authenticates the script. Only its SHA-256 hash is stored
  (`mail_connections`), the token is shown once, and a new one replaces the old. This route is
  the one exception to "userId from the session": the user is the token's owner.
- **Rules first, AI for the rest.** Known senders (JustJoin.it, No Fluff Jobs confirmations and
  status changes, eRecruiter) are read by regexes in `known-senders.ts`; everything else goes in
  one AI call per batch (max 20, `MAIL TRIAGE` prompt, e-mails in `<email>` data blocks), with a
  reservation from the same daily limit as other AI calls (ADR 010).
- **One pure function decides** (`decideMail`): create a card for a confirmation, move a card
  forward for an answer (never backwards), ask ("proposal") when the reading is unsure or two
  cards match, and log the e-mail as "unmatched" when no card fits. Every change writes a stage
  event with `source = "email"` at the e-mail's date.
- **Nothing silent.** "Z poczty" above the board lists 14 days of changes with "Cofnij" for every
  automatic one and "Zatwierdź" for proposals. `mail_messages` keeps the message id, subject and
  result, never the body; the id makes re-sent mail a no-op.
- **Auto-reject** in the daily cron: an "applied" card without any stage change for N days
  (default 30, set per user: off, 14, 21, 30, 45) moves to "Odrzucone" with `source = "timeout"`.
  Statistics do not count a timeout as an answer.

## Alternatives considered

- **Gmail OAuth with `gmail.readonly`:** the natural UX, but a restricted scope: a paid security
  assessment (CASA) before going public, or 100 test users with tokens that expire every 7 days.
- **Forwarding mail to an inbound address:** no Google setup, but the user forwards by hand or
  with a filter, and the whole mail passes through a third-party inbox.
- **AI for every e-mail:** simpler, but the known formats are most of the traffic, and rules are
  free, instant and exact.

## Consequences

- Setup takes the user about 3 minutes and an "unverified app" warning from Google (their own
  script). The `mail` eval suite checks the rules and the AI on 13 real and synthetic e-mails.
- A sender that changes its template falls back to the AI, not to a wrong card.
- Guests can connect mail too (for the demo), and the connection disappears with the guest.
