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

for (const route of ROUTES) {
  test(`geen horizontale scroll op smal scherm: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("rechterpaneel valt onder het formulier op smal scherm", async ({ page }) => {
  await page.goto("/overleg/zelf");
  const form = await page.getByRole("heading", { level: 1 }).boundingBox();
  const panel = await page.getByRole("complementary", { name: "Voorbeeld van je overleg" }).boundingBox();
  expect(panel!.y).toBeGreaterThan(form!.y);
});
