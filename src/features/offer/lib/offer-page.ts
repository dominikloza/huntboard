import { OFFER_MAX_LENGTH } from "@/features/board/constants";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const decode = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });

/** Readable text from HTML: blocks become lines, tags and scripts disappear. */
export function htmlToText(html: string): string {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/tr|\/ul|\/ol|\/section)\b[^>]*>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const isObject = (v: Json | undefined): v is JsonObject =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const asList = (v: Json | undefined): Json[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);
const str = (v: Json | undefined): string | null =>
  typeof v === "string" ? v.trim() || null : typeof v === "number" ? String(v) : null;

function isJobPosting(node: JsonObject): boolean {
  return asList(node["@type"]).some((t) => t === "JobPosting");
}

/** Every JobPosting node in a JSON-LD document (top level, arrays or "@graph"). */
function findJobPostings(node: Json): JsonObject[] {
  if (Array.isArray(node)) return node.flatMap(findJobPostings);
  if (!isObject(node)) return [];
  if (isJobPosting(node)) return [node];
  return findJobPostings(node["@graph"] ?? null);
}

function salaryLine(posting: JsonObject): string | null {
  const salary = posting.baseSalary;
  if (!isObject(salary)) return null;
  const value = salary.value;
  const currency = str(salary.currency) ?? "";
  if (isObject(value)) {
    const min = str(value.minValue);
    const max = str(value.maxValue);
    const one = str(value.value);
    const unit = str(value.unitText) ?? "";
    const range = min && max ? `${min} - ${max}` : (min ?? max ?? one);
    return range ? `Wynagrodzenie: ${range} ${currency} ${unit}`.trim() : null;
  }
  const flat = str(value);
  return flat ? `Wynagrodzenie: ${flat} ${currency}`.trim() : null;
}

function locationLine(posting: JsonObject): string | null {
  const cities = asList(posting.jobLocation)
    .map((place) =>
      isObject(place) && isObject(place.address) ? str(place.address.addressLocality) : null,
    )
    .filter((c): c is string => c !== null);
  const remote = str(posting.jobLocationType) === "TELECOMMUTE" ? "praca zdalna" : null;
  const parts = [...new Set(cities), ...(remote ? [remote] : [])];
  return parts.length ? `Lokalizacja: ${parts.join(", ")}` : null;
}

const listLine = (label: string, v: Json | undefined) => {
  const items = asList(v)
    .map((x) => (typeof x === "string" ? x : isObject(x) ? str(x.name) : null))
    .filter((x): x is string => Boolean(x));
  return items.length ? `${label}: ${items.join(", ")}` : null;
};

/** The JobPosting written out as plain text, in the order a person reads an offer. */
function postingToText(posting: JsonObject): string {
  const org = isObject(posting.hiringOrganization) ? str(posting.hiringOrganization.name) : null;
  const description = str(posting.description);
  return [
    str(posting.title),
    org && `Firma: ${org}`,
    locationLine(posting),
    salaryLine(posting),
    listLine("Forma zatrudnienia", posting.employmentType),
    listLine("Umiejętności", posting.skills),
    str(posting.experienceRequirements) && `Doświadczenie: ${str(posting.experienceRequirements)}`,
    description && htmlToText(description.includes("<") ? description : decode(description)),
  ]
    .filter(Boolean)
    .join("\n");
}

const LD_JSON = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * The offer from a downloaded page (ADR 018). Job boards publish a schema.org JobPosting for
 * Google Jobs: structured, without menus and cookie banners. Without one, the page's visible
 * text is the fallback. Cut to what the extraction accepts.
 */
export function offerTextFromHtml(html: string): string {
  for (const [, json] of html.matchAll(LD_JSON)) {
    let data: Json;
    try {
      data = JSON.parse(json ?? "") as Json;
    } catch {
      continue;
    }
    const posting = findJobPostings(data)[0];
    if (posting) {
      const text = postingToText(posting);
      if (text.length >= 200) return text.slice(0, OFFER_MAX_LENGTH);
    }
  }
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return htmlToText(body.replace(/<(nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ")).slice(
    0,
    OFFER_MAX_LENGTH,
  );
}
