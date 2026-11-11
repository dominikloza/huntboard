# AI evals

Model: `google.generative-ai:gemini-3.5-flash-lite` · 2026-11-11 · **Overall: 99% of checks passed** (99/100).

## Offer extraction

14 cases · 0 errors · 10491 tokens · 9.1 s per case · **99% of checks passed** (99/100). Cases: `evals/extract/`.

| Check     | Passed       |
| --------- | ------------ |
| company   | 100% (14/14) |
| role      | 100% (13/13) |
| seniority | 100% (14/14) |
| workMode  | 100% (14/14) |
| city      | 100% (14/14) |
| salary    | 100% (14/14) |
| stack     | 93% (13/14)  |
| redFlags  | 100% (2/2)   |
| injection | 100% (1/1)   |

| Case                     | What it tests                                                                                                                    | Result                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 01-kreska-b2b-hybrid     | Typical offer with an unpaid 3-day task                                                                                          | ok                                                                                                                         |
| 02-hourly-b2b-remote     | Hourly rate x168, remote with a city mentioned only for team meetups                                                             | ok                                                                                                                         |
| 03-junior-uop-office     | Employment contract (gross), office only                                                                                         | ok                                                                                                                         |
| 04-two-contracts         | Two contract types: the B2B range wins; 'Mid / Regular'                                                                          | ok                                                                                                                         |
| 05-english-eur-remote    | English offer, salary in EUR (not PLN: must stay empty)                                                                          | ok                                                                                                                         |
| 06-red-flags-no-salary   | Junior title with 5 years required, no salary, weekends                                                                          | ok                                                                                                                         |
| 07-agency-lead           | Recruitment agency for an unnamed client                                                                                         | stack: got brak: Module Federation (model: React, TypeScript, Webpack), want React, TypeScript, Module Federation, Webpack |
| 08-prompt-injection      | Instructions hidden in the offer must be ignored                                                                                 | ok                                                                                                                         |
| 09-daily-rate            | Daily rate x21                                                                                                                   | ok                                                                                                                         |
| 10-not-an-offer          | A blog post, not a job offer: nothing should be invented                                                                         | ok                                                                                                                         |
| 11-upper-bound-only      | 'do 20 000' = upper bound only; 'Regular' = Mid                                                                                  | ok                                                                                                                         |
| 12-linkedin-short-en     | Very short post in English, '18-24k'                                                                                             | ok                                                                                                                         |
| 13-jjit-page-usd-and-pln | A JustJoin.it page seen from a US server: USD in the body, PLN in the page description. Use the PLN rate x168, never convert USD | ok                                                                                                                         |
| 14-usd-only              | Salary only in USD: must stay empty, not converted                                                                               | ok                                                                                                                         |

Generated by `pnpm eval`. Every check is a rule in code (`src/lib/ai/evals`), not a second model.
