import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

/** Every test gets its own guest account with fresh demo data. */
export async function signInAsGuest(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Wejdź jako gość" }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole("heading", { name: "Mid Frontend Developer" })).toBeVisible();
}

export const column = (page: Page, name: string) =>
  page.getByRole("region", { name: new RegExp(`^${name}`) });

export const cards = (page: Page, name: string) =>
  column(page, name).getByRole("heading", { level: 3 });
export const liveRegion = (page: Page) => page.locator('[id^="DndLiveRegion"]');
export const handle = (page: Page, role: string, company: string) =>
  page.getByRole("button", { name: `Przenieś kartę: ${role}, ${company}` });
export const alert = (page: Page, text: string) =>
  page.getByRole("alert").filter({ hasText: text });

/**
 * Lift a card with the keyboard. dnd-kit's KeyboardSensor starts listening for arrows on the
 * next tick after activation, so a bot pressing keys within the same millisecond would be lost
 * (a person can't type that fast).
 */
export async function lift(page: Page, role: string, company: string) {
  await handle(page, role, company).focus();
  await page.keyboard.press("Space");
  await expect(liveRegion(page)).toContainText(`Podniesiono kartę ${role}`);
  await page.waitForTimeout(50);
}

/** Keyboard move: lift, press the arrows (waiting for each announcement), drop. */
export async function keyboardMove(page: Page, role: string, company: string, steps: string[]) {
  await lift(page, role, company);
  for (const key of steps) {
    const before = await liveRegion(page).textContent();
    await page.keyboard.press(key);
    await expect(liveRegion(page)).not.toHaveText(before ?? "");
  }
  await page.keyboard.press("Space");
  await expect(liveRegion(page)).toContainText(`Przeniesiono kartę ${role}`);
}

/**
 * AI tests must never call a real, paid model. Locally (Playwright may reuse your `pnpm dev`)
 * that is an error; against a deployment (E2E_BASE_URL, e.g. production with Gemini) the AI
 * tests are skipped and everything else still runs. Returns the server's guest limit.
 */
export async function requireDemoModel(
  request: APIRequestContext,
): Promise<{ guestLimit: number }> {
  const status = (await (await request.get("/api/extract")).json()) as {
    mock: boolean;
    guestLimit: number;
  };
  if (!status.mock) {
    if (process.env.E2E_BASE_URL) {
      test.skip(true, "This deployment uses a real AI model: AI tests skipped.");
    } else {
      throw new Error(
        "The running dev server uses a real AI model. Stop it (pnpm e2e starts its own) " +
          "or start it with AI_PROVIDER=mock.",
      );
    }
  }
  return { guestLimit: status.guestLimit };
}
