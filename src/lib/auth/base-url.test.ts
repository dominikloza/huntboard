import { resolveAuthUrls } from "./base-url";

describe("resolveAuthUrls", () => {
  it("uses BETTER_AUTH_URL locally", () => {
    expect(resolveAuthUrls({ BETTER_AUTH_URL: "http://localhost:3000" })).toEqual({
      baseURL: "http://localhost:3000",
      trustedOrigins: ["http://localhost:3000"],
    });
  });

  it("uses BETTER_AUTH_URL in production and trusts the vercel.app domain", () => {
    const urls = resolveAuthUrls({
      BETTER_AUTH_URL: "https://huntboard.vercel.app",
      VERCEL_ENV: "production",
      VERCEL_URL: "huntboard-abc123.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "huntboard.vercel.app",
    });
    expect(urls.baseURL).toBe("https://huntboard.vercel.app");
    expect(urls.trustedOrigins).toContain("https://huntboard-abc123.vercel.app");
  });

  it("uses the deployment URL on previews, even if BETTER_AUTH_URL leaked into Preview env", () => {
    const urls = resolveAuthUrls({
      BETTER_AUTH_URL: "https://huntboard.vercel.app",
      VERCEL_ENV: "preview",
      VERCEL_URL: "huntboard-git-feat-x.vercel.app",
      VERCEL_BRANCH_URL: "huntboard-git-feat-x-dominik.vercel.app",
    });
    expect(urls.baseURL).toBe("https://huntboard-git-feat-x.vercel.app");
    expect(urls.trustedOrigins).toEqual(
      expect.arrayContaining([
        "https://huntboard-git-feat-x.vercel.app",
        "https://huntboard-git-feat-x-dominik.vercel.app",
      ]),
    );
  });

  it("fails loudly when nothing is configured", () => {
    expect(() => resolveAuthUrls({})).toThrow(/BETTER_AUTH_URL/);
  });
});
