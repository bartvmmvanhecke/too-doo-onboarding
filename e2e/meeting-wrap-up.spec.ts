import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
async function seed(page: Page, automatic = false) {
  await page.clock.install({ time: new Date("2026-11-05T10:01:00") });
  await page.goto("/app");
  await page.evaluate(
    ({ automatic }) => {
      const now = Date.now(),
        start = now - (automatic ? 25 : 2) * 3600000;
      const m = {
        id: "wrap-test",
        name: "Comité de Management",
        type: "Management",
        seriesId: "s",
        recurrence: "weekly",
        date: automatic ? "2026-11-04" : "2026-11-05",
        time: 480,
        duration: 120,
        participants: ["jp", "sd"],
        actions: [],
        showWelcome: false,
        invited: true,
        held: false,
        startedAt: start,
        lastActivityAt: automatic ? start + 105 * 60000 : now,
        followUpStatus: "pending",
        run: { startedAt: start, stepStartedAt: start, currentId: "1", doneIds: [], postponedIds: [], actuals: {} },
        blocks: [
          {
            id: "b",
            kind: "topics",
            title: "Thema",
            duration: null,
            presenterId: null,
            items: Array.from({ length: 6 }, (_, i) => ({
              id: String(i + 1),
              text: `Punt ${i + 1}`,
              ownerIds: ["jp"],
              duration: 10,
              purposes: ["discuss"],
              entries: [],
            })),
          },
        ],
      };
      const raw = JSON.parse(localStorage.getItem("too-doo-onboarding") || '{"state":{},"version":4}');
      raw.state.user = { firstName: "Jan", lastName: "Peeters", email: "jan@example.com", company: "Test" };
      raw.state.meetings = [
        m,
        {
          ...m,
          id: "next",
          date: "2026-11-12",
          startedAt: undefined,
          lastActivityAt: undefined,
          followUpStatus: undefined,
          run: null,
          blocks: [],
        },
      ];
      localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
    },
    { automatic },
  );
  await page.goto("/app/overleg/wrap-test");
}
const agenda = (page: Page) => page.getByRole("complementary", { name: "Vergaderagenda" });
const current = (page: Page) => agenda(page).locator('button[aria-current="step"]');
async function finish(page: Page) {
  await page.getByRole("button", { name: "Rond vergadering af", exact: true }).click();
  await expect(page).toHaveURL(/\/vergaderingen\/wrap-test\/afronden/);
  await expect(page.getByRole("heading", { name: "Vergadering afronden", exact: true })).toBeFocused();
}
test("springen laat open; alleen Voltooi voltooit; keuzes en verzenden blijven bewaard", async ({ page }) => {
  await seed(page);
  for (const n of [4, 2, 5])
    await agenda(page)
      .getByRole("button", { name: new RegExp(`Punt ${n} `) })
      .click();
  await expect(page.getByText(/0 \/ 6 voltooid/)).toBeVisible();
  await page.getByRole("button", { name: /Voltooi · volgend open punt/ }).click();
  await expect(current(page)).toContainText("Punt 6");
  await expect(page.getByText(/1 \/ 6 voltooid/)).toBeVisible();
  await finish(page);
  await page.getByRole("combobox", { name: "Wat met dit punt? Punt 3", exact: true }).selectOption("drop");
  await page.getByRole("button", { name: "Voorbeeld", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Opvolging Comité de Management");
  await page.getByRole("button", { name: "Nog aanpassen", exact: true }).click();
  await page.getByRole("button", { name: "Rond af & verstuur opvolging", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Opvolging verstuurd naar" })).toBeFocused();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state);
  expect(state.meetings[0]).toMatchObject({ followUpStatus: "sent", run: null });
  expect(state.meetings[1].blocks[0].items.map((i: { text: string }) => i.text)).toEqual([
    "Punt 1",
    "Punt 2",
    "Punt 4",
    "Punt 6",
  ]);
  await page.reload();
  await expect(page.getByText("Afgerond", { exact: true })).toBeVisible();
});
test("laatste open punt 3, overslaan en ongedaan maken", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "Scenario: punt 3 is het laatste open punt", exact: true }).click();
  await expect(current(page)).toContainText("Strategische prioriteiten");
  await expect(page.getByRole("button", { name: "Voltooi & rond af →", exact: true })).toBeVisible();
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("too-doo-onboarding")!);
    raw.state.demo.wrapUpSkip = true;
    raw.state.meetings.find((m: { id: string }) => m.id === "wrap-test").actions = [];
    localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole("button", { name: "Voltooi & rond af →", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Opvolging verstuurd naar" })).toBeVisible();
  await page.getByRole("button", { name: "Ongedaan maken", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vergadering afronden", exact: true })).toBeVisible();
});
test("overtime, minimaliseren en pill", async ({ page }) => {
  await seed(page);
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?" })).toBeVisible();
  await page.getByRole("button", { name: "+15 min", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?" })).toHaveCount(0);
  await page.getByRole("button", { name: "Minimaliseren", exact: true }).click();
  await expect(page.getByRole("status", { name: "Lopende vergadering" })).toBeVisible();
  await page
    .getByRole("status", { name: "Lopende vergadering" })
    .getByRole("link", { name: "Afronden", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Vergadering afronden", exact: true })).toBeVisible();
});
test("automatisch afgesloten, standaard detail intact, inklappen en hervatten beperkt", async ({ page }) => {
  await seed(page, true);
  const banner = page.getByRole("region", { name: "Overzichtsstatus" });
  await expect(banner).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Vergadering" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Vergaderinformatie" })).toBeVisible();
  const toggle = banner.getByRole("button", { name: /Nog af te ronden · opvolging niet verstuurd/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Meer opties voor vergadering" }).click();
  await expect(page.getByRole("button", { name: "Vergadering hervatten", exact: true })).toBeDisabled();
});
test("niet gestart vraagt eerst; achteraf invullen vereist keuzes", async ({ page }) => {
  await seed(page, true);
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("too-doo-onboarding")!);
    const m = raw.state.meetings[0];
    delete m.startedAt;
    delete m.lastActivityAt;
    delete m.endedAt;
    m.run = null;
    m.followUpStatus = "pending";
    localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Is deze vergadering doorgegaan?" })).toBeVisible();
  await page.getByRole("button", { name: "Ja, achteraf invullen", exact: true }).click();
  const banner = page.getByRole("region", { name: "Overzichtsstatus" });
  await expect(banner.getByRole("button", { name: "Bewaar & verstuur opvolging", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Duur in minuten")).toBeVisible();
  const selects = page.getByRole("combobox", { name: /Wat met dit punt/ });
  expect(await selects.count()).toBe(6);
  for (const select of await selects.all()) await select.selectOption("next");
  await expect(banner.getByRole("button", { name: "Bewaar & verstuur opvolging", exact: true })).toBeEnabled();
});
test("afrondingsstap en KPI zonder WCAG A/AA-overtredingen, mobiel geen overflow", async ({ page }) => {
  await seed(page);
  await finish(page);
  const issues = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations;
  expect(issues.map((v) => v.id)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/app/vergaderingen-kpi");
  await expect(page.getByRole("heading", { name: "Zonder registratie", exact: true })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations.map((v) => v.id),
  ).toEqual([]);
});

test("terug uit afronden en opnieuw afronden op mobiel", async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await finish(page);
  await page.getByRole("button", { name: "Terug naar vergadering", exact: true }).last().click();
  await expect(page).toHaveURL("/vergaderingen/wrap-test");
  await expect(current(page)).toBeVisible();
  await finish(page);
  await expect(page.getByRole("heading", { name: "Vergadering afronden", exact: true })).toBeVisible();
});

test("compacte variant en kleurkeuzes blijven bij herstart demo bewaard", async ({ page }) => {
  await seed(page, true);
  await page.getByRole("button", { name: "Prototype-menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Demo-instellingen", exact: true }).click();
  await page.getByLabel(/Afronden: compacte detailpagina/).check();
  await page.getByLabel(/Afronden: knoppen in primaire kleur/).check();
  await page.getByRole("button", { name: "Demo-balk sluiten", exact: true }).click();
  await expect(page.getByRole("tablist", { name: "Vergadering" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Vergaderinformatie" })).toHaveCount(0);
  await page.screenshot({ path: "/tmp/wrap-v2-compact.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Prototype-menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Herstart demo", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state.demo);
  expect(stored.wrapUpCompact).toBe(true);
  expect(stored.wrapUpPrimary).toBe(true);
});
