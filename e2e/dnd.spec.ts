import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  alert,
  cards,
  column,
  handle,
  keyboardMove,
  lift,
  liveRegion,
  signInAsGuest,
} from "./helpers";

test.describe("drag & drop", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsGuest(page);
  });

  test("keyboard: move a card to another column and reorder it, announced and saved", async ({
    page,
  }) => {
    await lift(page, "Mid Frontend Developer", "Kropla Software");

    await page.keyboard.press("ArrowRight");
    await expect(liveRegion(page)).toContainText("kolumna Rozmowa, pozycja 1 z 2");
    await page.keyboard.press("ArrowDown");
    await expect(liveRegion(page)).toContainText("kolumna Rozmowa, pozycja 2 z 2");
    await page.keyboard.press("Space");
    await expect(liveRegion(page)).toContainText("Przeniesiono kartę Mid Frontend Developer");

    await expect(cards(page, "Rozmowa")).toHaveText([
      "Frontend Developer (AI)",
      "Mid Frontend Developer",
    ]);
    await expect(cards(page, "Wysłane")).toHaveText(["React Developer", "Frontend Engineer"]);

    // Saved on the server, in the same order.
    await expect(page.getByText("Tablica zmieniła się")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(cards(page, "Rozmowa")).toHaveText([
      "Frontend Developer (AI)",
      "Mid Frontend Developer",
    ]);
  });

  test("keyboard: Escape cancels the move", async ({ page }) => {
    await lift(page, "UI Developer", "Wiór Games");
    await page.keyboard.press("ArrowLeft");
    await expect(liveRegion(page)).toContainText("kolumna Oferta");
    await page.keyboard.press("Escape");
    await expect(liveRegion(page)).toContainText("Anulowano");
    await expect(cards(page, "Odrzucone")).toHaveText(["UI Developer"]);
    await expect(cards(page, "Oferta")).toHaveCount(0);
  });

  test("mouse: drag a card into an empty folder; a click still opens it", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the target folder is off-screen on a phone; keyboard tests cover moves");
    const card = column(page, "Zapisane").getByRole("article").first();
    const target = column(page, "Oferta");
    const from = await card.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error("board not rendered");

    await page.mouse.move(from.x + from.width / 2, from.y + 30);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + 40, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 15 });
    await page.mouse.up();

    await expect(cards(page, "Oferta")).toHaveText(["Frontend Developer"]);
    await expect(cards(page, "Zapisane")).toHaveText(["Mid React Developer"]);

    await column(page, "Oferta").getByRole("link", { name: "Frontend Developer" }).click();
    await expect(page.getByRole("dialog", { name: "Teczka aplikacji" })).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Etap")).toHaveValue("offer");
  });

  test("mouse: after a drop the card never flashes back in its old folder", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "mouse drag across folders needs the desktop layout");
    const card = column(page, "Zapisane").getByRole("article").first();
    const from = await card.boundingBox();
    const to = await column(page, "Rozmowa").boundingBox();
    if (!from || !to) throw new Error("board not rendered");

    await page.mouse.move(from.x + 100, from.y + 30);
    await page.mouse.down();
    await page.mouse.move(from.x + 120, from.y + 40, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 200, { steps: 20 });
    await expect(cards(page, "Zapisane")).toHaveText(["Mid React Developer"]);

    // Record what the old folder shows on every DOM change and every frame after the drop.
    await page.evaluate(() => {
      const folder = [...document.querySelectorAll("section")].find((s) =>
        s.querySelector("h2")?.textContent?.startsWith("Zapisane"),
      );
      const seen: string[] = [];
      (window as unknown as { seen: string[] }).seen = seen;
      const snap = () =>
        seen.push([...(folder?.querySelectorAll("h3") ?? [])].map((h) => h.textContent).join("|"));
      new MutationObserver(snap).observe(document.body, { subtree: true, childList: true });
      const loop = () => {
        snap();
        if (seen.length < 300) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await page.mouse.up();
    await expect(cards(page, "Rozmowa")).toContainText(["Frontend Developer"]);
    await page.waitForTimeout(500);

    const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
    expect(new Set(seen)).toEqual(new Set(["Mid React Developer"]));
  });

  test("a failed save puts the card back and says so", async ({ page }) => {
    // Simulate the server failing for every Server Action call from now on.
    await page.route("**/board", (route) =>
      route.request().method() === "POST" && route.request().headers()["next-action"]
        ? route.fulfill({ status: 500, body: "" })
        : route.continue(),
    );

    await keyboardMove(page, "Mid Frontend Developer", "Kropla Software", ["ArrowRight"]);

    await expect(alert(page, "Karta wróciła na swoje miejsce")).toBeVisible();
    await expect(cards(page, "Wysłane").first()).toHaveText("Mid Frontend Developer");
    await expect(cards(page, "Rozmowa")).toHaveText(["Frontend Developer (AI)"]);
  });

  test("a move based on an outdated board is rejected and the board refreshes", async ({
    page,
    context,
    browser,
  }) => {
    // A second window of the same user (same session cookie), opened before the first one
    // moves the card. Separate browser context, so both windows stay "visible".
    const other = await browser.newContext({ storageState: await context.storageState() });
    const stale = await other.newPage();
    await stale.goto("/board");
    await expect(handle(stale, "Mid Frontend Developer", "Kropla Software")).toBeVisible();

    await keyboardMove(page, "Mid Frontend Developer", "Kropla Software", ["ArrowRight"]);
    await expect(cards(page, "Rozmowa").first()).toHaveText("Mid Frontend Developer");
    await page.waitForLoadState("networkidle");

    // The stale tab still shows the card in "Wysłane" and tries to move it to "Zapisane".
    await keyboardMove(stale, "Mid Frontend Developer", "Kropla Software", ["ArrowLeft"]);

    await expect(alert(stale, "Tablica zmieniła się w międzyczasie")).toBeVisible();
    await expect(cards(stale, "Rozmowa").first()).toHaveText("Mid Frontend Developer");
    await expect(cards(stale, "Zapisane")).not.toContainText(["Mid Frontend Developer"]);
    await other.close();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`the board with drag handles has no WCAG A/AA violations in ${theme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.reload();
      await expect(handle(page, "Mid Frontend Developer", "Kropla Software")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
