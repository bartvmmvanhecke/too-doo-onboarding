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
