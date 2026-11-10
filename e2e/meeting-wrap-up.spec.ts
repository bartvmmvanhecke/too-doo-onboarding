import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { seedWrapUp, storedMeetings } from "./fixtures/wrap-up";
test("springen voltooit niets, bevestigen en vrij navigeren in vijf stappen", async ({ page }) => {
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
  await expect(dialog.getByRole("button", { name: "Starten ongedaan maken", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Verder vergaderen" }).click();
  await page.getByRole("button", { name: "Afronden", exact: true }).first().click();
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
  await expect(page).toHaveURL(/\/vergaderingen\/wrap-test\/afronden$/);
  await expect(page.getByRole("heading", { name: "Agenda", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Voltooien: Punt 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Verplaatsen naar volgende vergadering: Punt 6", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "5. Afronden", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("1 actie heeft geen eigenaar. Ze komt bij jou terecht.");
  await page.getByRole("button", { name: "1. Agenda", exact: true }).click();
  await page.getByRole("button", { name: "Terug naar vergadering", exact: true }).click();
  await expect(agenda).toBeVisible();
  expect((await storedMeetings(page))[0].endedAt).toBeUndefined();
});
test("concept blijft bewaard, eindtijd bevestigen en opslaan zonder mail", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  const banner = page.getByRole("status", { name: "Nog af te ronden", exact: true });
  await expect(banner).toContainText("Rond deze vergadering af");
  await expect(page.getByRole("tab", { name: /Agenda/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Vergaderinformatie" })).toBeVisible();
  await page
    .locator("header")
    .getByRole("button", { name: /^(Afronden|Verder afronden) →$/ })
    .click();
  expect((await storedMeetings(page))[0].endTimeConfirmed).toBe(true);
  await page.getByRole("button", { name: "Laten vallen: Punt 6", exact: true }).click();
  await page.getByRole("button", { name: "4. Volgende vergadering", exact: true }).click();
  await expect(page.getByText(/Directievergadering · ma 16 nov/)).toBeVisible();
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await page.getByRole("button", { name: "Bekijk overzicht", exact: true }).click();
  await page.getByLabel("Samenvatting", { exact: true }).fill("Onze eigen samenvatting.");
  await page.getByRole("button", { name: "Score 4", exact: true }).click();
  await page.getByLabel("Feedback", { exact: true }).fill("Goede voortgang");
  await page.screenshot({ path: "/tmp/wrap-up-v3-follow-up-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Later afronden", exact: true }).click();
  await page
    .locator("header")
    .getByRole("button", { name: /^(Afronden|Verder afronden) →$/ })
    .click();
  await page.getByRole("button", { name: "5. Afronden", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Bekijk overzicht", exact: true }).click();
  await expect(page.getByLabel("Samenvatting", { exact: true })).toHaveValue("Onze eigen samenvatting.");
  await expect(page.getByRole("button", { name: "Score 4", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
  await expect(page.getByRole("region", { name: "Meeting summary", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Verslag bekijken", exact: true }).click();
  const meetings = await storedMeetings(page);
  expect(meetings[0].followUpStatus).toBe("saved");
  expect(meetings[0].run).toBeNull();
  expect(meetings[1].blocks.flatMap((b: { items: unknown[] }) => b.items)).toHaveLength(2);
  await page.getByRole("button", { name: "Opvolging versturen", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Opvolging verstuurd");
  expect((await storedMeetings(page))[1].blocks.flatMap((b: { items: unknown[] }) => b.items)).toHaveLength(2);
});
test("zonder volgende vergadering bewaard voor later, mobiel en toegankelijke wizard", async ({ page }) => {
  await seedWrapUp(page, { automatic: true, next: false, noActivity: true });
  await expect(page.getByRole("status", { name: "Nog af te ronden" })).toContainText("gepland einde");
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "/tmp/wrap-up-v3-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "4. Volgende vergadering", exact: true }).click();
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/wrap-up-v3-follow-up-mobile.png", fullPage: true });
  const followUpAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(followUpAxe.violations).toEqual([]);
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
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
  await banner.getByRole("button", { name: "Opslaan", exact: true }).click();
  expect((await storedMeetings(page))[0].endTimeConfirmed).toBe(true);
});

test("laatste open punt 3 vraagt bevestiging en start ongedaan bewaart inhoud", async ({ page }) => {
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
  const beforeUndo = (await storedMeetings(page))[0];
  const undoLink = page.getByRole("button", { name: "Starten ongedaan maken", exact: true });
  await expect(undoLink).toHaveClass(/text-brand/);
  await undoLink.click();
  await expect(page).toHaveURL(/\/app\/overleg\/wrap-test$/);
  const afterUndo = (await storedMeetings(page))[0];
  expect(afterUndo.actions).toEqual(beforeUndo.actions);
  expect(afterUndo.blocks[0].items.map((item: { entries: unknown[] }) => item.entries)).toEqual(
    beforeUndo.blocks[0].items.map((item: { entries: unknown[] }) => item.entries),
  );
  await expect(page.getByRole("button", { name: "Start vergadering", exact: true })).toBeVisible();
  expect((await storedMeetings(page))[0].startedAt).toBeUndefined();
});

test("prototype-opties staan uit en verbergen bestaande details alleen na inschakelen", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await expect(page.getByRole("button", { name: "Afronden", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Afronden →", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Vergaderinformatie", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Agenda/ })).toBeVisible();
  await page.getByRole("button", { name: "Prototype-menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Demo-instellingen", exact: true }).click();
  await expect(page.getByLabel("Afronden: knoppen in primaire kleur", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Afronden: compacte detailpagina", { exact: true })).not.toBeChecked();
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
  await page.getByRole("button", { name: "4. Volgende vergadering", exact: true }).click();
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
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Afronden", exact: true })).toBeVisible();
});

test("prototypebalk opent direct de voorgestelde automatische eindtijd en bevestiging", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await page.goto("/app");
  await page.getByRole("button", { name: "Automatisch afgesloten · eindtijd bevestigen", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/overleg\/prototype-auto-closed$/);
  const banner = page.getByRole("status", { name: "Nog af te ronden", exact: true });
  await expect(banner).toContainText("Eindtijd 10:05");
  await expect(banner.getByRole("button", { name: "Aanpassen", exact: true })).toBeVisible();
  expect((await storedMeetings(page)).length).toBe(3);
  await banner.getByRole("button", { name: "Aanpassen", exact: true }).click();
  await expect(banner).toContainText("Niet vroeger dan het geplande einde (10:00)");
  await banner.getByLabel("Eindtijd", { exact: true }).fill("09:59");
  await banner.getByRole("button", { name: "Opslaan", exact: true }).click();
  await expect(banner.getByRole("alert")).toContainText("Kies een eindtijd vanaf 10:00");
  await banner.getByRole("button", { name: "Annuleren", exact: true }).click();
  await expect(banner).toContainText("Eindtijd 10:05");
  await page.screenshot({ path: "/tmp/auto-closed-banner.png" });
  await banner.getByRole("button", { name: "Aanpassen", exact: true }).click();
  await banner.getByLabel("Eindtijd", { exact: true }).fill("10:10");
  await page.screenshot({ path: "/tmp/auto-closed-banner-edit.png" });
  await banner.getByRole("button", { name: "Opslaan", exact: true }).click();
  await expect(banner).toContainText("Eindtijd 10:10");
  await expect(banner).toContainText("door jou aangepast");
  await page.reload();
  await expect(banner).toContainText("door jou aangepast");
  const preview = (await storedMeetings(page)).find((m: { id: string }) => m.id === "prototype-auto-closed");
  expect(preview.endTimeConfirmed).toBe(true);
});

test("bestaande volgende vergadering blijft concept tot afronden en score staat voor de eindacties", async ({
  page,
}) => {
  await seedWrapUp(page, { automatic: true });
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await page.getByRole("button", { name: "4. Volgende vergadering", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Volgende vergadering", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Datum of tijd wijzigen", exact: true }).click();
  await page.getByLabel("Naam", { exact: true }).fill("Vervolg over het budget");
  await page.getByLabel("Datum", { exact: true }).fill("2026-11-18");
  let meetings = await storedMeetings(page);
  expect(meetings.find((m: { id: string }) => m.id === "next")).toMatchObject({
    name: "Directievergadering",
    duration: 60,
    date: "2026-11-16",
  });
  await page.reload();
  await page.getByRole("button", { name: "Datum of tijd wijzigen", exact: true }).click();
  await expect(page.getByLabel("Naam", { exact: true })).toHaveValue("Vervolg over het budget");
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await expect(page.getByText(/volgende vergadering wo 18 nov/)).toBeVisible();
  const scoreScale = page.getByRole("group", { name: "Vergaderingsscore", exact: true });
  await expect(scoreScale.getByRole("button")).toHaveCount(10);
  await scoreScale.locator("..").screenshot({ path: "/tmp/wrap-up-score-ui.png" });
  await expect(page.getByLabel("Feedback", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Score 10", exact: true }).click();
  await expect(page.getByRole("button", { name: "Score 10", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Scoreaanvraag individueel naar deelnemers versturen", { exact: true }).check();
  const order = await page.evaluate(() => {
    const score = document.querySelector('[aria-label="Vergaderingsscore"]')!;
    const send = [...document.querySelectorAll("button")].find((b) => b.textContent === "Vergadering afronden")!;
    return !!(score.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order).toBe(true);
  await page.screenshot({ path: "/tmp/wrap-up-improved-follow-up.png" });
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
  meetings = await storedMeetings(page);
  expect(meetings.find((m: { id: string }) => m.id === "next")).toMatchObject({
    name: "Vervolg over het budget",
    duration: 60,
    date: "2026-11-18",
  });
  expect(meetings[0]).toMatchObject({ followUpStatus: "saved", wrapUpDraft: { score: 10, askScore: true } });
});

test("nieuwe planning staat open en mag met lege naam overgeslagen worden", async ({ page }) => {
  await seedWrapUp(page, { automatic: true, next: false });
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await page.getByRole("button", { name: "4. Volgende vergadering", exact: true }).click();
  await expect(page.getByLabel("Naam", { exact: true })).toHaveValue("Directievergadering");
  await page.getByLabel("Datum", { exact: true }).fill("2026-11-18");
  await page.getByLabel("Naam", { exact: true }).fill("");
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Afronden", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
  expect(await storedMeetings(page)).toHaveLength(1);
});

test("vijf stappen tonen alleen-lezen beslissingen en acties en houden de agenda binnen de kaart", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("too-doo-onboarding")!);
    raw.state.meetings[0].blocks[0].items[0].entries.push({
      id: "decision-example",
      kind: "decision",
      text: "Opleidingsbudget goedgekeurd",
      ownerId: "jp",
      date: "2026-11-30",
    });
    localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Afrondingsstappen" }).getByRole("button")).toHaveCount(5);
  const row = page.getByRole("article", { name: "Punt 2", exact: true });
  await expect(row).toBeVisible();
  await expect(row.getByText("Lopende zaken", { exact: true })).toBeVisible();
  await expect(row.getByText("Voorstel: voltooien, want het punt is besproken", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Punt 3", exact: true })
      .getByText("Voorstel: verplaatsen, want het punt kwam niet aan bod", { exact: true }),
  ).toBeVisible();
  expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/wrap-up-five-steps-desktop.png" });
  await page.setViewportSize({ width: 1130, height: 824 });
  expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Beslissingen →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Beslissingen", exact: true })).toBeFocused();
  await expect(page.getByText("Opleidingsbudget goedgekeurd", { exact: true })).toBeVisible();
  const decisions = page.getByRole("list", { name: "Genomen beslissingen", exact: true });
  await expect(decisions.getByRole("listitem")).toHaveCount(1);
  await expect(decisions.getByText("Punt 1", { exact: true })).toBeVisible();
  await expect(decisions.locator("button, input, select, textarea")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/wrap-up-readonly-decisions.png" });
  await page.getByRole("button", { name: "Acties →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Acties", exact: true })).toBeFocused();
  const actions = page.getByRole("list", { name: "Nieuwe acties", exact: true });
  await expect(actions.getByRole("listitem")).toHaveCount(1);
  await expect(actions.getByText("Offerte opvragen", { exact: true })).toBeVisible();
  await expect(actions.getByText("Punt 2", { exact: true })).toBeVisible();
  await expect(actions.locator("button, input, select, textarea")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/wrap-up-readonly-actions.png" });
  await page.reload();
  await expect(actions.getByText("Offerte opvragen", { exact: true })).toBeVisible();
  expect((await storedMeetings(page))[0].blocks[0].items[0].entries[0].text).toBe("Opleidingsbudget goedgekeurd");
  await page.getByRole("button", { name: "Volgende vergadering →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Volgende vergadering", exact: true })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/wrap-up-five-steps-mobile.png" });
});

test("footer groepeert contextlink rechts en toont de vorige stap links", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  const footer = page.getByRole("contentinfo");
  const later = footer.getByRole("button", { name: "Later afronden", exact: true });
  const next = footer.getByRole("button", { name: "Beslissingen →", exact: true });
  await expect(later).toHaveClass(/text-brand/);
  const laterBox = (await later.boundingBox())!;
  const nextBox = (await next.boundingBox())!;
  expect(laterBox.x + laterBox.width).toBeLessThanOrEqual(nextBox.x);
  expect(Math.abs(laterBox.y - nextBox.y)).toBeLessThan(2);
  await next.click();
  const previous = footer.getByRole("button", { name: "← Agenda", exact: true });
  await expect(previous).toHaveClass(/text-brand/);
  expect((await previous.boundingBox())!.x).toBeLessThan((await later.boundingBox())!.x);
  await previous.click();
  await expect(page.getByRole("heading", { name: "Agenda", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "5. Afronden", exact: true }).click();
  await expect(footer.getByRole("button", { name: "← Volgende vergadering", exact: true })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Vergadering afronden", exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/wrap-up-footer-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/wrap-up-footer-mobile.png" });
});

test("prototypebalk toont vier afrondbanners en hervat bewaarde keuzes", async ({ page }) => {
  await seedWrapUp(page, { automatic: true });
  await page.goto("/app");
  await page.getByRole("button", { name: "Automatisch afgesloten · eindtijd bevestigen", exact: true }).click();
  const bar = page.getByRole("region", { name: "Prototype-bediening afrondbanners", exact: true });
  await expect(bar.getByRole("button")).toHaveCount(4);
  const barBox = (await bar.boundingBox())!;
  expect(barBox.x).toBe(0);
  expect(barBox.y).toBe(0);
  expect(barBox.width).toBe(await page.evaluate(() => innerWidth));
  const navigationBox = (await page.getByRole("navigation", { name: "Hoofdmenu", exact: true }).boundingBox())!;
  expect(navigationBox.y).toBeGreaterThanOrEqual(barBox.height);
  const banner = page.getByRole("status", { name: "Nog af te ronden", exact: true });
  await expect(banner).toContainText("Rond deze vergadering af");
  await bar.getByRole("button", { name: "Geen actie geregistreerd", exact: true }).click();
  await expect(banner).toContainText("Is deze vergadering doorgegaan?");
  await expect(banner).toContainText("Eindtijd 10:00");
  await expect(banner).toContainText("gepland einde");
  await banner.getByRole("button", { name: "Niet doorgegaan", exact: true }).click();
  await expect(page.locator("header").first()).toContainText("Niet doorgegaan");
  let preview = (await storedMeetings(page)).find((m: { id: string }) => m.id === "prototype-auto-closed");
  expect(preview).toMatchObject({ held: false, followUpStatus: "saved", run: null });
  await bar.getByRole("button", { name: "Halverwege gestopt met afronden", exact: true }).click();
  await expect(banner).toContainText("Stap 2 van 5 · Beslissingen · je keuzes zijn bewaard");
  await page.locator("header").getByRole("button", { name: "Verder afronden →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Beslissingen", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Later afronden", exact: true }).click();
  await expect(banner).toContainText("Je was bezig met afronden");
  await bar.getByRole("button", { name: "Afgerond", exact: true }).click();
  await expect(page.getByRole("region", { name: "Meeting summary", exact: true })).toBeVisible();
  await expect(page.locator("header").first()).toContainText("65min / 60min gepland");
  await page.getByRole("button", { name: "Verslag bekijken", exact: true }).click();
  await expect(page.getByRole("button", { name: "Opvolging versturen", exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/banner-completed-preview.png" });
  await page.getByRole("button", { name: "Opvolging versturen", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText("Opvolging verstuurd");
  await page.keyboard.press("Escape");
  await bar.getByRole("button", { name: "Voorgestelde afrondtijd", exact: true }).click();
  await expect(banner).toContainText("Rond deze vergadering af");
  preview = (await storedMeetings(page)).find((m: { id: string }) => m.id === "prototype-auto-closed");
  expect(preview).toMatchObject({ followUpStatus: "pending", endTimeConfirmed: false });
  expect((await storedMeetings(page)).length).toBe(3);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
