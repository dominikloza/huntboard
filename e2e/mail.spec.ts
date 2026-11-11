import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

import { cards, requireDemoModel, signInAsGuest } from "./helpers";

/*
 * Mail sync (ADR 017): the Gmail script posts e-mails with the user's token. Known senders are
 * read by rules, the rest by the demo model (AI_PROVIDER=mock: keywords, sender name = company).
 */

const now = Date.now();
const jjit = {
  messageId: `jjit-${now}`,
  from: "justjoin.it <no-reply@justjoin.it>",
  subject: "You applied for Staff Software Engineer",
  date: new Date(now - 2 * 3600_000).toISOString(),
  body: "Your application has been sent! You've just applied for Staff Software Engineer Kraków on Just Join IT to iTeamly. We keep our fingers crossed for you!",
};
const rejection = {
  messageId: `szlak-${now}`,
  from: "Szlak Logistics <hr@szlak-logistics.pl>",
  subject: "Twoja aplikacja: React Developer",
  date: new Date(now - 3600_000).toISOString(),
  body: "Dziękujemy za zainteresowanie. Niestety tym razem nie przechodzisz do kolejnego etapu.",
};

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

test.describe("mail sync", () => {
  test.beforeAll(async ({ request }) => {
    await requireDemoModel(request);
  });

  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("refuses batches without a valid token", async ({ request }) => {
    expect((await post(request, "hb_mail_not-a-real-token", [jjit])).status()).toBe(401);
    const noHeader = await request.post("/api/mail/messages", { data: { messages: [] } });
    expect(noHeader.status()).toBe(401);
  });

  test("a confirmation creates a card, a rejection moves one, and both can be undone", async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, "the board columns are checked on desktop");
    const token = await connectMail(page);

    const response = await post(request, token, [rejection, jjit]);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ received: 2, created: 1, moved: 1 });

    // The same e-mails again (the script overlaps runs): nothing happens twice.
    const again = await post(request, token, [rejection, jjit]);
    expect(await again.json()).toMatchObject({ skipped: 2, created: 0, moved: 0 });

    await page.goto("/board");
    await expect(cards(page, "Wysłane")).toContainText(["Staff Software Engineer"]);
    await expect(cards(page, "Odrzucone")).toContainText(["React Developer"]);

    await page.getByText("Z poczty").click();
    await expect(page.getByText("Nowa teczka: Staff Software Engineer, iTeamly")).toBeVisible();
    const moved = page.getByRole("listitem").filter({ hasText: "Wysłane → Odrzucone" });
    await moved.getByRole("button", { name: "Cofnij" }).click();
    await expect(cards(page, "Wysłane")).toContainText(["React Developer"]);
    await expect(page.getByText(/Cofnięto: React Developer/)).toBeVisible();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`settings and feed have no WCAG A/AA violations in ${theme} mode`, async ({
      page,
      request,
    }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      const token = await connectMail(page);
      await expect(page.getByText(/Jak podłączyć skrypt/)).toBeVisible();
      let results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);

      await post(request, token, [{ ...jjit, messageId: `axe-${theme}-${now}` }]);
      await page.goto("/board");
      await page.getByText("Z poczty").click();
      await expect(page.getByText(/Nowa teczka/)).toBeVisible();
      results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
