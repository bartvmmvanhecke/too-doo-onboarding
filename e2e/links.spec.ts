import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/start",
  "/start/geblokkeerd",
  "/overleg",
  "/overleg/zelf",
  "/overleg/goedkeuring",
  "/voorbeeld",
  "/app",
  "/prototype",
  "/b",
  "/b/voorbeeld",
  "/b/reis",
  "/b/mail",
  "/b/structuur",
];

/** Geen doodlopende links: elke interne link wijst naar een bestaande route. */
test("alle interne links op alle routes werken", async ({ page, request }) => {
  const seen = new Set<string>();
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    for (const href of hrefs) {
      if (href.startsWith("#") || seen.has(href)) continue;
      seen.add(href);
      expect(href.startsWith("/"), `externe of lege link "${href}" op ${route}`).toBe(true);
      const res = await request.get(href);
      expect(res.status(), `${href} (op ${route})`).toBe(200);
    }
  }
  expect(seen.size).toBeGreaterThan(5);
});

/** "#…"-links moeten iets doen: scrollen naar een sectie of een melding tonen. */
test("ankerlinks op de hero scrollen of tonen een melding", async ({ page }) => {
  await page.goto("/");
  for (const id of ["hoe", "klanten"]) await expect(page.locator(`#${id}`)).toBeAttached();
  await page.getByRole("link", { name: "Prijzen" }).click();
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: "Niet beschikbaar in dit prototype" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(/\/app$/);
});
