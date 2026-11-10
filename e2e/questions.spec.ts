import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { requireDemoModel, signInAsGuest } from "./helpers";

/* Interview prep in the card sheet (demo model, AI_PROVIDER=mock: DEMO_QUESTIONS). */

async function openPrep(page: Page) {
  await page.getByRole("link", { name: "Mid React Developer" }).click();
  const sheet = page.getByRole("dialog", { name: "Teczka aplikacji" });
  const prep = sheet.getByRole("region", { name: "Przygotowanie do rozmowy" });
  await expect(prep).toBeVisible();
  return prep;
}

test.describe("interview questions", () => {
  test.beforeAll(async ({ request }) => {
    await requireDemoModel(request);
  });

  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("streams six flashcards, hides the hints and keeps the set with the card", async ({
    page,
  }) => {
    const prep = await openPrep(page);
    await prep.getByRole("button", { name: "Przygotuj pytania" }).click();

    const cards = prep.getByRole("list", { name: "Pytania" }).getByRole("listitem");
    await expect(cards).toHaveCount(6);
    await expect(prep.getByText("Zapytaj ich")).toBeVisible();
    await expect(prep.getByRole("list", { name: "Pytania" })).toHaveAttribute("aria-busy", "false");

    const hint = prep.getByText(/Koszt obliczenia vs koszt porównania/);
    await expect(hint).toBeHidden();
    await prep.getByText("Kiedy użyjesz useMemo").click();
    await expect(hint).toBeVisible();

    // Saved on the server (after the response): a full reload shows it without asking again.
    await expect(async () => {
      await page.reload();
      await expect(page.getByText("Opowiedz o code review")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Nowy zestaw pytań" })).toBeVisible();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`has no WCAG A/AA violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const prep = await openPrep(page);
      await prep.getByRole("button", { name: "Przygotuj pytania" }).click();
      await expect(prep.getByRole("list", { name: "Pytania" })).toHaveAttribute(
        "aria-busy",
        "false",
      );
      await prep.getByText("Kiedy użyjesz useMemo").click();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
