import { expect, test } from "@playwright/test";
import { expectToast } from "./helpers";

/** Homepage: hero (eigen versie) + secties van de nieuwe website vanaf sectie 2. */
test.describe("Homepage", () => {
  test("hero-knoppen: Probeer gratis en Boek een demo", async ({ page }) => {
    await page.goto("/");
    const main = page.getByRole("main");
    await expect(main.getByText("Geen creditcard • 30 dagen gratis proberen")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start gratis met Microsoft" })).toHaveCount(0);
    await main.getByRole("link", { name: "Boek een demo" }).first().click();
    await expectToast(page, "Niet beschikbaar in dit prototype");
    await main.getByRole("link", { name: "Probeer gratis" }).last().click();
    await expect(page).toHaveURL(/\/prototype$/);
  });

  test("secties vanaf 'Gedaan met Oeps' tot de footer", async ({ page }) => {
    await page.goto("/");
    for (const name of [
      'Gedaan met "Oeps, ik dacht dat jij dat zou doen". Duidelijk eigenaarschap. Na elke vergadering.',
      "Heb je het gehad met vergaderspaghetti? Mooi, wij maken er lasagna van.",
      "Heb je al een notetaker? Goed zo. too-doo zorgt dat wat beslist is, ook gebeurt.",
      "Teams die hun opvolging onder controle hebben.",
      "Eenvoudige prijzen. Geen verrassingen.",
      "Veelgestelde vragen",
      "Je volgende vergadering kan eindigen met beslissingen die echt gebeuren.",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(page.getByRole("heading", { level: 3 })).toContainText(["Breng structuur", "Bereid voor"]);
    await expect(page.getByRole("contentinfo")).toContainText("info@too-doo.be");
  });

  test("vergelijkingstabs, prijsschakelaar, functielijst en FAQ", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tablist", { name: "Vergelijk met" });
    await expect(
      page.getByRole("table", { name: "too-doo vergeleken met Jouw notetaker & task manager" }),
    ).toBeVisible();
    await tabs.getByRole("tab", { name: "Notion" }).click();
    await expect(page.getByRole("table", { name: "too-doo vergeleken met Notion" })).toContainText("Te bouwen");
    await tabs.getByRole("tab", { name: "Notion" }).press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Teams" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("rowheader", { name: "Notities vastleggen" })).toBeVisible();

    await expect(page.getByText("€25", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: /Jaarlijks factureren/ }).click();
    await expect(page.getByText("€20", { exact: true })).toBeVisible();

    await page.getByText("Bekijk volledige functielijst").click();
    await expect(page.getByText("Global Action Backlog")).toBeVisible();

    const faq = page.getByText("Waar worden onze vergadergegevens opgeslagen?");
    await faq.click();
    await expect(page.getByText("Je vergadergegevens worden gehost bij Level27, in Hasselt, België.")).toBeVisible();

    await page.getByRole("link", { name: "Start je pilot van 30 dagen" }).click();
    await expect(page).toHaveURL(/\/prototype$/);
  });
});
