import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
