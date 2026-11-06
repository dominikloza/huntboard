import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("styleguide", () => {
  test("renders the board folders with demo applications", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByRole("heading", { level: 1, name: "Styleguide" })).toBeVisible();
    for (const column of ["Zapisane", "Wysłane", "Rozmowa", "Oferta", "Odrzucone"]) {
      await expect(page.getByRole("region", { name: new RegExp(`^${column}`) })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Mid Frontend Developer" })).toBeVisible();
  });

  test("switches to dark mode and remembers it", async ({ page }) => {
    await page.goto("/styleguide");
    await page.getByRole("button", { name: "Ciemny" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Ciemny" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  for (const theme of ["light", "dark"] as const) {
    test(`has no WCAG A/AA violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/styleguide");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test("home page links to the styleguide", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Zobacz styleguide" }).click();
  await expect(page).toHaveURL(/\/styleguide$/);
});
