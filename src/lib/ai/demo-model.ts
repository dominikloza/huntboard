import "server-only";

import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { type OfferExtraction } from "@/features/extract/schemas";
import { type MatchComment } from "@/features/match/schemas";

/** What the demo model "extracts", whatever the input. Matches e2e/fixtures/offer.txt. */
export const DEMO_EXTRACTION: OfferExtraction = {
  company: "Kreska Software",
  role: "Frontend Developer (React)",
  seniority: "Mid",
  workMode: "hybrid",
  city: "Wrocław",
  salaryMin: 16000,
  salaryMax: 22000,
  stack: ["React", "TypeScript", "Next.js", "TanStack Query", "Playwright"],
  redFlags: ["Zadanie rekrutacyjne na 3 dni bez wynagrodzenia."],
};

/** The demo coach and roast comments (any card). */
export const DEMO_COACH: MatchComment = {
  verdict: "Dobra oferta dla Ciebie: stack się zgadza, a widełki mieszczą Twoje minimum.",
  strengths: [
    "Znasz React i TypeScript, czyli rdzeń projektu.",
    "Widełki powyżej Twojego minimum.",
  ],
  gaps: ["Brak doświadczenia z Playwright, o które pytają w ogłoszeniu."],
  advice: "W CV pokaż projekt z testami e2e, nawet mały.",
};

export const DEMO_ROAST: MatchComment = {
  verdict: "Szukają ninja, a płacą jak za praktykanta z kawą w gratisie.",
  strengths: ["Przynajmniej React się zgadza."],
  gaps: [
    "Owocowe czwartki to nie benefit, to dieta.",
    "Trzy dni darmowego zadania? To nie rekrutacja, to staż.",
  ],
  advice: "Zapytaj o widełki przed zadaniem, nie po.",
};

/** Markers a test can put in the pasted text to drive the demo model. */
const SLOW = "[demo:slow]";
const FAIL = "[demo:fail]";

function promptText(prompt: unknown): string {
  return JSON.stringify(prompt);
}

/**
 * A scripted language model: streams DEMO_EXTRACTION as JSON in small chunks, like a real
 * model would. Used with AI_PROVIDER=mock (e2e tests, working without an API key).
 */
export function createDemoModel() {
  return new MockLanguageModelV4({
    provider: "huntboard-demo",
    modelId: "demo",
    doStream: async ({ prompt }) => {
      const text = promptText(prompt);
      if (text.includes(FAIL)) throw new Error("Demo model failure");

      // The match prompt has a <score> block; the roast instructions start with "ROAST MODE".
      const answer = text.includes("<score>")
        ? text.includes("ROAST MODE")
          ? DEMO_ROAST
          : DEMO_COACH
        : DEMO_EXTRACTION;
      const json = JSON.stringify(answer);
      const deltas = json.match(/.{1,12}/gs) ?? [];
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 100,
          chunkDelayInMs: text.includes(SLOW) ? 400 : 30,
          chunks: [
            { type: "text-start", id: "t" },
            ...deltas.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
            { type: "text-end", id: "t" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: {
                  total: 0,
                  noCache: 0,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: { total: 0, text: 0, reasoning: undefined },
              },
            },
          ],
        }),
      };
    },
  });
}
