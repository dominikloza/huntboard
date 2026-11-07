import { APICallError } from "ai";

export type ProviderProblem =
  "auth" | "quota" | "rate-limit" | "model" | "rejected" | "unavailable";

/** What went wrong with the AI provider, in terms the app can act on. */
export function classifyProviderError(error: unknown): ProviderProblem {
  const cause = APICallError.isInstance(error)
    ? error
    : error instanceof Error && APICallError.isInstance(error.cause)
      ? error.cause
      : undefined;
  if (!cause) return "unavailable";

  const body = cause.responseBody ?? "";
  switch (cause.statusCode) {
    case 401:
    case 403:
      return "auth";
    case 404:
      return "model";
    case 429:
      return body.includes("insufficient_quota") ? "quota" : "rate-limit";
    case 400:
    case 422:
      // Gemini answers a bad key with 400 API_KEY_INVALID, not 401.
      return body.includes("API_KEY_INVALID") ? "auth" : "rejected";
    default:
      return "unavailable";
  }
}

const PUBLIC_MESSAGE = "AI chwilowo nie odpowiada. Spróbuj ponownie albo wpisz dane ręcznie.";

/**
 * Message for the user. Configuration problems (bad key, no credit, unknown model) are spelled
 * out only in development, where the person reading it is the one who can fix .env.local.
 */
export function providerErrorMessage(problem: ProviderProblem, isDev: boolean): string {
  if (problem === "rate-limit") {
    return "AI ma teraz za dużo zapytań. Spróbuj ponownie za chwilę.";
  }
  if (!isDev) return PUBLIC_MESSAGE;
  switch (problem) {
    case "auth":
      return "[dev] Dostawca AI odrzucił klucz. Sprawdź OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY w .env.local i zrestartuj pnpm dev.";
    case "quota":
      return "[dev] Brak środków na koncie OpenAI (insufficient_quota). Doładuj konto w Billing na platform.openai.com albo przełącz AI_PROVIDER=google.";
    case "model":
      return "[dev] Dostawca AI nie zna tego modelu albo klucz nie ma do niego dostępu. Sprawdź AI_MODEL.";
    case "rejected":
      return "[dev] Dostawca AI odrzucił zapytanie (400). Szczegóły w terminalu pnpm dev.";
    default:
      return PUBLIC_MESSAGE;
  }
}
