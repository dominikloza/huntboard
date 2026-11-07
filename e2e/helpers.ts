import { expect, type Page } from "@playwright/test";

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
