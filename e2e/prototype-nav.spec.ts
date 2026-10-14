import { expect, test } from "@playwright/test";
import { overlapsWithNav } from "./helpers";

/** Alle routes met de lijst-knop; overleg- en B-schermen krijgen eerst state via een flow. */
const NAV_ROUTES = [
  "/",
  "/start",
  "/start/geblokkeerd",
  "/overleg",
  "/overleg/zelf",
  "/overleg/goedkeuring",
  "/voorbeeld",
  "/app",
  "/b",
  "/b/voorbeeld",
  "/b/reis",
  "/b/mail",
  "/b/structuur",
  "/probeer",
];

test.describe("prototype-knop rechtsboven", () => {
  for (const route of NAV_ROUTES) {
    test(`staat op ${route}: enkel het icoon, overlapt niets, menu met Herstart demo`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const nav = page.getByRole("button", { name: "Prototype-menu" });
      await expect(nav).toBeVisible();
      await expect(nav).toHaveText("");
      expect(await overlapsWithNav(page)).toEqual([]);
      await nav.click();
      await expect(page.getByRole("menu", { name: "Prototype-menu" }).getByRole("menuitem")).toHaveText([
        "Herstart demo",
        "Demo-instellingen",
      ]);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toHaveCount(0);
    });
  }

  test("Herstart demo wist gast-, demo- en app-state en opent de website; toetsenbord en Esc", async ({ page }) => {
    // State in alle drie: een flow (app), een demo-uitkomst en een proefomgeving (gast).
    await page.goto("/prototype");
    await page.getByRole("button", { name: /Start flow 3:/ }).click();
    await page.goto("/probeer");
    await page.getByRole("button", { name: /^Gebruik eerdere notities/ }).click();
    await expect(page.getByRole("log").getByText(/^Top\. Sleep ze hierheen/)).toBeVisible();

    const nav = page.getByRole("button", { name: "Prototype-menu" });
    await nav.focus();
    await page.keyboard.press("Enter");
    const item = page.getByRole("menuitem", { name: "Herstart demo" });
    await expect(item).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(nav).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Van overleg naar duidelijke acties." })).toBeVisible();
    const stored = await page.evaluate(() => ({
      guest: localStorage.getItem("toodoo-guest"),
      app: JSON.parse(localStorage.getItem("too-doo-onboarding") ?? "null")?.state?.flow ?? null,
    }));
    expect(stored).toEqual({ guest: null, app: null });
    // Variant B blijft bereikbaar via de URL.
    await page.goto("/prototype");
    await expect(page.getByRole("heading", { name: "Variant B · Classic Onboarding" })).toBeVisible();
  });

  test("overlapt niets op de schermen met state (acties, overzicht, overleg)", async ({ page }) => {
    await page.goto("/prototype");
    await page.getByRole("button", { name: /Start flow 3:/ }).click();
    await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    await page.getByRole("button", { name: "Volg deze 2 overleggen op" }).click();
    await page.getByRole("button", { name: "Haal de acties eruit" }).click();
    await page.getByRole("button", { name: "Bevestig 4 punten" }).waitFor();
    expect(await overlapsWithNav(page), "/b/acties").toEqual([]);
    await page.getByRole("button", { name: "Bevestig 4 punten" }).click();
    await page.getByRole("heading", { name: "Dit volgt too-doo nu voor je op" }).waitFor();
    expect(await overlapsWithNav(page), "/b/overzicht").toEqual([]);
    await page.getByRole("link", { name: "Bekijk de agenda" }).click();
    await page.getByRole("heading", { level: 1, name: "Productieoverleg" }).waitFor();
    expect(await overlapsWithNav(page), "/app/overleg").toEqual([]);
    await page.goto("/acties");
    expect(await overlapsWithNav(page), "/acties").toEqual([]);
  });

  test("ontbreekt op /prototype", async ({ page }) => {
    await page.goto("/prototype");
    await expect(page.getByRole("heading", { name: "Variant B · Classic Onboarding" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prototype-menu" })).toHaveCount(0);
    await page.getByRole("link", { name: "Ga terug naar website" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Van overleg naar duidelijke acties." })).toBeVisible();
  });
});
