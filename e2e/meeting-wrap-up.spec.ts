import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { seedWrapUp, storedMeetings } from "./fixtures/wrap-up";
test("springen voltooit niets, bevestigen en vrij navigeren in drie stappen", async ({ page }) => {
  await seedWrapUp(page);
  const agenda = page.getByRole("complementary", { name: "Vergaderagenda" });
  await agenda.getByRole("button", { name: /Punt 3/ }).click();
  expect(
    (await storedMeetings(page))[0].blocks[0].items.filter((i: { runStatus: string }) => i.runStatus === "done"),
  ).toHaveLength(2);
  await expect(page.getByRole("button", { name: "Voltooi · volgend open punt (3)", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Afronden", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Vergadering afronden?", exact: true });
  await expect(dialog).toContainText("4 agendapunten zijn nog open.");
  await expect(dialog.getByRole("button", { name: "Start ongedaan maken" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Verder vergaderen" }).click();
  await page.getByRole("button", { name: "Afronden", exact: true }).first().click();
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
  await expect(page).toHaveURL(/\/vergaderingen\/wrap-test\/afronden$/);
  await expect(page.getByRole("heading", { name: "Agenda & acties", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Voltooien: Punt 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Verplaatsen naar volgende vergadering: Punt 6", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "3. Opvolging", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("1 actie heeft geen eigenaar. Ze komt bij jou terecht.");
  await page.getByRole("button", { name: "1. Agenda & acties", exact: true }).click();
  await page.getByRole("button", { name: "Terug naar de vergadering", exact: true }).click();
  await expect(agenda).toBeVisible();
  expect((await storedMeetings(page))[0].endedAt).toBeUndefined();
});
test("concept blijft bewaard, eindtijd bevestigen en opslaan zonder mail", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  const banner = page.getByRole("status", { name: "Nog af te ronden", exact: true });
  await expect(banner).toContainText("Automatisch afgesloten · eindtijd");
  await expect(page.getByRole("tab", { name: /Agenda/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Vergaderinformatie" })).toBeVisible();
  await banner.getByRole("button", { name: "Afronden →", exact: true }).click();
  expect((await storedMeetings(page))[0].endTimeConfirmed).toBe(true);
  await page.getByRole("button", { name: "Laten vallen: Punt 6", exact: true }).click();
  await page.getByRole("button", { name: "Volgende vergadering →", exact: true }).click();
  await expect(page.getByText(/Volgende vergadering: ma 16 nov/)).toBeVisible();
  await page.getByRole("button", { name: "Opvolging →", exact: true }).click();
  await page.getByLabel("Samenvatting", { exact: true }).fill("Onze eigen samenvatting.");
  await page.getByRole("button", { name: "Score 4", exact: true }).click();
  await page.getByLabel("Feedback", { exact: true }).fill("Goede voortgang");
  await page.screenshot({ path: "/tmp/wrap-up-v3-follow-up-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Aanpassen", exact: true }).last().click();
  await page.getByRole("checkbox", { name: "Sofie De Smet", exact: true }).uncheck();
  await page.getByRole("button", { name: "Later afronden", exact: true }).click();
  await banner.getByRole("button", { name: "Afronden →", exact: true }).click();
  await page.getByRole("button", { name: "3. Opvolging", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Samenvatting", { exact: true })).toHaveValue("Onze eigen samenvatting.");
  await expect(page.getByRole("button", { name: "Score 4", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Opslaan zonder versturen", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Vergadering afgerond · opvolging niet verstuurd");
  const meetings = await storedMeetings(page);
  expect(meetings[0].followUpStatus).toBe("saved");
  expect(meetings[0].run).toBeNull();
  expect(meetings[1].blocks.flatMap((b: { items: unknown[] }) => b.items)).toHaveLength(2);
  await page.getByRole("button", { name: "Nu versturen", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Opvolging verstuurd naar 1 deelnemers");
  expect((await storedMeetings(page))[1].blocks.flatMap((b: { items: unknown[] }) => b.items)).toHaveLength(2);
});
test("zonder volgende vergadering bewaard voor later, mobiel en toegankelijke wizard", async ({ page }) => {
  await seedWrapUp(page, { automatic: true, next: false, noActivity: true });
  await expect(page.getByRole("status", { name: "Nog af te ronden" })).toContainText("geen activiteit geregistreerd");
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "/tmp/wrap-up-v3-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Volgende vergadering →", exact: true }).click();
  await page.getByLabel("Geen volgende vergadering plannen", { exact: true }).check();
  await page.getByRole("button", { name: "Opvolging →", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/wrap-up-v3-follow-up-mobile.png", fullPage: true });
  const followUpAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(followUpAxe.violations).toEqual([]);
  await page.getByRole("button", { name: "Verstuur opvolging", exact: true }).click();
  const meetings = await storedMeetings(page);
  expect(meetings).toHaveLength(1);
  expect(meetings[0].blocks[0].items.filter((i: { carry: string }) => i.carry === "next")).toHaveLength(3);
});
test("pending lijst, sidebar, volgende vergadering en verouderde status", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Nog af te ronden", exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Hoofdmenu" }).getByRole("link", { name: /Vergaderingen/ }),
  ).toContainText("1");
  await page.getByRole("link", { name: "Afronden: Directievergadering", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/overleg\/wrap-test$/);
  await page.goto("/app/overleg/next");
  await expect(page.getByRole("status")).toContainText("De opvolging van ma 9 nov is nog niet verstuurd.");
  await page.getByRole("button", { name: "Overslaan", exact: true }).click();
  await expect(page.getByText("De opvolging van ma 9 nov is nog niet verstuurd.")).toHaveCount(0);
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("too-doo-onboarding")!);
    raw.state.meetings[0].endedAt = Date.now() - 15 * 86400000;
    localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
  });
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Nog af te ronden", exact: true })).toHaveCount(0);
  await expect(page.getByText("Opvolging niet verstuurd", { exact: true })).toBeVisible();
});
test("meldingsvoorkeur en periodieke mailpreview", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await page.goto("/app/meldingen");
  await page.getByRole("combobox", { name: "Periodieke samenvatting", exact: true }).selectOption("off");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Periodieke samenvatting", exact: true })).toHaveValue("off");
  await page.getByRole("link", { name: "Voorbeeld van de samenvatting" }).click();
  await expect(page.getByRole("heading", { name: "Nog af te ronden", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Jouw acties", exact: true })).toBeVisible();
});

test("job sluit af na twee uur zonder mail of overdracht en eindtijd is aanpasbaar", async ({ page }) => {
  await seedWrapUp(page);
  await page.clock.fastForward(100 * 60_000);
  const banner = page.getByRole("status", { name: "Nog af te ronden", exact: true });
  await expect(banner).toBeVisible();
  const [closed, next] = await storedMeetings(page);
  expect(closed).toMatchObject({ endReason: "auto", endTimeConfirmed: false, followUpStatus: "pending", run: null });
  expect(closed.endedAt - closed.lastActivityAt).toBe(15 * 60_000);
  expect(new Date(closed.endedAt).toISOString().slice(0, 16)).toBe("2026-11-09T09:05");
  expect(next.blocks).toHaveLength(0);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state.digestOutbox),
  ).toBeUndefined();
  await banner.getByRole("button", { name: "Aanpassen", exact: true }).click();
  await banner.getByLabel("Eindtijd", { exact: true }).fill("10:10");
  await banner.getByRole("button", { name: "Bewaren", exact: true }).click();
  expect((await storedMeetings(page))[0].endTimeConfirmed).toBe(true);
});

test("laatste open punt 3 vraagt bevestiging en start ongedaan kan alleen zonder inhoud", async ({ page }) => {
  await seedWrapUp(page);
  const bar = page.getByRole("region", { name: "Prototype-bediening", exact: true });
  await bar.getByRole("button", { name: "Scenario: punt 3 is het laatste open punt", exact: true }).click();
  await expect(
    page.getByText("Laatste open punt · voltooi het om de vergadering af te ronden", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltooi & rond af →", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Alle punten zijn voltooid.");
  await page.getByRole("button", { name: "Verder vergaderen", exact: true }).click();
  await bar.getByRole("button", { name: "Scenario: start bij eerste punt", exact: true }).click();
  await page.getByRole("button", { name: "Afronden", exact: true }).first().click();
  await page.getByRole("button", { name: "Start ongedaan maken", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start vergadering", exact: true })).toBeVisible();
  expect((await storedMeetings(page))[0].startedAt).toBeUndefined();
});

test("prototype-opties staan uit en verbergen bestaande details alleen na inschakelen", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  const primaryButton = page.getByRole("button", { name: "Afronden", exact: true });
  const originalColor = await primaryButton.evaluate((element) => getComputedStyle(element).backgroundColor);
  await expect(page.getByRole("region", { name: "Vergaderinformatie", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Agenda/ })).toBeVisible();
  await page.getByRole("button", { name: "Prototype-menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Demo-instellingen", exact: true }).click();
  await expect(page.getByLabel("Afronden: knoppen in primaire kleur", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Afronden: compacte detailpagina", { exact: true })).not.toBeChecked();
  await page.getByLabel("Afronden: knoppen in primaire kleur", { exact: true }).check();
  await expect
    .poll(() => primaryButton.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe("rgb(39, 71, 214)");
  expect(originalColor).not.toBe("rgb(39, 71, 214)");
  await page.getByLabel("Afronden: compacte detailpagina", { exact: true }).check();
  await page.getByRole("button", { name: "Demo-balk sluiten", exact: true }).click();
  await expect(page.getByRole("region", { name: "Vergaderinformatie", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /Agenda/ })).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Nog af te ronden", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", { name: /Agenda/ })).toHaveCount(0);
});

test("wizardstijl met verbonden stappen en volledige kalender, ook bij bekende volgende datum", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await page.getByRole("button", { name: "2. Volgende vergadering", exact: true }).click();
  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible();
  await expect(calendar.getByRole("gridcell")).toHaveCount(42);
  await calendar.getByRole("button").filter({ hasText: /^18$/ }).click();
  expect((await storedMeetings(page))[0].wrapUpDraft.nextDate).toBe("2026-11-18");
  await page.screenshot({ path: "/tmp/wrap-up-calendar-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(calendar).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/wrap-up-calendar-mobile.png" });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole("button", { name: "Opvolging →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Opvolging", exact: true })).toBeVisible();
});

test("prototypebalk opent direct de voorgestelde automatische eindtijd en bevestiging", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await page.goto("/app");
  await page.getByRole("button", { name: "Automatisch afgesloten · eindtijd bevestigen", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/overleg\/prototype-auto-closed$/);
  const banner = page.getByRole("status", { name: "Nog af te ronden", exact: true });
  await expect(banner).toContainText("eindtijd 10:05 (laatste activiteit 09:50 + 15 min)");
  await expect(banner.getByRole("button", { name: "Klopt", exact: true })).toBeVisible();
  await expect(banner.getByRole("button", { name: "Aanpassen", exact: true })).toBeVisible();
  expect((await storedMeetings(page)).length).toBe(3);
  await banner.getByRole("button", { name: "Klopt", exact: true }).click();
  const preview = (await storedMeetings(page)).find((m: { id: string }) => m.id === "prototype-auto-closed");
  expect(preview.endTimeConfirmed).toBe(true);
});
