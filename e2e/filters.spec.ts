import { expect, test } from "@playwright/test";

import { cards, keyboardMove, signInAsGuest } from "./helpers";

test.describe("filters in the URL", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("search narrows the board, lives in the URL and survives a reload", async ({ page }) => {
    await page.getByLabel("Szukaj w kartotece").fill("graphql");
    await expect(page).toHaveURL(/\/board\?q=graphql$/);
    await expect(page.getByText("Pokazuję 1 z 7 teczek.")).toBeVisible();
    await expect(cards(page, "Wysłane")).toHaveText(["React Developer"]);
    await expect(cards(page, "Zapisane")).toHaveCount(0);
    await expect(page.getByRole("region", { name: /^Zapisane/ })).toContainText(
      "Brak pasujących kart.",
    );

    await page.reload();
    await expect(page.getByLabel("Szukaj w kartotece")).toHaveValue("graphql");
    await expect(cards(page, "Wysłane")).toHaveText(["React Developer"]);

    await page.getByRole("button", { name: "Wyczyść filtry" }).click();
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByText(/Pokazuję/)).toHaveCount(0);
  });

  test("a shared link opens the same filtered board", async ({ page }) => {
    await page.goto("/board?mode=office&min=15000");
    await expect(page.getByRole("button", { name: "Stacjonarnie" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByLabel("Widełki od")).toHaveValue("15000");
    await expect(cards(page, "Wysłane")).toHaveText(["React Developer"]);
    // 12-15k reaches a 15 000 minimum (the top of the range counts).
    await expect(cards(page, "Odrzucone")).toHaveText(["UI Developer"]);
    await expect(cards(page, "Zapisane")).toHaveCount(0); // remote and hybrid cards are hidden
  });

  test("no matches shows a way back", async ({ page }) => {
    await page.getByLabel("Szukaj w kartotece").fill("cobol");
    await expect(page.getByText("Nic nie pasuje do filtrów.")).toBeVisible();
    await page.getByRole("button", { name: "Pokaż wszystko" }).click();
    await expect(page.getByLabel("Szukaj w kartotece")).toHaveValue("");
    await expect(cards(page, "Wysłane")).toHaveCount(3);
  });

  test("dragging while some cards are hidden keeps the real order correct", async ({ page }) => {
    // Remote only: in "Wysłane" Szlak Logistics (office) is hidden between Kropla and Tartak.
    await page.getByRole("button", { name: "Zdalnie" }).click();
    await expect(cards(page, "Wysłane")).toHaveText([
      "Mid Frontend Developer",
      "Frontend Engineer",
    ]);

    await keyboardMove(page, "Frontend Engineer", "Tartak Studio", ["ArrowUp"]);
    await expect(cards(page, "Wysłane")).toHaveText([
      "Frontend Engineer",
      "Mid Frontend Developer",
    ]);
    await expect(page.getByText("Tablica zmieniła się")).toHaveCount(0);

    // Without the filter the hidden card is still in its place, after Kropla.
    await page.getByRole("button", { name: "Wyczyść filtry" }).click();
    await expect(cards(page, "Wysłane")).toHaveText([
      "Frontend Engineer",
      "Mid Frontend Developer",
      "React Developer",
    ]);
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(cards(page, "Wysłane")).toHaveText([
      "Frontend Engineer",
      "Mid Frontend Developer",
      "React Developer",
    ]);
  });
});
