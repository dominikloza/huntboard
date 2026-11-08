import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { signInAsGuest } from "./helpers";

test.describe("authentication", () => {
  test("the board requires a session", async ({ page }) => {
    await page.goto("/board");
    await expect(page).toHaveURL(/\/login\?next=%2Fboard$/);
    await expect(page.getByRole("heading", { level: 1, name: "Wejdź do kartoteki" })).toBeVisible();
  });

  test("a guest gets a demo board and can sign out", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Wejdź jako gość" }).click();

    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByRole("heading", { level: 1, name: "Kartoteka" })).toBeVisible();
    await expect(page.getByText("Gość", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mid Frontend Developer" })).toBeVisible();
    await expect(page.getByRole("region", { name: /^Wysłane/ }).getByRole("article")).toHaveCount(
      3,
    );

    // Signed-in users skip the login page.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/board$/);

    await page.getByRole("button", { name: "Wyloguj" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/board");
    await expect(page).toHaveURL(/\/login/);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`the guest board has no WCAG A/AA violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/login");
      await page.getByRole("button", { name: "Wejdź jako gość" }).click();
      await expect(page.getByRole("heading", { name: "Mid Frontend Developer" })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("guest sign-in still works (progressive enhancement)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Wejdź jako gość" }).click();
    // Signed in: the proxy let us through to the board's static shell.
    // (The cards themselves stream in behind Suspense, which needs JavaScript.)
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByRole("heading", { level: 1, name: "Kartoteka" })).toBeVisible();
  });
});

test("a guest who is already signed in in another tab just continues to the board", async ({
  context,
}) => {
  // Regression: the login form open in an old tab called the anonymous sign-in again, which
  // Better Auth refuses ("Anonymous users cannot sign in again anonymously").
  const oldTab = await context.newPage();
  await oldTab.goto("/login");
  await expect(oldTab.getByRole("button", { name: "Wejdź jako gość" })).toBeVisible();

  const newTab = await context.newPage();
  await signInAsGuest(newTab);

  await oldTab.getByRole("button", { name: "Wejdź jako gość" }).click();
  await expect(oldTab).toHaveURL(/\/board$/);
  await expect(oldTab.getByText("Nie udało się otworzyć konta gościa")).toHaveCount(0);
});
