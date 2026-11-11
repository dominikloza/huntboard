/**
 * Job boards Huntboard may download an offer page from (ADR 018). An allowlist, not "any URL":
 * the server fetches the page, so an open list would let anyone make it call internal
 * addresses (SSRF). Each entry is a host and the path shape of a single offer.
 */
export const OFFER_SITES = [
  { host: "justjoin.it", name: "JustJoin.it", path: /^\/job-offer\/[^/]+\/?$/ },
  { host: "nofluffjobs.com", name: "No Fluff Jobs", path: /^\/(?:[a-z]{2}\/)?job\/[^/]+\/?$/ },
  { host: "rocketjobs.pl", name: "RocketJobs", path: /^\/oferta-pracy\/[^/]+\/?$/ },
  { host: "theprotocol.it", name: "theprotocol.it", path: /^\/szczegoly\/praca\/[^/]+\/?$/ },
  { host: "pracuj.pl", name: "Pracuj.pl", path: /^\/praca\/[^/]+,oferta,\d+\/?$/ },
  { host: "bulldogjob.pl", name: "Bulldogjob", path: /^\/companies\/jobs\/\d+[^/]*\/?$/ },
  { host: "solid.jobs", name: "Solid.Jobs", path: /^\/offer\/\d+\/[^/]+\/?$/ },
] as const;

export const OFFER_SITE_NAMES = OFFER_SITES.map((s) => s.name).join(", ");

const siteOf = (hostname: string) =>
  OFFER_SITES.find((s) => hostname === s.host || hostname === `www.${s.host}`);

/**
 * A link to a single offer on an allowed board, normalised to `https://host/path` (no query,
 * no tracking parameters), or null. No other port, no credentials, https only.
 */
export function parseOfferUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const site = siteOf(url.hostname.toLowerCase());
  if (!site || !site.path.test(url.pathname)) return null;
  return `https://${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"'()[\]]+/gi;

const words = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);

/** Share of the card's words (company + title) found in the link's path. */
function overlap(url: string, card: { company: string; role: string }): number {
  const slug = new Set(words(new URL(url).pathname));
  const wanted = [...new Set(words(`${card.company} ${card.role}`))];
  if (wanted.length === 0) return 0;
  return wanted.filter((w) => slug.has(w)).length / wanted.length;
}

/**
 * The offer an e-mail is about. Confirmations also list "similar offers", so the first link is
 * not enough: the winner is the offer link whose path shares the most words with the card's
 * company and title, and it must share at least a third of them.
 */
export function offerUrlInMail(
  body: string,
  card: { company: string; role: string },
): string | null {
  const links = new Set(
    [...body.matchAll(URL_IN_TEXT)].map((m) => parseOfferUrl(m[0])).filter((u) => u !== null),
  );
  let best: { url: string; score: number } | null = null;
  for (const url of links) {
    const score = overlap(url, card);
    if (!best || score > best.score) best = { url, score };
  }
  return best && best.score >= 1 / 3 ? best.url : null;
}
