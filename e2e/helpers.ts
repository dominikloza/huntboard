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
