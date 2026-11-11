import { plainMailText } from "./sanitize";
import { type MailReading } from "./types";

type Mail = { from: string; subject: string; body: string };

const fromDomain = (from: string, domain: string) =>
  new RegExp(`@([a-z0-9-]+\\.)*${domain.replace(".", "\\.")}>?\\s*$`, "i").test(from.trim());

const clean = (text: string | undefined) => text?.replace(/\s+/g, " ").trim() || null;

/** No Fluff Jobs status words -> our stages. "in progress" means read, not answered. */
function nfjStatus(status: string): MailReading["kind"] {
  const s = status.toLowerCase();
  if (/reject|odrzuc|not selected|declin/.test(s)) return "rejected";
  if (/interview|rozmow|meeting|spotkan/.test(s)) return "interview";
  if (/offer|ofert|hired|zatrudn/.test(s)) return "offer";
  return "progress";
}

/**
 * Automatic e-mails from job boards and applicant tracking systems have a fixed shape: read
 * them with rules (free, deterministic) instead of the AI. Returns null for anything else.
 */
export function readKnownSender({ from, subject, body }: Mail): MailReading | null {
  const subj = subject.replace(/\s+/g, " ").trim();
  const text = plainMailText(body).replace(/\s+/g, " ");

  if (fromDomain(from, "justjoin.it")) {
    const role = /^You applied for (.+)$/i.exec(subj)?.[1];
    const company = /applied for .+? on Just Join IT to (.+?)\.(?:\s|$)/i.exec(text)?.[1];
    if (!role || !company) return null;
    // The body adds the city after the title: "Staff Engineer — React Kraków".
    const full = /applied for (.+?) on Just Join IT/i.exec(text)?.[1] ?? "";
    const city = full.startsWith(role) ? clean(full.slice(role.length)) : null;
    return { kind: "applied", company: clean(company), role: clean(role), city, sure: true };
  }

  if (fromDomain(from, "nofluffjobs.com")) {
    const change =
      /Your application for the position (.+) @ (.+) has changed its status to (.+?)\.?$/i.exec(
        subj,
      );
    if (change) {
      return {
        kind: nfjStatus(change[3] ?? ""),
        role: clean(change[1]),
        company: clean(change[2]),
        city: null,
        sure: true,
      };
    }
    const applied = /^Your application for (.+) @ (.+)$/i.exec(subj);
    if (applied) {
      return {
        kind: "applied",
        role: clean(applied[1]),
        company: clean(applied[2]),
        city: null,
        sure: true,
      };
    }
    return null;
  }

  if (fromDomain(from, "erecruiter.pl")) {
    const applied =
      /^(.+?) - Dziękujemy za (?:zgłoszenie|złożenie aplikacji|aplikację|przesłanie aplikacji) na stanowisko (.+)$/i.exec(
        subj,
      );
    if (applied) {
      return {
        kind: "applied",
        company: clean(applied[1]),
        role: clean(applied[2]),
        city: null,
        sure: true,
      };
    }
  }

  return null;
}
