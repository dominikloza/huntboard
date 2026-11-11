import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

import { column, requireDemoModel, signInAsGuest } from "./helpers";

/*
 * "Uzupełnij z ogłoszenia" (ADR 018). A card created from an e-mail knows only the company and
 * the title; the confirmation's link to the offer is kept, and one click reads the offer into
 * the empty fields. AI_PROVIDER=mock: the demo offer page and the demo extraction, no network.
 */

const DEMO_OFFER_URL = "https://justjoin.it/job-offer/huntboard-demo-frontend-engineer";

const confirmation = (id: string) => ({
  messageId: `fill-${id}-${Date.now()}`,
  from: "justjoin.it <no-reply@justjoin.it>",
  subject: "You applied for Frontend Engineer",
  date: new Date(Date.now() - 3600_000).toISOString(),
  body: `Your application has been sent!
You've just applied for *Frontend Engineer* on Just Join IT to *Huntboard Demo*.
[image: aplikacja] <${DEMO_OFFER_URL}?utm_source=mail>
Check similar offers
<https://justjoin.it/job-offer/kreska-senior-backend-developer-gdansk>`,
});

async function connectMail(page: Page): Promise<string> {
  await page.goto("/profile");
  const mail = page.getByRole("region", { name: "Poczta" });
  await mail.getByRole("button", { name: "Podłącz Gmaila" }).click();
  const token = mail.getByLabel(/Twój token/);
  await expect(token).toHaveValue(/^hb_mail_/);
  return token.inputValue();
}

const post = (request: APIRequestContext, token: string, messages: unknown[]) =>
  request.post("/api/mail/messages", {
    headers: { Authorization: `Bearer ${token}` },
    data: { messages },
  });

async function cardFromMail(page: Page, request: APIRequestContext, id: string) {
  const token = await connectMail(page);
  const response = await post(request, token, [confirmation(id)]);
  // Cleaned of Gmail's *bold* and image tags, linked to the offer, not to the similar one.
  expect(await response.json()).toMatchObject({ created: 1, linked: 1 });
  await page.goto("/board");
  const card = column(page, "Wysłane").getByRole("article").filter({ hasText: "Huntboard Demo" });
  await expect(card).toContainText("Frontend Engineer");
  return card;
}

test.describe("fill a card from its offer", () => {
  test.beforeAll(async ({ request }) => {
    await requireDemoModel(request);
  });

  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("the e-mail's link fills the empty fields, the card keeps its own", async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, "the board columns are checked on desktop");
    const card = await cardFromMail(page, request, "link");
    await expect(card).toContainText("Brak stacku - do uzupełnienia");

    await card.getByRole("link", { name: "Frontend Engineer" }).click();
    const dialog = page.getByRole("dialog", { name: "Teczka aplikacji" });
    const source = dialog.getByLabel("Link albo treść ogłoszenia");
    await expect(source).toHaveValue(DEMO_OFFER_URL);
    await dialog.getByRole("button", { name: "Uzupełnij z AI" }).click();
    await expect(dialog.getByText(/Gotowe. Uzupełnione pola są podświetlone/)).toBeVisible();

    // Filled from the offer: stack, level, salary. Kept from the e-mail: company and title.
    await expect(dialog.getByLabel("Stack")).toHaveValue(/React, TypeScript/);
    await expect(dialog.getByLabel("Poziom")).toHaveValue("Mid");
    await expect(dialog.getByLabel("Widełki od (zł / mies.)")).toHaveValue("16000");
    await expect(dialog.getByLabel("Firma")).toHaveValue("Huntboard Demo");
    await expect(dialog.getByLabel("Stanowisko")).toHaveValue("Frontend Engineer");
    await expect(
      dialog.getByText("Zadanie rekrutacyjne na 3 dni bez wynagrodzenia."),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(card).not.toContainText("do uzupełnienia");
    await expect(card).toContainText("16-22k");

    // Reopened: the offer is stored, so the panel is folded away and prep is offered.
    await card.getByRole("link", { name: "Frontend Engineer" }).click();
    await expect(dialog.getByRole("button", { name: "Przygotuj pytania" })).toBeVisible();
    await expect(dialog.getByLabel("Link albo treść ogłoszenia")).toBeHidden();
  });

  test("a link from an unknown site is refused before anything is fetched", async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, "the board columns are checked on desktop");
    const card = await cardFromMail(page, request, "refuse");
    await card.getByRole("link", { name: "Frontend Engineer" }).click();
    const dialog = page.getByRole("dialog", { name: "Teczka aplikacji" });
    await dialog.getByLabel("Link albo treść ogłoszenia").fill("http://169.254.169.254/latest");
    await dialog.getByRole("button", { name: "Uzupełnij z AI" }).click();
    await expect(dialog.getByText(/Pobieram ogłoszenia tylko z: JustJoin.it/)).toBeVisible();
    await expect(dialog.getByLabel("Stack")).toHaveValue("");
  });

  for (const theme of ["light", "dark"] as const) {
    test(`the fill panel has no WCAG A/AA violations in ${theme} mode`, async ({
      page,
      request,
      isMobile,
    }) => {
      test.skip(isMobile, "the board columns are checked on desktop");
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const card = await cardFromMail(page, request, `axe-${theme}`);
      await card.getByRole("link", { name: "Frontend Engineer" }).click();
      await expect(page.getByLabel("Link albo treść ogłoszenia")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
