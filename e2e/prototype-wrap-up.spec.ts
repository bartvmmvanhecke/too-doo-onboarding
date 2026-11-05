import { expect, test, type Page } from "@playwright/test";
async function openRun(page: Page) {
  await page.clock.install({ time: new Date("2026-11-05T14:00:00") });
  await page.goto("/app");
  await page.evaluate(() => {
    const now = Date.now();
    const m = {
      id: "prototype-run",
      name: "Eigen vergadering",
      type: "Management",
      date: "2026-11-05",
      time: 840,
      duration: 60,
      recurrence: "weekly",
      participants: ["jp"],
      showWelcome: false,
      invited: true,
      held: false,
      actions: [],
      startedAt: now,
      lastActivityAt: now,
      followUpStatus: "pending",
      blocks: [
        {
          id: "b",
          kind: "topics",
          title: "Agenda",
          duration: null,
          presenterId: null,
          items: [{ id: "i", text: "Eigen punt", duration: 60, ownerIds: [], purposes: [], entries: [] }],
        },
      ],
      run: { startedAt: now, stepStartedAt: now, currentId: "i", doneIds: [], postponedIds: [], actuals: {} },
    };
    const raw = JSON.parse(localStorage.getItem("too-doo-onboarding") || '{"version":4,"state":{}}');
    raw.state.user = { firstName: "Jan", lastName: "Peeters", email: "jan@example.com" };
    raw.state.meetings = [m];
    localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
  });
  await page.goto("/app/overleg/prototype-run");
}
const bar = (page: Page) => page.getByRole("region", { name: "Prototype-bediening", exact: true });
test("scenario's, klok, pill, afronden en reset", async ({ page }) => {
  await openRun(page);
  await bar(page).getByRole("button", { name: "Tijd +5 min", exact: true }).click();
  await expect(page.getByText("05:00 · 55 min resterend", { exact: true })).toBeVisible();
  await bar(page).getByRole("button", { name: "Scenario: sprongen 1 → 4 → 2 → 5", exact: true }).click();
  await expect(page.getByText("3 van 6 behandeld · nog open: 3 en 6", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Behandeld · volgend open punt (6)", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Opleidingsbudget Q4 nu/ })).toBeFocused();
  await expect(bar(page).getByText("Scenario geladen: 3 van 6 behandeld")).toHaveAttribute("aria-live", "polite");
  await page.keyboard.press("n");
  await expect(page.getByRole("textbox", { name: "Schrijf een notitie", exact: true })).toBeFocused();
  await bar(page).getByRole("button", { name: "Scenario: nog één punt open", exact: true }).click();
  await expect(page.getByText("Laatste open punt · daarna versturen we de opvolging", { exact: false })).toBeVisible();
  await bar(page).getByRole("button", { name: "Tijd +5 min", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+15 min", exact: true }).click();
  await bar(page).getByRole("button", { name: "Scenario: nog één punt open", exact: true }).click();
  await bar(page).getByRole("button", { name: "Tijd +5 min", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Minimaliseren", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ has: page.getByRole("heading", { name: "Eerst afronden?" }) })
    .getByRole("button", { name: "Minimaliseren", exact: true })
    .click();
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Lopende vergadering" })).toContainText("0 min over gepland einde");
  await page.getByRole("link", { name: "Afronden", exact: true }).click();
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByText(/60 min \(gepland 60\)/)).toBeVisible();
});
test("spoor B naar mail, detail en niet behandelde punten", async ({ page }) => {
  await openRun(page);
  await bar(page).getByRole("button", { name: "Scenario: sprongen 1 → 4 → 2 → 5", exact: true }).click();
  await bar(page).getByRole("button", { name: "Gebruiker sluit de tab → spoor B", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Je vergadering staat nog open", exact: true })).toBeVisible();
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Lopende vergadering" })).toHaveCount(0);
  await page.getByRole("link", { name: "Verder: de vergadering na automatisch afsluiten →", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Automatisch afgesloten om/ })).toBeVisible();
  await expect(page.getByText("Strategische prioriteiten", { exact: true }).first()).toBeVisible();
  const m = await page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state.meetings);
  expect(m[0]).toMatchObject({ run: null, endReason: "auto", followUpStatus: "pending" });
  expect(m[0].endedAt - m[0].lastActivityAt).toBe(15 * 60000);
  expect(m[1].blocks[0].items.map((i: { carriedSourceId: string }) => i.carriedSourceId)).toEqual([
    "prototype-run:wrap-demo-3",
    "prototype-run:wrap-demo-6",
  ]);
  await page.getByRole("button", { name: "Bekijk & verstuur opvolging", exact: true }).click();
  await expect(page.getByText("1 actie(s) zonder eigenaar", { exact: true })).toBeVisible();
});
test("instelling blijft bewaard en mobiel loopt de balk door", async ({ page }) => {
  await openRun(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/prototype-wrap-up-mobile.png" });
  await page.getByRole("button", { name: "Prototype-menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Demo-instellingen", exact: true }).click();
  await page.getByLabel("Prototypebalk in vergadermodus", { exact: true }).uncheck();
  await expect(bar(page)).toHaveCount(0);
  await page.reload();
  await expect(bar(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Prototype-menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Demo-instellingen", exact: true }).click();
  await page.getByLabel("Prototypebalk in vergadermodus", { exact: true }).check();
  await page.getByRole("button", { name: "Demo-balk sluiten", exact: true }).click();
  await expect(bar(page)).toBeVisible();
});
