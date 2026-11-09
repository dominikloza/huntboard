# 014: Landing page with scroll-driven CSS animations

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

The landing page is the first thing a recruiter sees. A static 50/50 layout (text left,
screenshot right, repeat) looked like every template. We wanted motion that explains the product
(an offer moving through the desk) without a JavaScript animation library, without hurting
Lighthouse and without breaking direction B (ADR 002).

## Decision

- **Layout:** monumental title with a narrow side column, the board in a folder below it, a
  "rail" where one real `OfferCard` hops through the five columns, sticky step numbers, an
  inverted band for the score and roast, a register (ledger) of features, a closing folder.
  Screenshots are the real app on the demo account (`public/landing`, one file per theme).
- **Animations are CSS scroll-driven animations** (`animation-timeline: view()`), defined once in
  `globals.css` as `scroll-*` classes. No JavaScript, nothing runs on the main thread while
  scrolling. They sit inside `@media (prefers-reduced-motion: no-preference)` and
  `@supports (animation-timeline: view())`: everyone else (Firefox today, reduced motion) gets
  the final state, which is the element's base style.
- **The inverted band** (`.band`) swaps the red pen for the other theme's shade (`--band-pen`)
  so roast marks keep AA contrast on the dark band. The red pen there is still roast mode: it
  marks a pasted offer, as the app does.
- **Performance:** sections below the first screen use `content-visibility: auto`, so the Caveat
  font and the screenshots load when they come near. The board screenshot is hidden on phones
  (unreadable at 390 px), so the Largest Contentful Paint stays the heading.
- Score weights on the page come from `MATCH_WEIGHTS` and `MATCH_PART_LABELS` in
  `src/features/match/lib/score.ts`, never typed by hand.

## Update (Day 9): Motion for the rail and the weights

The CSS versions of two animations looked cheap: the card slid with `steps()` and the weight
bars were stretched with `scaleX`, squeezing their text. Both now use **Motion** (`motion`,
formerly Framer Motion), only on the landing page:

- **Rail** (`src/features/landing/components/board-rail.tsx`): the card is a shared-layout
  element (`layoutId`). Scroll progress picks the column (`stopAt`), Motion flies the card there
  with a spring, lifted (hard shadow, tilt) like a dragged card, and it lands with a new stamp
  (Wysłano, Rozmowa, Oferta).
- **Weights** (`score-weights.tsx`): bars are uncovered with `clip-path` (text is never
  distorted) and the numbers count up from 0.
- **Loading:** the server renders a static version of both (`rail-parts.tsx`,
  `weights-parts.tsx`), which is also what no-JS and reduced-motion visitors see.
  `deferred.tsx` swaps in the animated version only when the block is about to scroll into view
  (IntersectionObserver + `React.lazy`), and `LazyMotion` loads the animation features on
  demand, so Motion is not in the page's first JavaScript. Mobile Lighthouse stays around 90.

## Alternatives considered

- **Motion everywhere / GSAP ScrollTrigger:** more control and Firefox support, but 30-60 KB of
  JavaScript up front. Motion is now used for the two animations CSS could not make look good,
  loaded lazily (update above).
- **IntersectionObserver reveal classes:** works everywhere, but only plays once and needs a
  client component around every section.
- **Lottie or video:** heavy and not editable with the design tokens.

## Consequences

- No animation in Firefox until it ships scroll-driven animations; the page is complete
  without them.
- The landing page has the sign-in form twice (hero and the end). Tests pick the first one.
- `e2e/landing.spec.ts` runs axe on the page in both themes with reduced motion.
