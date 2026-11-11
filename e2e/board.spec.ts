import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { column, signInAsGuest } from "./helpers";

test.describe("board CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("create, edit and delete a card through the modal", async ({ page }) => {
    // Create: the form opens as a modal on top of the board, with its own URL.
    await page.getByRole("link", { name: "Dodaj ofertę" }).click();
    await expect(page).toHaveURL(/\/board\/new$/);
    const dialog = page.getByRole("dialog", { name: "Nowa oferta" });
    await expect(dialog).toBeVisible();
    // The sheet starts with the AI intake (paste an offer); this test fills the form by hand.
    await dialog.getByRole("button", { name: "Wpisz ręcznie" }).click();

    // Client-side validation (same Zod schema as the server).
    await dialog.getByRole("button", { name: "Dodaj do kartoteki" }).click();
    await expect(dialog.getByText("Podaj nazwę firmy.")).toBeVisible();
    await expect(dialog.getByLabel("Firma")).toHaveAttribute("aria-invalid", "true");

    await dialog.getByLabel("Firma").fill("Wisła Data");
    await dialog.getByLabel("Stanowisko").fill("Frontend Developer (Wisła)");
    await dialog.getByLabel("Etap").selectOption({ label: "Rozmowa" });
    await dialog.getByLabel("Widełki od (zł / mies.)").fill("18 000");
    await dialog.getByLabel("Widełki do (zł / mies.)").fill("15000");
    await dialog.getByRole("button", { name: "Dodaj do kartoteki" }).click();
    await expect(dialog.getByText("Górna granica nie może być niższa niż dolna.")).toBeVisible();

    await dialog.getByLabel("Widełki do (zł / mies.)").fill("23000");
    await dialog.getByLabel("Stack").fill("React, TypeScript");
    await dialog.getByRole("button", { name: "Dodaj do kartoteki" }).click();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/board$/);
    const interview = column(page, "Rozmowa");
    await expect(interview.getByRole("article").first()).toContainText(
      "Frontend Developer (Wisła)",
    );
    await expect(interview.getByRole("article").first()).toContainText("18-23k");

    // Edit: open the card, change the stage, it moves to the top of the new column.
    await interview.getByRole("link", { name: "Frontend Developer (Wisła)" }).click();
    await expect(page).toHaveURL(/\/board\/app\/[0-9a-f-]{36}$/);
    const sheet = page.getByRole("dialog", { name: "Teczka aplikacji" });
    await expect(sheet.getByLabel("Firma")).toHaveValue("Wisła Data");
    await expect(sheet.getByLabel("Stack")).toHaveValue("React, TypeScript");
    await sheet.getByLabel("Etap").selectOption({ label: "Oferta" });
    await sheet.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect(sheet).toBeHidden();
    await expect(column(page, "Oferta").getByRole("article")).toHaveCount(1);
    await expect(column(page, "Rozmowa").getByRole("article")).toHaveCount(1);

    // Deep link: the same URL opened directly is a full page, not a modal.
    await column(page, "Oferta").getByRole("link", { name: "Frontend Developer (Wisła)" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Teczka aplikacji" })).toBeVisible();
    await expect(page.getByLabel("Etap")).toHaveValue("offer");

    // Delete needs a confirmation.
    await page.getByRole("button", { name: "Usuń z kartoteki" }).click();
    await page.getByRole("button", { name: "Tak, usuń" }).click();
    await expect(page).toHaveURL(/\/board$/);
    await expect(column(page, "Oferta").getByRole("article")).toHaveCount(0);
    await expect(page.getByText("Frontend Developer (Wisła)")).toHaveCount(0);
  });

  test("Escape closes the modal and returns to the board", async ({ page }) => {
    await column(page, "Wysłane").getByRole("link", { name: "Mid Frontend Developer" }).click();
    await expect(page.getByRole("dialog", { name: "Teczka aplikacji" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/board$/);
  });

  test("a click beside the sheet closes it, the close button stays in view", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await column(page, "Wysłane").getByRole("link", { name: "Mid Frontend Developer" }).click();
    const dialog = page.getByRole("dialog", { name: "Teczka aplikacji" });
    await expect(dialog).toBeVisible();

    // Scroll to the end of the sheet: "Zamknij" must still be on screen.
    await dialog.evaluate((box) => box.scrollTo(0, box.scrollHeight));
    await expect(dialog.getByRole("button", { name: "Zamknij" })).toBeInViewport();

    // The empty strip beside the sheet (left edge of the dialog box).
    const box = await dialog.boundingBox();
    if (!box) throw new Error("no dialog box");
    await page.mouse.click(box.x + 8, box.y + box.height / 2);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/board$/);
  });

  test("cards of other users and invalid ids show not found", async ({ page }) => {
    // The page streams (Partial Prerendering), so the HTTP status is already 200 when the
    // lookup fails; Next.js then renders the not-found UI and a noindex robots tag.
    for (const path of ["/board/app/00000000-0000-4000-8000-000000000000", "/board/app/nope"]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: "Nie ma takiej teczki" }),
      ).toBeVisible();
      await expect(page.getByLabel("Firma")).toHaveCount(0);
    }
  });

  for (const theme of ["light", "dark"] as const) {
    test(`the open sheet has no WCAG A/AA violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.getByRole("link", { name: "Dodaj ofertę" }).click();
      const dialog = page.getByRole("dialog", { name: "Nowa oferta" });
      await dialog.getByRole("button", { name: "Wpisz ręcznie" }).click();
      await dialog.getByRole("button", { name: "Dodaj do kartoteki" }).click();
      await expect(dialog.getByText("Podaj nazwę firmy.")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test("the new-card form is empty again after a successful create", async ({ page }) => {
  await signInAsGuest(page);
  await page.getByRole("link", { name: "Dodaj ofertę" }).click();
  const dialog = page.getByRole("dialog", { name: "Nowa oferta" });
  await dialog.getByRole("button", { name: "Wpisz ręcznie" }).click();
  await dialog.getByLabel("Firma").fill("Odra Systems");
  await dialog.getByLabel("Stanowisko").fill("React Developer (Odra)");
  await dialog.getByRole("button", { name: "Dodaj do kartoteki" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("link", { name: "Dodaj ofertę" }).click();
  await expect(dialog.getByLabel("Treść ogłoszenia")).toHaveValue("");
  await dialog.getByRole("button", { name: "Wpisz ręcznie" }).click();
  await expect(dialog.getByLabel("Firma")).toHaveValue("");
});

test("only the board scrolls sideways, never the whole page", async ({ page }) => {
  // Regression: sr-only text in the folder tabs escaped the scroll area and made phones zoom
  // the whole page out.
  await signInAsGuest(page);
  const widths = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(widths[0]).toBeLessThanOrEqual(widths[1] ?? 0);
  const viewport = page.viewportSize();
  expect(widths[1]).toBe(viewport?.width);
});
