import { defineConfig, devices } from "@playwright/test";

import { E2E_CRON_SECRET } from "./e2e/helpers";

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
    // Vercel Preview deployments are protected by default; this header lets CI through
    // ("Protection Bypass for Automation" in the Vercel project settings).
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
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
          // Tiny limit so the 429 path is quick to test (each test gets a fresh guest).
          AI_LIMIT_GUEST_PER_HOUR: "3",
          // Auth must trust the port the tests run on (overrides .env.local and CI env).
          BETTER_AUTH_URL: baseURL,
          // Lets e2e/cron.spec.ts call the guest cleanup like Vercel Cron does.
          CRON_SECRET: E2E_CRON_SECRET,
        },
      },
});
