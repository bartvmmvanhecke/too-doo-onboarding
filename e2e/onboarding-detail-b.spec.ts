import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

test("onboarding: variant B zodra het overleg verschijnt, gedeelde edits en herladen", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/probeer");
  await page.getByRole("button", { name: "Prototype-menu" }).click();
  await expect(page.getByRole("button", { name: "Variant B", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Start met een lege meeting/ }).click();
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Prototype-menu" }).click();
  await page.getByRole("button", { name: "Variant B", exact: true }).click();
  await expect(page).toHaveURL(/variant=b/);
  const input = page.getByLabel("Nieuw agendapunt", { exact: true }).first();
  await input.fill("Offerte bespreken 10m");
  await input.press("Enter");
  await expect(page.getByRole("textbox", { name: /^Agendapunt in/ }).first()).toHaveValue("Offerte bespreken");
  await page.reload();
  await expect(page.locator(".meeting-document").first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Agendapunt in/ }).first()).toHaveValue("Offerte bespreken");
  await page.getByRole("button", { name: "Prototype-menu" }).click();
  await page.getByRole("button", { name: "Variant A", exact: true }).click();
  await expect(page.getByText("Offerte bespreken", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start overleg" })).toBeEnabled();
  errors.assertNone();
});

for (const variant of ["a", "b"]) {
  test(`Vertel het me: agenda controls in variant ${variant} persist across reload and variant switch`, async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto(`/probeer?variant=${variant}`);
    await page.getByRole("button", { name: /^Vertel het me/ }).click();
    await expect(page.getByRole("log").getByText(/^Waarover gaat je volgende overleg/)).toBeVisible();
    const chat = page.getByRole("complementary", { name: "Assistent" }).getByRole("textbox");
    await chat.fill("Ons productieoverleg elke maandag om 8u met Jan en Sofie: orders, problemen en planning");
    await chat.press("Enter");
    const theme = page.getByRole("main");
    await expect(theme.getByRole("heading", { level: 1 })).toBeVisible();
    if (variant === "b") {
      const input = theme.getByLabel("Nieuw agendapunt", { exact: true }).first();
      await input.fill("Order Peeters");
      await input.press("Enter");
    } else {
      await theme.getByRole("button", { name: "Agendapunt toevoegen aan Lopende orders" }).click();
      const input = theme.getByRole("textbox", { name: "Agendapunt toevoegen aan Lopende orders" });
      await input.fill("Order Peeters");
      await input.press("Enter");
      await input.press("Escape");
    }
    // Controls must be visible even when the row is neither hovered nor focused.
    await chat.focus();
    await page.mouse.move(0, 0);
    const goal = theme.getByRole("button", { name: "Doel toevoegen" });
    await expect(goal).toBeVisible();
    await expect(theme.getByRole("button", { name: "Eigenaar kiezen" })).toBeVisible();
    await expect(theme.getByRole("button", { name: "Duur toevoegen" })).toBeVisible();
    await goal.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("checkbox", { name: /Bespreken/ }).check();
    await page.getByRole("checkbox", { name: /Informeren/ }).check();
    await page.getByRole("button", { name: "Pas 2 doelen toe" }).click();
    const chosenGoal = theme.getByRole("button", { name: "Doel: Bespreken, Informeren. Wijzigen" });
    await expect(chosenGoal).toBeFocused();
    await theme.getByRole("button", { name: "Eigenaar kiezen" }).click();
    await page.getByLabel("Zoek een collega").fill("jan");
    await page.getByRole("checkbox", { name: /Jan/ }).check();
    await page.getByLabel("Zoek een collega").fill("sofie");
    await page.getByRole("checkbox", { name: /Sofie/ }).check();
    await page.getByRole("button", { name: "Wijs 2 eigenaars toe" }).click();
    await theme.getByRole("button", { name: "Duur toevoegen" }).click();
    await expect(page.getByRole("button", { name: "5 minuten minder" })).toBeDisabled();
    await page.getByRole("button", { name: "5 minuten meer" }).click();
    await page.getByRole("button", { name: "20", exact: true }).click();
    await page.reload();
    await expect(chosenGoal).toBeVisible();
    await expect(theme.getByRole("button", { name: "Eigenaar: Jan, Sofie. Wijzigen" })).toBeVisible();
    await expect(theme.getByRole("button", { name: "Duur: 20 minuten. Wijzigen" })).toBeVisible();
    await page.getByRole("button", { name: "Prototype-menu" }).click();
    await page.getByRole("button", { name: variant === "a" ? "Variant B" : "Variant A", exact: true }).click();
    await expect(chosenGoal).toBeVisible();
    await expect(theme.getByRole("button", { name: "Eigenaar: Jan, Sofie. Wijzigen" })).toBeVisible();
    await expect(theme.getByRole("button", { name: "Duur: 20 minuten. Wijzigen" })).toBeVisible();
    errors.assertNone();
  });
}
