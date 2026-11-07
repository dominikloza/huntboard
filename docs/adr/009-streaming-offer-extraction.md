# 009: Streaming offer extraction with a human in the loop

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

Adding an offer by hand means copying eight fields out of a long ad. The AI should read the
pasted offer and fill the form. A full answer takes a few seconds, so waiting for it with a
spinner feels slow, and the model can be wrong, so its answer must never be saved unchecked.

## Decision

**Server.** `POST /api/extract` (Route Handler, not a Server Action, because it streams):
session check, input limits (`extractRequestSchema`: 80 to 12 000 characters), then
`streamText` with `Output.object({ schema: offerExtractionSchema })` (AI SDK 7). The model comes
from one function, `getModel()` (`src/lib/ai/model.ts`): OpenAI by default, Gemini with
`AI_PROVIDER=google` (thinking turned off: extraction needs no reasoning and the first field
should appear at once), a scripted demo model with `AI_PROVIDER=mock`. Switching providers is
an environment change, not a code change.

**Client.** `useObject` parses the text stream into a `DeepPartial<OfferExtraction>` as it
arrives. A pure mapper (`extractionToFormValues`) turns it into form values, and the normal
React Hook Form form follows them with `setValue`. While streaming, the fields are `inert`;
fields the model has not answered yet are placeholders, and each field gets a short highlight
when its value lands. When the stream ends, the user edits and saves with the same
`createApplication` Server Action and Zod schema as the manual form. The raw offer and the red
flags are saved with the card for later (match score, roast).

**Error before the first token.** The SDK's text stream drops error parts, so a bad key or a
provider outage would look like a 200 with an empty body. `textStreamAfterFirstChunk` waits for
the first text: an earlier error becomes a 502 with a Polish message, a later one ends the
stream and the user keeps what already arrived.

**Prompt.** The offer is untrusted data inside an `<offer>` block (a closing tag in the text is
escaped); the instructions say never to follow text inside it. Hardened further on Day 6.

**Tests.** The demo model streams a fixed extraction in small chunks; markers in the pasted text
make it slow (`[demo:slow]`, for the Stop test) or fail (`[demo:fail]`). Playwright starts the
app with `AI_PROVIDER=mock`, so e2e runs are deterministic and cost nothing.

## Alternatives considered

- **`generateObject` and a spinner:** simpler, but 3 to 6 seconds of nothing; streaming shows
  progress and lets the user stop early.
- **A separate preview card, then the form:** two places showing the same data, and a jump
  between them. Streaming into the real form keeps one place to look at.
- **Saving straight from the AI answer:** fastest, but wrong data would land on the board
  silently. The user confirms every card.
- **A Server Action returning a streamable value:** Route Handler + `useObject` is the
  documented AI SDK path and works with `fetch` abort for Stop.

## Consequences

- "Stop" aborts the fetch; the Route Handler passes `request.signal` to the model call, so the
  provider stops generating (no tokens paid for text nobody reads).
- The form component knows about streams (`stream` prop). Kept generic: values, answered
  fields, active flag.
- No rate limit or usage log yet: anyone signed in (also guests) can call the model. Day 6 adds
  both before the model call (ADR 010).
