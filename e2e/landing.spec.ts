import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`has no WCAG A/AA violations in ${theme} mode`, async ({ page }) => {
      // Reduced motion shows every scroll animation in its final state.
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      // Render the sections deferred with content-visibility before checking them.
      await page
        .getByRole("heading", { name: "Pierwsza teczka czeka na biurku." })
        .scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("explains the flow and shows the score weights from the code", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Kartoteka/ })).toBeVisible();
    for (const name of [
      "Jedna teczka, pięć przystanków.",
      "Aplikujesz. Teczka zakłada się sama.",
      "Link albo ogłoszenie. Pola wypełniają się same.",
      "Kod liczy wynik. AI go komentuje, czasem czerwonym długopisem.",
      "Zaproszenie przyszło. Fiszki już są.",
      "Widzisz, gdzie odpadasz.",
      "Prowadzisz teczkę do końca.",
    ]) {
      await expect(page.getByRole("heading", { name })).toBeAttached();
    }
    const weights = page.getByRole("figure", { name: /Z czego jest wynik/ }).getByRole("listitem");
    await expect(weights).toHaveCount(4);
    await expect(weights.first()).toContainText("Stack");
    await expect(weights.first()).toContainText("55");
  });
});
