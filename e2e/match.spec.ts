import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { column, requireDemoModel, signInAsGuest } from "./helpers";

/*
 * Match score (computed in code) and AI comments (demo model, AI_PROVIDER=mock).
 * The guest profile: React, TypeScript, Next.js, Tailwind CSS, Jest; 2 years; min 16 000 zł; hybrid.
 */

const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

async function openCard(page: Page, role: string) {
  await page.getByRole("link", { name: role }).click();
  const sheet = page.getByRole("dialog", { name: "Teczka aplikacji" });
  await expect(sheet.getByRole("heading", { name: "Dopasowanie" })).toBeVisible();
  return sheet;
}

test.describe("match score and profile", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("the card shows the computed score and what it is made of", async ({ page }) => {
    // Mewa Fintech: React, Redux, Jest; hybrid; 16-21k; Mid.
    const card = column(page, "Zapisane").getByRole("article").filter({ hasText: "Mewa Fintech" });
    await expect(card.getByRole("img", { name: "Dopasowanie 82 na 100" })).toBeVisible();

    const sheet = await openCard(page, "Mid React Developer");
    await expect(sheet.getByRole("img", { name: "Dopasowanie 82 na 100" })).toBeVisible();
    await expect(sheet.getByText("Znasz 2 z 3. Brakuje: Redux.")).toBeVisible();
    await expect(sheet.getByText("Praca hybrydowa, tak jak chcesz.")).toBeVisible();
  });

  test("changing the profile recomputes every score", async ({ page }) => {
    await page.getByRole("link", { name: "Profil" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("link", { name: "Profil" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const skills = page.getByLabel("Twoje technologie");
    await expect(skills).toHaveValue("React, TypeScript, Next.js, Tailwind CSS, Jest");
    await skills.fill("React, TypeScript, Next.js, Tailwind CSS, Jest, Redux");
    await page.getByRole("button", { name: "Zapisz profil" }).click();
    await expect(page.getByRole("status")).toHaveText(
      /^Zapisano\. Przeliczyłem dopasowanie: \d+ kart(y|ę)?\. Wróć do kartoteki$/,
    );

    await page.getByRole("link", { name: "Wróć do kartoteki" }).click();
    const card = column(page, "Zapisane").getByRole("article").filter({ hasText: "Mewa Fintech" });
    await expect(card.getByRole("img", { name: "Dopasowanie 100 na 100" })).toBeVisible();

    await page.reload();
    await expect(card.getByRole("img", { name: "Dopasowanie 100 na 100" })).toBeVisible();
  });

  test("the profile form checks its fields", async ({ page }) => {
    // Client navigation: the form is hydrated when it appears (a fast bot could submit the
    // server-rendered form before React takes over).
    await page.getByRole("link", { name: "Profil" }).click();
    await page.getByLabel("Twoje technologie").fill(" , ");
    await page.getByLabel("Lata doświadczenia").fill("70");
    await page.getByRole("button", { name: "Zapisz profil" }).click();
    await expect(page.getByText("Wpisz co najmniej jedną technologię.")).toBeVisible();
    await expect(page.getByText("Wpisz liczbę lat od 0 do 60.")).toBeVisible();
  });
});

// These call the AI (demo model only): skipped against a deployment that uses a real model.
test.describe("AI comments", () => {
  test.beforeAll(async ({ request }) => {
    await requireDemoModel(request);
  });

  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("an AI comment streams in, is kept with the card and shown again later", async ({
    page,
  }) => {
    const sheet = await openCard(page, "Mid React Developer");
    await sheet.getByRole("button", { name: "Skomentuj z AI" }).click();

    const comment = sheet.getByRole("article", { name: "Komentarz AI" });
    await expect(comment).toContainText("Dobra oferta dla Ciebie");
    await expect(comment).toContainText("Następny krok: W CV pokaż projekt z testami e2e");
    await expect(comment.getByText(/\d{4}, \d{2}:\d{2}$/)).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Skomentuj jeszcze raz" })).toBeVisible();

    // Saved on the server (after the response): a full reload shows it without asking again.
    await expect(async () => {
      await page.reload();
      await expect(
        page.getByRole("article", { name: "Komentarz AI" }).getByText("Dobra oferta dla Ciebie"),
      ).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
  });

  test("roast mode writes in red pen and keeps the coach comment separate", async ({ page }) => {
    const sheet = await openCard(page, "Mid React Developer");
    await sheet.getByRole("button", { name: "Roast", exact: true }).click();
    await expect(sheet.getByRole("button", { name: "Roast", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await sheet.getByRole("button", { name: "Zrób roast" }).click();

    const roast = sheet.getByRole("article", { name: "Roast" });
    await expect(roast).toContainText("Szukają ninja");
    await expect(roast).toContainText("Owocowe czwartki to nie benefit, to dieta.");
    await expect(roast).toContainText("A na serio: Zapytaj o widełki przed zadaniem");

    await sheet.getByRole("button", { name: "Komentarz", exact: true }).click();
    await expect(sheet.getByRole("article", { name: "Roast" })).toHaveCount(0);
    await expect(sheet.getByRole("button", { name: "Skomentuj z AI" })).toBeVisible();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`match panel and profile have no WCAG A/AA violations in ${theme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const sheet = await openCard(page, "Mid React Developer");
      await sheet.getByRole("button", { name: "Roast", exact: true }).click();
      await sheet.getByRole("button", { name: "Zrób roast" }).click();
      await expect(sheet.getByRole("article", { name: "Roast" })).toContainText("ninja");
      await expect(sheet.getByRole("article", { name: "Roast" })).toHaveAttribute(
        "aria-busy",
        "false",
      );
      expect((await axe(page)).violations).toEqual([]);

      await page.goto("/profile");
      await expect(page.getByLabel("Twoje technologie")).toBeVisible();
      expect((await axe(page)).violations).toEqual([]);
    });
  }
});
