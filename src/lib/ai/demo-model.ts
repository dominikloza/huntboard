import "server-only";

import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { type OfferExtraction } from "@/features/extract/schemas";
import { type InterviewQuestions } from "@/features/interview/schemas";
import { type MailReadings } from "@/features/mail/schemas";
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

/** The demo interview prep (any card). */
export const DEMO_QUESTIONS: InterviewQuestions = {
  questions: [
    {
      topic: "React",
      question: "Kiedy użyjesz useMemo, a kiedy to przedwczesna optymalizacja?",
      hint: "Koszt obliczenia vs koszt porównania zależności, stabilne referencje dla dzieci w memo, pomiar w Profilerze przed zmianą.",
    },
    {
      topic: "TypeScript",
      question:
        "Jak otypujesz komponent, który przyjmuje albo href, albo onClick, ale nie oba naraz?",
      hint: "Unia rozłączna z polami never, ewentualnie przeciążenia; pokaż, jak kompilator łapie błędne użycie.",
    },
    {
      topic: "Next.js",
      question: "Co zrobisz, żeby strona z danymi użytkownika nie trafiła do statycznego cache?",
      hint: "Odczyt cookies lub sesji w Suspense, connection() przed zapytaniem, różnica między prerenderem a renderem na żądanie.",
    },
    {
      topic: "Playwright",
      question: "Jak napiszesz test e2e, który nie miga przy wolnym serwerze?",
      hint: "Lokatory po roli i etykiecie, asercje z automatycznym czekaniem zamiast sleep, izolowane dane testowe.",
    },
    {
      topic: "React",
      question: "Jak zrobisz optymistyczną aktualizację listy i co, gdy serwer zwróci błąd?",
      hint: "Kopia stanu przed zmianą, cofnięcie tylko zmienionego elementu, komunikat dla użytkownika i ponowna synchronizacja.",
    },
    {
      topic: "Praca w zespole",
      question: "Opowiedz o code review, w którym się z kimś nie zgadzałeś. Jak to rozwiązaliście?",
      hint: "Konkretna sytuacja, argumenty zamiast gustu, kompromis albo decyzja zespołu i czego się nauczyłeś.",
    },
  ],
  askThem: [
    "Jakie są widełki przed zadaniem rekrutacyjnym i czy zadanie jest płatne?",
    "Ile osób jest w zespole frontendowym i kto robi code review?",
  ],
};

/**
 * The demo reading of recruitment e-mails: keywords instead of a model, so e2e tests can write
 * e-mails that mean what they say. The company is the sender's display name.
 */
export function demoMailReadings(promptText: string): MailReadings {
  const blocks = promptText.split("<email>").slice(1);
  return {
    results: blocks.map((block) => {
      const index = Number(/index: (\d+)/.exec(block)?.[1] ?? -1);
      const from = /from: (.*)/.exec(block)?.[1] ?? "";
      const body = block.toLowerCase();
      const kind = /niestety|regret|nie przechodzisz/.test(body)
        ? "rejected"
        : /zaprosić|zaproszenie|interview/.test(body)
          ? "interview"
          : /offer you|składamy ofertę/.test(body)
            ? "offer"
            : /dziękujemy za aplikację|thank you for (your )?appl/.test(body)
              ? "applied"
              : "other";
      const company = from.split("<")[0]?.trim() || null;
      const role = /stanowisko:? ([^.\n]+)/i.exec(block)?.[1]?.trim() ?? null;
      return { index, kind, company, role, city: null, sure: true };
    }),
  };
}

/** All the text in a prompt (system + user parts). */
function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join("\n");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.content === "string") return record.content;
    return textOf(record.content);
  }
  return "";
}

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

      // The match prompt has a <score> block; the roast instructions start with "ROAST MODE";
      // interview prep starts with "INTERVIEW PREP".
      const answer = text.includes("MAIL TRIAGE")
        ? demoMailReadings(textOf(prompt))
        : text.includes("INTERVIEW PREP")
          ? DEMO_QUESTIONS
          : text.includes("<score>")
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
