import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Against a preview deployment set E2E_BASE_URL and no local server is started.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          // AI features run against the scripted demo model: deterministic and free (ADR 009).
          AI_PROVIDER: "mock",
          // Auth must trust the port the tests run on (overrides .env.local and CI env).
          BETTER_AUTH_URL: baseURL,
        },
      },
});
