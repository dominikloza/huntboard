import { createHash, randomBytes } from "node:crypto";

/** Prefix so a leaked token is recognisable (and searchable by secret scanners). */
export const TOKEN_PREFIX = "hb_mail_";

/** A new personal token: shown to the user once, only its hash is stored. */
export function generateMailToken(): string {
  return TOKEN_PREFIX + randomBytes(24).toString("base64url");
}

export function hashMailToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** "hb_mail_...a1b2": enough to recognise a token in the settings, useless to an attacker. */
export function tokenHint(token: string): string {
  return `${TOKEN_PREFIX}...${token.slice(-4)}`;
}

/** The token from an `Authorization: Bearer ...` header, or null. */
export function bearerToken(header: string | null): string | null {
  const token = /^Bearer\s+(\S+)$/i.exec(header ?? "")?.[1];
  return token?.startsWith(TOKEN_PREFIX) ? token : null;
}
