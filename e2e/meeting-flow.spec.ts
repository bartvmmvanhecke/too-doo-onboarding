import { expect, test, type Page } from "@playwright/test";
import { showOldEmptyScreen, trackErrors } from "./helpers";

/** Ingelogd zonder vergaderingen: "Ik doe dit later" opent de lege staat van Vergaderingen. */
async function emptyApp(page: Page) {
  await page.goto("/overleg");
  await page.getByRole("link", { name: "Ik doe dit later" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 1, name: "Laten we je eerste overleg klaarzetten." })).toBeVisible();
}

test.describe("Lege staat van Vergaderingen", () => {
  test("de vijf keuzes van het startscherm, in de app-layout", async ({ page }) => {
    const errors = trackErrors(page);
    await emptyApp(page);
    await expect(page.getByText(/^Welkom, /)).toBeVisible();
    const group = page.getByRole("group", { name: "Manier van starten" });
    await expect(group.getByRole("button", { name: /Vertel het me/ })).toBeVisible();
    await expect(page.getByLabel("Over welk overleg gaat het?")).toBeVisible();
    await expect(group.getByRole("button", { name: /Gebruik eerdere notities/ })).toBeVisible();
    await expect(group.getByRole("button", { name: /Haal het uit mijn agenda/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start met een lege vergadering" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Bekijk eerst een voorbeeld/ })).toContainText("met rondleiding · 2 min");
    // Geen assistentpaneel en geen oud formulier of checklist.
    await expect(page.getByRole("button", { name: "Maak overleg aan" })).toHaveCount(0);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    errors.assertNone();
  });

  test("Vertel het me: de zin wordt het overleg, via de assistent", async ({ page }) => {
    await emptyApp(page);
    await page.getByLabel("Over welk overleg gaat het?").fill("Ons productieoverleg elke maandag om 8u met Sofie");
    await page.getByRole("button", { name: /Maak mijn agenda/ }).click();
    await expect(page).toHaveURL(/\/probeer$/);
    await expect(page.getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();
  });

  test("Gebruik eerdere notities: de assistent vraagt de notities", async ({ page }) => {
    await emptyApp(page);
    await page.getByRole("button", { name: /Gebruik eerdere notities/ }).click();
    await expect(page).toHaveURL(/\/probeer$/);
    await expect(page.getByText(/Sleep ze hierheen, spreek ze in of plak/)).toBeVisible();
  });

  test("lege vergadering: banner biedt de rondleiding aan, start ze niet vanzelf", async ({ page }) => {
    await emptyApp(page);
    await page.getByRole("button", { name: "Start met een lege vergadering" }).click();
    await expect(page).toHaveURL(/\/probeer$/);
    const banner = page.getByRole("region", { name: "Rondleiding" });
    await expect(banner.getByText("Eerst even rondkijken?")).toBeVisible();
    const tour = page.getByRole("dialog", { name: "Rondleiding" });
    await expect(tour).toHaveCount(0);
    await banner.getByRole("button", { name: "Start rondleiding" }).click();
    await expect(tour.getByText("Stap 1 van 4")).toBeVisible();
    for (let i = 0; i < 3; i++) await tour.getByRole("button", { name: "Volgende" }).click();
    await expect(tour.getByText("Stap 4 van 4")).toBeVisible();
    await tour.getByRole("button", { name: "Begrepen" }).click();
    await banner.getByRole("button", { name: "Banner sluiten" }).click();
    await expect(banner).toHaveCount(0);
  });

  test("Bekijk eerst een voorbeeld: de rondleiding start vanzelf", async ({ page }) => {
    await emptyApp(page);
    await page.getByRole("link", { name: /Bekijk eerst een voorbeeld/ }).click();
    await expect(page).toHaveURL(/\/voorbeeld$/);
    await expect(page.getByRole("dialog", { name: "Rondleiding" }).getByText("Stap 1 van 4")).toBeVisible();
  });

  test("prototype-optie: oud scherm aan en weer uit", async ({ page }) => {
    await emptyApp(page);
    await showOldEmptyScreen(page);
    await page.getByRole("button", { name: "Prototype-menu" }).click();
    const option = page.getByRole("menuitemcheckbox", { name: "Alternatief eerste scherm lege vergadering" });
    await expect(option).toHaveAttribute("aria-checked", "true");
    await option.click();
    await expect(page.getByRole("heading", { name: "Laten we je eerste overleg klaarzetten." })).toBeVisible();
  });
});

test.describe("Hulp & rondleiding", () => {
  test("menu met toetsenbord, Escape en klik erbuiten", async ({ page }) => {
    await emptyApp(page);
    const trigger = page.getByRole("button", { name: "Hulp & rondleiding" });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("menu", { name: "Hulp & rondleiding" });
    await expect(menu.getByRole("menuitem")).toHaveCount(3);
    await expect(menu.getByRole("menuitem", { name: /Rondleiding starten/ })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: /Voorbeeldvergadering openen/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await page.mouse.click(900, 700);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("Rondleiding starten: buiten een vergadering eerst het voorbeeld; op het voorbeeld opnieuw", async ({
    page,
  }) => {
    await emptyApp(page);
    await page.getByRole("button", { name: "Hulp & rondleiding" }).click();
    await page.getByRole("menuitem", { name: /Rondleiding starten/ }).click();
    await expect(page).toHaveURL(/\/voorbeeld$/);
    const tour = page.getByRole("dialog", { name: "Rondleiding" });
    await expect(tour.getByText("Stap 1 van 4")).toBeVisible();
    await tour.getByRole("button", { name: "Overslaan" }).click();
    await expect(tour).toHaveCount(0);
    await page.getByRole("button", { name: "Hulp & rondleiding" }).click();
    await page.getByRole("menuitem", { name: /Rondleiding starten/ }).click();
    await expect(tour.getByText("Stap 1 van 4")).toBeVisible();
  });
});
