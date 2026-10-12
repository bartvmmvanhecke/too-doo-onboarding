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
];

test.describe("flowkeuze-knop met de twee varianten", () => {
  for (const route of NAV_ROUTES) {
    test(`staat op ${route}, overlapt niets en opent Variant B`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const nav = page.getByRole("button", { name: /^Flowkeuze/ });
      await expect(nav).toBeVisible();
      expect(await overlapsWithNav(page)).toEqual([]);
      await nav.click();
      await page.getByRole("menuitemradio", { name: /Onboarding Flow Variant B - Classic Onboarding/ }).click();
      await expect(page).toHaveURL(/\/prototype$/);
    });
  }

  test("menu: twee items, vinkje, toetsenbord en Esc", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("button", { name: /^Flowkeuze/ });
    await expect(nav).toHaveText("A");
    await nav.click();
    const menu = page.getByRole("menu", { name: "Flowkeuze" });
    const items = menu.getByRole("menuitemradio");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("Onboarding Flow Variant A - Lazy Registration");
    await expect(items.nth(0)).toContainText("Proberen zonder account, account bij bewaren");
    await expect(items.nth(1)).toContainText("Onboarding Flow Variant B - Classic Onboarding");
    await expect(items.nth(1)).toContainText("Account eerst, dan eerste overleg");
    await expect(items.nth(0)).toHaveAttribute("aria-checked", "true");
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(nav).toBeFocused();

    // Variant B kiezen en een flow starten: het label volgt.
    await nav.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/prototype$/);
    await page.getByRole("button", { name: /Start flow 3:/ }).click();
    await expect(page.getByRole("button", { name: /^Flowkeuze/ })).toHaveText("B · Flow 3");
    await page.getByRole("button", { name: /^Flowkeuze/ }).click();
    await expect(page.getByRole("menuitemradio", { name: /Variant B/ })).toHaveAttribute("aria-checked", "true");

    // Variant A wist de gast-state en opent de website.
    await page.evaluate(() => localStorage.setItem("toodoo-guest", "{}"));
    await page.getByRole("menuitemradio", { name: /Variant A/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /^Flowkeuze/ })).toHaveText("A");
    expect(await page.evaluate(() => localStorage.getItem("toodoo-guest"))).toBeNull();
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
    await expect(page.getByRole("heading", { name: "Kies een flow" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Flowkeuze/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Ga terug naar website" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Hou jij niet van vergaderen? Wij wel." })).toBeVisible();
  });
});
