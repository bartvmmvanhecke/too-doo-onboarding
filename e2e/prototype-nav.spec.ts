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

test.describe("lijst-knop naar de flowkeuze", () => {
  for (const route of NAV_ROUTES) {
    test(`staat op ${route}, overlapt niets en brengt je terug`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const nav = page.getByRole("link", { name: /Terug naar flowkeuze/ });
      await expect(nav).toBeVisible();
      expect(await overlapsWithNav(page)).toEqual([]);
      await nav.click();
      await expect(page).toHaveURL(/\/prototype$/);
    });
  }

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
    await expect(page.getByRole("link", { name: /Terug naar flowkeuze/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Ga terug naar website" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Hou jij niet van vergaderen? Wij wel." })).toBeVisible();
  });
});
