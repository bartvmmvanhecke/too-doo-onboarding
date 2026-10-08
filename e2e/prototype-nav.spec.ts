import { expect, test, type Page } from "@playwright/test";

/** Alle routes met de lijst-knop; overleg- en B-schermen krijgen eerst state via een flow. */
export const NAV_ROUTES = [
  "/",
  "/start",
  "/start/geblokkeerd",
  "/overleg",
  "/overleg/zelf",
  "/overleg/goedkeuring",
  "/voorbeeld",
  "/app",
];

/** Elementen met eigen tekst of interactie die de knop raken. */
export async function overlapsWithNav(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const nav = document.querySelector("[data-prototype-nav]");
    if (!nav) return ["(geen lijst-knop gevonden)"];
    const r = nav.getBoundingClientRect();
    const hits: string[] = [];
    const candidates = document.querySelectorAll<HTMLElement>(
      "a, button, input, select, textarea, label, h1, h2, h3, p, span, li, img, svg",
    );
    for (const el of candidates) {
      if (nav.contains(el) || el.closest("[data-sonner-toaster], [aria-label='Demo-instellingen']")) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
      const interactive = el.matches("a, button, input, select, textarea, img, svg");
      if (!hasOwnText && !interactive) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom) {
        hits.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}"`);
      }
    }
    return hits;
  });
}

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

  test("ontbreekt op /prototype", async ({ page }) => {
    await page.goto("/prototype");
    await expect(page.getByRole("heading", { name: "Kies een flow" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Terug naar flowkeuze/ })).toHaveCount(0);
  });
});
