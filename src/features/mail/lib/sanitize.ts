import { type MailReading } from "./types";

/**
 * Gmail's plain-text body keeps traces of the HTML mail: `*bold*`, `[image: alt]` and links as
 * `text <https://...>`. Drop them before reading, so rules and the AI see only the words.
 */
export function plainMailText(text: string): string {
  return text
    .replace(/\[image:[^\]]*\]/gi, " ")
    .replace(/<(?:https?:|mailto:)[^>\s]*>/gi, " ")
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    .replace(/(^|[\s(])[*_]+(?=\S)|(?<=\S)[*_]+(?=[\s.,;:!?)]|$)/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

const field = (value: string | null, max: number) => {
  const text = value === null ? "" : plainMailText(value).replace(/\s+/g, " ").trim();
  return text.length > 0 && text.length <= max ? text : null;
};

/** A city is a short name: anything with digits, links or markup is a misread, not a city. */
const city = (value: string | null) => {
  const text = field(value, 40);
  return text && !/[\d<>[\]@/|]/.test(text) ? text : null;
};

/** Last guard before a reading touches the board, for rules and the AI alike. */
export function sanitizeReading(reading: MailReading): MailReading {
  return {
    ...reading,
    company: field(reading.company, 120),
    role: field(reading.role, 160),
    city: city(reading.city),
  };
}
