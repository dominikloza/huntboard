/**
 * Company names as they appear in e-mails ("BlueSoft Sp. z o.o.", "INTERIA.PL Sp. z o.o.",
 * "Addepto People & Culture Team <people@addepto.com>") versus on cards ("BlueSoft", "Interia").
 */

const LEGAL_FORMS =
  /\b(sp\.?\s*z\s*o\.?\s*o\.?|spolka z ograniczona odpowiedzialnoscia|s\.?\s*a\.?|sp\.?\s*k\.?|sp\.?\s*j\.?|ltd\.?|inc\.?|gmbh|llc|s\.?r\.?o\.?|group|poland|polska)\b/g;

/** Lower case, no diacritics, no legal form, no punctuation: "INTERIA.PL Sp. z o.o." -> "interiapl". */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .replace(LEGAL_FORMS, " ")
    .replace(/[^a-z0-9]/g, "");
}

/** Recruitment platforms and mail providers: their domain says nothing about the employer. */
const PLATFORM_DOMAINS = new Set([
  "gmail",
  "googlemail",
  "outlook",
  "hotmail",
  "wp",
  "onet",
  "o2",
  "interia",
  "justjoin",
  "nofluffjobs",
  "pracuj",
  "erecruiter",
  "workable",
  "greenhouse",
  "lever",
  "teamtailor",
  "smartrecruiters",
  "recruitee",
  "bamboohr",
  "linkedin",
  "traffit",
  "hrlink",
]);

/** The employer's name from the sender's domain: "people@addepto.com" -> "addepto"; platforms -> null. */
export function senderCompany(sender: string): string | null {
  const domain = /@([^>\s]+)/.exec(sender)?.[1]?.toLowerCase();
  if (!domain) return null;
  const labels = domain.split(".").filter(Boolean);
  // "mail.stage.erecruiter.pl" -> "erecruiter", "hr.houseofangular.io" -> "houseofangular"
  const name = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
  if (!name || PLATFORM_DOMAINS.has(name)) return null;
  return name;
}

/** Same employer? Exact after normalising, or one name contains the other (min. 4 letters). */
export function sameCompany(a: string, b: string): boolean {
  const x = normalizeCompany(a);
  const y = normalizeCompany(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && long.includes(short);
}

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .split(/[^a-z0-9.+#]+/)
      .filter((w) => w.length > 1),
  );

/** Share of the shorter title's words found in the other one (0-1). */
export function roleSimilarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  const [small, big] = x.size <= y.size ? [x, y] : [y, x];
  if (small.size === 0) return 0;
  let shared = 0;
  for (const w of small) if (big.has(w)) shared += 1;
  return shared / small.size;
}
