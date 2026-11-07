import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { column, signInAsGuest } from "./helpers";

test.describe("notes", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
    await column(page, "Wysłane").getByRole("link", { name: "Mid Frontend Developer" }).click();
    await expect(page.getByRole("dialog", { name: "Teczka aplikacji" })).toBeVisible();
  });

  test("add, keep and delete a note", async ({ page }) => {
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Brak notatek.")).toBeVisible();

    await sheet.getByRole("button", { name: "Dodaj notatkę" }).click();
    await expect(
      sheet.getByRole("alert").filter({ hasText: "Wpisz treść notatki." }),
    ).toBeVisible();

    await sheet.getByLabel("Nowa notatka").fill("Rozmowa z HR.\nOddzwonią w piątek.");
    await sheet.getByLabel("Nowa notatka").press("Control+Enter");
    const list = sheet.getByRole("list", { name: "Lista notatek" });
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(list).toContainText("Oddzwonią w piątek.");
    await expect(list).toContainText(/\d{1,2} \p{L}+ \d{4}, \d{2}:\d{2}/u);
    await expect(sheet.getByLabel("Nowa notatka")).toHaveValue("");

    // Still in the modal (no jump to the full page), and kept when the card is reopened.
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await column(page, "Wysłane").getByRole("link", { name: "Mid Frontend Developer" }).click();
    await expect(
      page.getByRole("dialog").getByRole("list", { name: "Lista notatek" }),
    ).toContainText("Oddzwonią w piątek.");

    // Saved on the server: visible on the full page after a reload.
    await page.reload();
    const pageList = page.getByRole("list", { name: "Lista notatek" });
    await expect(pageList).toContainText("Rozmowa z HR.");

    // The note disappears at once (optimistic); reload only after the server confirmed.
    const deleted = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.request().headers()["next-action"] !== undefined,
    );
    await page.getByRole("button", { name: /^Usuń notatkę z / }).click();
    await expect(page.getByText("Brak notatek.")).toBeVisible();
    await deleted;
    await page.reload();
    await expect(page.getByText("Brak notatek.")).toBeVisible();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`the sheet with notes has no WCAG A/AA violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const sheet = page.getByRole("dialog");
      await sheet.getByLabel("Nowa notatka").fill("Notatka do sprawdzenia kontrastu.");
      await sheet.getByRole("button", { name: "Dodaj notatkę" }).click();
      await expect(sheet.getByRole("list", { name: "Lista notatek" })).toBeVisible();
      await expect(sheet.getByText("Zapisuję...")).toBeHidden();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
