import { expect, test } from "@playwright/test";
import { seedWrapUp, storedMeetings } from "./fixtures/wrap-up";

test("Directieoverleg houdt zes punten en voorbeeldopvolging van overzicht tot afrondwizard", async ({ page }) => {
  await seedWrapUp(page);
  await page.goto("/app");
  await page
    .getByRole("region", { name: "Prototype-bediening meetingoverzicht", exact: true })
    .getByRole("button", { name: "Default", exact: true })
    .click();
  const meetingLink = page.locator('a[href="/app/overleg/overview-demo-upcoming-1"]');
  await expect(meetingLink).toContainText("Directieoverleg");
  await expect(meetingLink).not.toContainText("Productieoverleg");
  await meetingLink.click();
  await expect(page.getByRole("heading", { name: "Directieoverleg", exact: true })).toBeVisible();
  const before = (await storedMeetings(page)).find((m: { id: string }) => m.id === "overview-demo-upcoming-1");
  const titles = [
    "Opening en vorige besluiten",
    "Budgetvoorstel Q1",
    "Strategische prioriteiten",
    "Veiligheidsaudit",
    "Opleidingsbudget Q4",
    "Varia",
  ];
  expect(before.blocks[0].items.map((item: { text: string }) => item.text)).toEqual(titles);
  expect(before.actions).toHaveLength(4);
  await page.getByRole("button", { name: "Start vergadering", exact: true }).click();
  await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
  const agenda = page.getByRole("complementary", { name: "Vergaderagenda", exact: true });
  for (const title of titles) await expect(agenda.getByRole("button", { name: new RegExp(title) })).toBeVisible();
  await agenda.getByRole("button", { name: /Veiligheidsaudit/ }).click();
  await expect(page.getByText("Veiligheidsaudit uitbesteden aan externe partner", { exact: true })).toBeVisible();
  await expect(page.getByText("Offertes externe auditors opvragen", { exact: false })).toBeVisible();
  await page
    .getByRole("region", { name: "Prototype-bediening", exact: true })
    .getByRole("button", { name: "Scenario: start bij eerste punt", exact: true })
    .click();
  const after = (await storedMeetings(page)).find((m: { id: string }) => m.id === before.id);
  expect(after.blocks[0].items.map((item: { text: string }) => item.text)).toEqual(titles);
  expect(after.actions).toEqual(before.actions);
  await page.getByRole("button", { name: "Afronden", exact: true }).first().click();
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
  await page.getByRole("button", { name: "2. Beslissingen", exact: true }).click();
  await expect(page.getByText("Veiligheidsaudit uitbesteden aan externe partner", { exact: true })).toBeVisible();
  await expect(page.getByText("Opleidingsbudget Q4 vrijgeven", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "3. Acties", exact: true }).click();
  await expect(page.getByRole("list", { name: "Nieuwe acties", exact: true }).getByRole("listitem")).toHaveCount(4);
  await expect(page.getByText("Budgetvoorstel Q1 bijwerken", { exact: true })).toBeVisible();
});
