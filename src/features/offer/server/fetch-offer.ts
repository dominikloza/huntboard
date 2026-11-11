import { OFFER_MIN_LENGTH } from "@/features/board/constants";

import { offerTextFromHtml } from "../lib/offer-page";
import { OFFER_SITE_NAMES, parseOfferUrl } from "../lib/offer-url";

const MAX_REDIRECTS = 3;
const MAX_BYTES = 3_000_000;
const TIMEOUT_MS = 10_000;

export type FetchedOffer = { ok: true; text: string; url: string } | { ok: false; error: string };

/**
 * Downloads one offer page (ADR 018). Only allowed boards (`parseOfferUrl`), and every redirect
 * is checked again, so a board's redirect cannot send the server somewhere else. An expired
 * offer usually redirects to a listing: that fails the check and the user pastes the text.
 */
export async function fetchOfferPage(input: string): Promise<FetchedOffer> {
  let url = parseOfferUrl(input);
  if (!url) {
    return {
      ok: false,
      error: `Pobieram ogłoszenia tylko z: ${OFFER_SITE_NAMES}. Z innej strony wklej treść.`,
    };
  }

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          Accept: "text/html",
          "Accept-Language": "pl,en;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; Huntboard/1.0; job application tracker)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const next = parseOfferUrl(new URL(response.headers.get("location") ?? "", url).href);
        if (!next) return { ok: false, error: "Ta oferta wygasła albo została przeniesiona." };
        url = next;
        continue;
      }
      if (response.status === 404 || response.status === 410) {
        return { ok: false, error: "Ta oferta wygasła albo została usunięta." };
      }
      if (!response.ok) {
        return { ok: false, error: `Portal nie oddał strony (${response.status}). Wklej treść.` };
      }
      if (!(response.headers.get("content-type") ?? "").includes("html")) {
        return { ok: false, error: "Pod tym linkiem nie ma strony z ogłoszeniem." };
      }
      if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) {
        return { ok: false, error: "Strona jest za duża. Wklej treść ogłoszenia." };
      }

      const text = offerTextFromHtml((await response.text()).slice(0, MAX_BYTES));
      if (text.length < OFFER_MIN_LENGTH) {
        return { ok: false, error: "Nie znalazłem treści ogłoszenia na tej stronie. Wklej ją." };
      }
      return { ok: true, text, url };
    }
    return { ok: false, error: "Za dużo przekierowań. Wklej treść ogłoszenia." };
  } catch (error) {
    console.error("Offer page fetch failed", error);
    return { ok: false, error: "Nie udało się pobrać strony. Wklej treść ogłoszenia." };
  }
}
