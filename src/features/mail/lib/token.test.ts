import { bearerToken, generateMailToken, hashMailToken, TOKEN_PREFIX, tokenHint } from "./token";

describe("mail tokens", () => {
  it("generates long random tokens with a recognisable prefix", () => {
    const a = generateMailToken();
    const b = generateMailToken();
    expect(a.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(a.length).toBeGreaterThan(36);
    expect(a).not.toBe(b);
  });

  it("stores a stable hash, never the token", () => {
    const token = generateMailToken();
    expect(hashMailToken(token)).toBe(hashMailToken(token));
    expect(hashMailToken(token)).not.toContain(token);
    expect(hashMailToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("shows only the last characters", () => {
    expect(tokenHint("hb_mail_abcdefghijklmnop")).toBe("hb_mail_...mnop");
  });

  it("reads the token from the Authorization header", () => {
    expect(bearerToken("Bearer hb_mail_xyz")).toBe("hb_mail_xyz");
    expect(bearerToken("bearer   hb_mail_xyz")).toBe("hb_mail_xyz");
    expect(bearerToken("Bearer something-else")).toBeNull();
    expect(bearerToken("Basic hb_mail_xyz")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});
