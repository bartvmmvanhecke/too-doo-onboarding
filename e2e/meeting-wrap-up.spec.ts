import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
async function seed(page: Page, automatic = false) {
  await page.clock.install({ time: new Date("2026-11-05T10:01:00") });
  await page.goto("/app");
  await page.evaluate(
    ({ automatic }) => {
      const now = Date.now(),
        start = now - (automatic ? 12 : 2) * 3600000;
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
test("sprongen, heropenen, carry, ongedaan maken en afronden", async ({ page }) => {
  await seed(page);
  for (const n of [4, 2, 5])
    await agenda(page)
      .getByRole("button", { name: new RegExp(`Punt ${n} `) })
      .click();
  await expect(page.getByText("3 van 6 behandeld · nog open: 3 en 6", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Afronden", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Niet behandeld (2)", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Terug naar vergadering", exact: true }).click();
  await expect(agenda(page).getByRole("button", { name: /Punt 5 nu/ })).toBeFocused();
  await agenda(page)
    .getByRole("button", { name: /Punt 2 behandeld/ })
    .click();
  await expect(page.getByText("3 van 6 behandeld · nog open: 3 en 6", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Afronden", exact: true }).first().click();
  await page
    .getByRole("group", { name: "Opvolging voor Punt 3", exact: true })
    .getByRole("button", { name: "Laten vallen" })
    .click();
  await page.getByRole("button", { name: "Rond af & verstuur opvolging", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vergadering afgerond", exact: true })).toBeFocused();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state);
  expect(state.meetings[0]).toMatchObject({ run: null, followUpStatus: "sent", endReason: "manual" });
  expect(state.meetings[1].blocks[0].items.map((i: { text: string }) => i.text)).toEqual(["Punt 6"]);
  await page.screenshot({ path: "/tmp/meeting-wrap-up-confirmation.png" });
});
test("overtime snooze, minimaliseren en pill", async ({ page }) => {
  await seed(page);
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?" })).toBeVisible();
  await page.getByRole("button", { name: "+15 min", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?" })).toHaveCount(0);
  await page.clock.fastForward(15 * 60000);
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?" })).toBeVisible();
  await page.getByRole("button", { name: "Minimaliseren", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Eerst afronden?" })).toBeVisible();
  await page
    .getByRole("status")
    .filter({ has: page.getByRole("heading", { name: "Eerst afronden?" }) })
    .getByRole("button", { name: "Minimaliseren", exact: true })
    .click();
  await expect(page.getByRole("status", { name: "Lopende vergadering" })).toBeVisible();
  await page
    .getByRole("status", { name: "Lopende vergadering" })
    .getByRole("link", { name: "Afronden", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Vergadering afronden", exact: true })).toBeVisible();
});
test("automatische terugkeer, eindtijd corrigeren, mailpreview en KPI", async ({ page }) => {
  await seed(page, true);
  await expect(page.getByRole("heading", { name: /Automatisch afgesloten om/ })).toBeVisible();
  await expect(agenda(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Tijd aanpassen", exact: true }).click();
  await page.getByLabel("Eindtijd", { exact: true }).fill("00:00");
  await page.getByRole("button", { name: "Tijd bewaren", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Automatisch afgesloten om/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Herinneringsmail bekijken" }).click();
  await expect(page.getByRole("heading", { name: "Je vergadering staat nog open" })).toBeVisible();
  await page.getByRole("link", { name: "Bekijk & verstuur opvolging" }).click();
  await expect(page.getByRole("heading", { name: "Vergadering afronden", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Terug naar vergadering", exact: true }).click();
  await page.goto("/app/vergaderingen-kpi");
  await expect(page.getByRole("heading", { name: "Niet afgerond", exact: true })).toBeVisible();
  await expect(page.getByText("1 van 2", { exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/meeting-wrap-up-kpi.png" });
});
test("laatste open punt midden in agenda, eigenaarcheck en mobiel afronden", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "Actie toevoegen", exact: true }).click();
  await page.getByLabel("Omschrijving", { exact: true }).fill("Offerte nakijken");
  await page.getByRole("button", { name: "Toevoegen", exact: true }).click();
  for (const n of [4, 2, 5, 6, 3])
    await agenda(page)
      .getByRole("button", { name: new RegExp(`Punt ${n} `) })
      .click();
  await expect(page.getByText("Laatste open punt · daarna versturen we de opvolging", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await expect(page.getByText("1 actie(s) zonder eigenaar", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/meeting-wrap-up-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Rond af & verstuur opvolging", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vergadering afgerond", exact: true })).toBeVisible();
});

test("afrondingsstap en KPI zonder WCAG A/AA-overtredingen", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "Afronden", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Vergadering afronden", exact: true })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations.map((v) => v.id),
  ).toEqual([]);
  await page.goto("/app/vergaderingen-kpi");
  await expect(page.getByRole("heading", { name: "Werkelijk", exact: true })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations.map((v) => v.id),
  ).toEqual([]);
});
