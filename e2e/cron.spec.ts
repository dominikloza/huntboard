import { expect, test } from "@playwright/test";

import { E2E_CRON_SECRET, signInAsGuest } from "./helpers";

const CLEANUP = "/api/cron/cleanup-guests";

test.describe("guest cleanup cron", () => {
  test("refuses calls without the cron secret", async ({ request }) => {
    expect((await request.get(CLEANUP)).status()).toBe(401);
    const wrong = await request.get(CLEANUP, { headers: { Authorization: "Bearer guess" } });
    expect(wrong.status()).toBe(401);
  });

  test("runs with the secret and keeps active guests", async ({ page, request }) => {
    test.skip(!!process.env.E2E_BASE_URL, "the deployment's CRON_SECRET is not known to tests");

    await signInAsGuest(page);

    const response = await request.get(CLEANUP, {
      headers: { Authorization: `Bearer ${E2E_CRON_SECRET}` },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ deleted: expect.any(Number) });

    // A guest who was here a moment ago is not stale: the board still loads.
    await page.reload();
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByRole("heading", { name: "Mid Frontend Developer" })).toBeVisible();
  });
});
