/**
 * Invisible characters (zero-width spaces, bidi overrides, other control characters) carry no
 * meaning in user text but can hide instructions from a human reviewer. Tabs and newlines stay.
 */
const INVISIBLE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

/** Any of our block tags, opening or closing: user text must not be able to fake one. */
const BLOCK_TAG = /<\/?(offer|profile|offer_summary|score|focus|email)>/gi;

/**
 * Wraps untrusted text (a pasted offer, a profile bio) in a named data block. The prompt's
 * instructions say never to follow text inside blocks; this makes sure the text cannot close
 * its block early or open a new one.
 */
export function dataBlock(tag: string, text: string): string {
  const safe = text.replace(INVISIBLE, "").replace(BLOCK_TAG, (t) => t.replace("<", "&lt;"));
  return `<${tag}>\n${safe}\n</${tag}>`;
}
