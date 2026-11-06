# 003: Self-hosted fonts via Fontsource

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

`next/font/google` downloads fonts at build time. Builds in restricted networks (some CI runners,
sandboxes) fail when Google Fonts is unreachable. The UI needs Polish characters (latin-ext).

## Decision

Fonts come from npm (`@fontsource/*`, `@fontsource-variable/*`) and are imported as CSS in
`src/app/layout.tsx`. Fontsource CSS uses `unicode-range`, so browsers download only the subsets a
page needs, and `font-display: swap`.

## Alternatives considered

- **`next/font/google`:** automatic preload and size-adjusted fallbacks, but needs network at build.
- **`next/font/local` with files from node_modules:** keeps preloading, but one file per weight
  and subset without `unicode-range` makes Polish support awkward.

## Consequences

- Builds are reproducible offline; fonts are versioned in `package.json`.
- No automatic fallback metrics: watch CLS on headings in Lighthouse (Day 9). If it is a problem,
  add `size-adjust` fallbacks or move display fonts to `next/font/local`.
