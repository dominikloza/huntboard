import { readFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { cards, requireDemoModel, signInAsGuest } from "./helpers";

/*
 * Runs against the demo model (AI_PROVIDER=mock, set by playwright.config.ts): it streams a fixed
 * extraction of e2e/fixtures/offer.txt in small chunks, like a real model. Markers in the text
 * ("[demo:slow]", "[demo:fail]") make it slow or fail.
 */
const OFFER = readFileSync(path.join(__dirname, "fixtures/offer.txt"), "utf8");

async function openIntake(page: Page) {
  await page.getByRole("link", { name: "Dodaj ofertę" }).click();
  const dialog = page.getByRole("dialog", { name: "Nowa oferta" });
  await expect(dialog.getByLabel("Treść ogłoszenia")).toBeVisible();
  return dialog;
}

async function paste(page: Page, text: string) {
  const dialog = await openIntake(page);
  await dialog.getByLabel("Treść ogłoszenia").fill(text);
  await dialog.getByRole("button", { name: "Wypełnij z AI" }).click();
  return dialog;
}

const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

let guestLimit = 3;
test.beforeAll(async ({ request }) => {
  ({ guestLimit } = await requireDemoModel(request));
});

test.describe("AI offer intake", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("paste, watch the fields fill in, correct one, save", async ({ page }) => {
    const dialog = await paste(page, OFFER);

    // While streaming: read-only fields, a way to stop.
    await expect(dialog.getByRole("status")).toHaveText(/AI czyta ogłoszenie/);
    await expect(dialog.getByRole("button", { name: "Zatrzymaj" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Dodaj do kartoteki" })).toBeDisabled();

    // Done: every field from the offer, and the warnings.
    await expect(dialog.getByRole("status")).toHaveText(/Gotowe\. Sprawdź pola/);
    await expect(dialog.getByLabel("Firma")).toHaveValue("Kreska Software");
    await expect(dialog.getByLabel("Stanowisko")).toHaveValue("Frontend Developer (React)");
    await expect(dialog.getByLabel("Poziom")).toHaveValue("Mid");
    await expect(dialog.getByLabel("Tryb pracy")).toHaveValue("hybrid");
    await expect(dialog.getByLabel("Miasto")).toHaveValue("Wrocław");
    await expect(dialog.getByLabel("Widełki od (zł / mies.)")).toHaveValue("16000");
    await expect(dialog.getByLabel("Widełki do (zł / mies.)")).toHaveValue("22000");
    await expect(dialog.getByLabel("Stack")).toHaveValue(/^React, TypeScript, Next\.js/);
    await expect(
      dialog.getByRole("region", { name: "Na co uważać" }).getByRole("listitem"),
    ).toHaveText(["Zadanie rekrutacyjne na 3 dni bez wynagrodzenia."]);

    // Human in the loop: nothing is saved until the user edits and confirms.
    await dialog.getByLabel("Stanowisko").fill("Frontend Developer (React, panel planisty)");
    await dialog.getByRole("button", { name: "Dodaj do kartoteki" }).click();
    await expect(dialog).toBeHidden();
    await expect(cards(page, "Zapisane").first()).toHaveText(
      "Frontend Developer (React, panel planisty)",
    );

    // The warnings stay with the card.
    await page.getByRole("link", { name: "Frontend Developer (React, panel planisty)" }).click();
    const sheet = page.getByRole("dialog", { name: "Teczka aplikacji" });
    await expect(sheet.getByRole("region", { name: "Na co uważać" })).toContainText(
      "Zadanie rekrutacyjne na 3 dni bez wynagrodzenia.",
    );
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // The next visit starts from a clean paste box.
    const again = await openIntake(page);
    await expect(again.getByLabel("Treść ogłoszenia")).toHaveValue("");
  });

  test("stop keeps what arrived and unlocks the form", async ({ page }) => {
    const dialog = await paste(page, `${OFFER}\n[demo:slow]`);
    await expect(dialog.getByLabel("Firma")).toHaveValue(/Kreska/);
    await dialog.getByRole("button", { name: "Zatrzymaj" }).click();

    await expect(dialog.getByRole("status")).toHaveText("Zatrzymano. Uzupełnij resztę ręcznie.");
    await expect(dialog.getByLabel("Firma")).toHaveValue(/Kreska/);
    await expect(dialog.getByLabel("Stack")).toHaveValue("");
    await dialog.getByLabel("Stack").fill("React");
    await expect(dialog.getByRole("button", { name: "Dodaj do kartoteki" })).toBeEnabled();
  });

  test("a provider failure says so and offers a retry", async ({ page }) => {
    const dialog = await paste(page, `${OFFER}\n[demo:fail]`);
    await expect(dialog.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
      /AI chwilowo nie odpowiada/,
    );
    await expect(dialog.getByRole("button", { name: "Spróbuj ponownie" })).toBeVisible();
    // The manual form is right there.
    await expect(dialog.getByLabel("Firma")).toBeEditable();
  });

  test("too short text is caught before calling the AI", async ({ page }) => {
    const dialog = await paste(page, "Frontend Developer, React");
    await expect(dialog.getByText("Wklej całe ogłoszenie (min. 80 znaków).")).toBeVisible();
    await expect(dialog.getByLabel("Treść ogłoszenia")).toHaveAttribute("aria-invalid", "true");
  });

  test("back to the offer keeps the pasted text", async ({ page }) => {
    const dialog = await paste(page, OFFER);
    await expect(dialog.getByRole("status")).toHaveText(/Gotowe/);
    await dialog.getByRole("button", { name: "Wróć do ogłoszenia" }).click();
    await expect(dialog.getByLabel("Treść ogłoszenia")).toHaveValue(OFFER);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`intake has no WCAG A/AA violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const dialog = await openIntake(page);
      expect((await axe(page)).violations).toEqual([]);

      await dialog.getByLabel("Treść ogłoszenia").fill(OFFER);
      await dialog.getByRole("button", { name: "Wypełnij z AI" }).click();
      await expect(dialog.getByRole("status")).toHaveText(/Gotowe/);
      expect((await axe(page)).violations).toEqual([]);
    });
  }
});

test.describe("AI limits", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("a guest gets a few extractions an hour, then a clear message", async ({ page }) => {
    for (let i = 0; i < guestLimit; i++) {
      const response = await page.request.post("/api/extract", { data: { offer: OFFER } });
      expect(response.status()).toBe(200);
      await response.body(); // read the whole stream, like the browser does
    }

    const blocked = await page.request.post("/api/extract", { data: { offer: OFFER } });
    expect(blocked.status()).toBe(429);
    expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(3500);

    const dialog = await paste(page, OFFER);
    await expect(dialog.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
      new RegExp(
        `^Limit: ${guestLimit} wypełnień z AI na godzinę na koncie gościa .* Następne za 60 min\\.`,
      ),
    );
    await expect(dialog.getByLabel("Firma")).toBeEditable();
  });

  test("parallel requests cannot sneak past the limit", async ({ page }) => {
    // Without the per-user lock every request would see "0 used" and pass.
    const responses = await Promise.all(
      Array.from({ length: guestLimit * 2 }, () =>
        page.request.post("/api/extract", { data: { offer: OFFER } }),
      ),
    );
    const statuses = responses.map((r) => r.status()).sort();
    expect(statuses).toEqual([
      ...Array<number>(guestLimit).fill(200),
      ...Array<number>(guestLimit).fill(429),
    ]);
  });

  test("failed calls do not use up the limit", async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      const response = await page.request.post("/api/extract", {
        data: { offer: `${OFFER}\n[demo:fail]` },
      });
      expect(response.status()).toBe(502);
    }
    const response = await page.request.post("/api/extract", { data: { offer: OFFER } });
    expect(response.status()).toBe(200);
  });
});

test("the API refuses requests without a session", async ({ request }) => {
  const response = await request.post("/api/extract", { data: { offer: OFFER } });
  expect(response.status()).toBe(401);
});
