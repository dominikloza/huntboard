import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { keyboardMove, signInAsGuest } from "./helpers";

/* Statistics from the stage history (the guest account comes with a backdated history). */

const figure = (page: Page, label: string) =>
  page
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("..");

test.describe("statistics", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("shows the guest's funnel, answer time and the application waiting too long", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Statystyki" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Statystyki" })).toBeVisible();

    await expect(figure(page, "Wysłane")).toContainText("5");
    await expect(figure(page, "Rozmowy")).toContainText("40% wysłanych");
    await expect(figure(page, "Odpowiedź po")).toContainText("8,5 dni");

    const waiting = page.getByRole("region", { name: "Czekają na odpowiedź" });
    await expect(waiting.getByRole("listitem")).toHaveCount(1);
    await expect(waiting).toContainText("Szlak Logistics");
    await expect(page.getByRole("table", { name: /Wysłane aplikacje/ })).toBeAttached();
  });

  test("moving a card to another stage updates the funnel", async ({ page }) => {
    await page.getByRole("link", { name: "Frontend Developer" }).first().click();
    const sheet = page.getByRole("dialog", { name: "Teczka aplikacji" });
    await sheet.getByLabel("Etap").selectOption("applied");
    await sheet.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect(sheet).toBeHidden();

    await page.goto("/stats");
    await expect(figure(page, "Wysłane")).toContainText("6");
  });

  test("a drag & drop move between stages counts as well", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard moves are covered on desktop");
    // Kropla Software: applied -> interview.
    await keyboardMove(page, "Mid Frontend Developer", "Kropla Software", ["ArrowRight"]);
    await page.waitForLoadState("networkidle");

    await page.goto("/stats");
    await expect(figure(page, "Rozmowy")).toContainText("3");
    await expect(figure(page, "Rozmowy")).toContainText("60% wysłanych");
  });

  for (const theme of ["light", "dark"] as const) {
    test(`has no WCAG A/AA violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/stats");
      await expect(page.getByRole("region", { name: "Lejek" })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
