"use server";

import { z } from "zod";

import { type ActionResult } from "@/features/board/actions";
import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";

import { DEMO_OFFER_PAGE, DEMO_OFFER_URL } from "./lib/demo-offer";
import { parseOfferUrl } from "./lib/offer-url";
import { fetchOfferPage } from "./server/fetch-offer";

/**
 * Downloads an offer page for "Uzupełnij z ogłoszenia" (ADR 018) and returns its text. The text
 * then goes through the usual extraction (/api/extract, with its limits); nothing is saved here.
 * Signed-in users only, so the server is not an open page fetcher.
 */
export async function loadOfferPage(
  url: unknown,
): Promise<ActionResult<{ text: string; url: string }>> {
  try {
    await requireSessionUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." };
    }
    throw error;
  }
  const parsed = z.string().max(2000).safeParse(url);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowy link." };

  // E2E never leaves the machine: the demo model's environment answers with a scripted page.
  if (process.env.AI_PROVIDER === "mock" && parseOfferUrl(parsed.data) === DEMO_OFFER_URL) {
    return { ok: true, data: { text: DEMO_OFFER_PAGE, url: DEMO_OFFER_URL } };
  }

  const result = await fetchOfferPage(parsed.data);
  return result.ok
    ? { ok: true, data: { text: result.text, url: result.url } }
    : { ok: false, error: result.error };
}
