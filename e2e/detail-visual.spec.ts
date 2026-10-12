import { expect, test, type Page } from "@playwright/test";

/**
 * Het gewone detailscherm van een overleg mag niet veranderen door Variant A, die dezelfde componenten
 * hergebruikt (SPEC-LAZY.md §3). De referentiebeelden zijn gemaakt vóór die wijziging; vaste klok, zodat
 * de relatieve datums ("volgende: ma 19 okt") elke dag gelijk zijn.
 */
test.describe("detailscherm van een bestaand overleg (ongewijzigd)", () => {
  async function openMeeting(page: Page) {
    await page.clock.install({ time: new Date("2026-10-12T09:00:00") });
    await page.goto("/prototype");
    await page.getByRole("button", { name: /Start flow 3:/ }).click();
    await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    await page.getByRole("button", { name: "Volg deze 2 overleggen op" }).click();
    await page.getByRole("button", { name: "Haal de acties eruit" }).click();
    await page.getByRole("button", { name: "Bevestig 4 punten" }).click();
    await page.getByRole("link", { name: "Bekijk de agenda" }).click();
    await page.getByRole("heading", { level: 1, name: "Productieoverleg" }).waitFor();
    await page
      .locator("[data-sonner-toast]")
      .waitFor({ state: "detached" })
      .catch(() => {});
    await page.mouse.move(0, 0);
  }

  test("agenda, openstaande acties en checklist", async ({ page }) => {
    await openMeeting(page);
    await expect(page).toHaveScreenshot("overleg-detail.png", { fullPage: true, animations: "disabled" });
  });

  test("met een agendapunt in bewerking en een open menu", async ({ page }) => {
    await openMeeting(page);
    await page.getByRole("button", { name: "Agendapunt toevoegen aan Lopende zaken" }).click();
    await page.getByLabel("Agendapunt toevoegen aan Lopende zaken").fill("Investering plooibank");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Meer voor Lopende zaken" }).click();
    await expect(page).toHaveScreenshot("overleg-detail-bewerken.png", { fullPage: true, animations: "disabled" });
  });

  test("lopende vergadering", async ({ page }) => {
    await openMeeting(page);
    await page.getByRole("button", { name: "Start vergadering" }).click();
    await page.getByRole("button", { name: "Volgend punt" }).waitFor();
    // De klok staat stil, zodat de verstreken tijd gelijk blijft.
    await page.clock.pauseAt(new Date("2026-10-12T09:00:05"));
    await expect(page).toHaveScreenshot("overleg-detail-bezig.png", { fullPage: true, animations: "disabled" });
  });
});
