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
    // Op mobiel zoomt Chrome uit als iets te breed is: vergelijk ook met de echte schermbreedte.
    const overflow = await page.evaluate(
      () =>
        Math.max(document.documentElement.scrollWidth, window.innerWidth) -
        (window.visualViewport?.width ?? window.innerWidth),
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("rechterpaneel valt onder het formulier op smal scherm", async ({ page }) => {
  await page.goto("/overleg/zelf");
  const form = await page.getByRole("heading", { level: 1 }).boundingBox();
  const panel = await page.getByRole("complementary", { name: "Voorbeeld van je overleg" }).boundingBox();
  expect(panel!.y).toBeGreaterThan(form!.y);
});
