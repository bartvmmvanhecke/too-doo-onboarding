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
  await expect(page.getByText(/05:\d{2} · 55 min resterend/)).toBeVisible();
  await bar(page).getByRole("button", { name: "Scenario: sprongen 1 → 4 → 2 → 5", exact: true }).click();
  await expect(page.getByText("2 van de 6 voltooid", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltooi · volgend open punt (3)", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Opleidingsbudget Q4", exact: true })).toBeFocused();
  await expect(bar(page).getByText("Scenario geladen: 2 van 6 behandeld")).toHaveAttribute("aria-live", "polite");
  await page.keyboard.press("n");
  await expect(page.getByRole("textbox", { name: "Schrijf een notitie", exact: true })).toBeFocused();
  await bar(page).getByRole("button", { name: "Scenario: nog één punt open", exact: true }).click();
  await expect(
    page.getByText("Laatste open punt · voltooi het om de vergadering af te ronden", { exact: false }),
  ).toBeVisible();
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
  await expect(page.getByRole("dialog", { name: "Vergadering afronden?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
  await expect(bar(page)).toHaveCount(0);
});
test("automatisch afsluiten opent detail zonder mail of overdracht", async ({ page }) => {
  await openRun(page);
  await bar(page).getByRole("button", { name: "Scenario: sprongen 1 → 4 → 2 → 5", exact: true }).click();
  await bar(page).getByRole("button", { name: "Gebruiker loopt weg → automatisch afsluiten", exact: true }).click();
  await expect(page.getByRole("status", { name: "Nog af te ronden", exact: true })).toContainText(
    "Automatisch afgesloten",
  );
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Lopende vergadering" })).toHaveCount(0);
  const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state.meetings);
  expect(meetings[0]).toMatchObject({ run: null, endReason: "auto", followUpStatus: "pending" });
  expect(meetings[0].endedAt - meetings[0].lastActivityAt).toBe(15 * 60000);
  expect(meetings[1].blocks[0].items).toHaveLength(0);
  await page.getByRole("button", { name: "Afronden →", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Agenda & acties", exact: true })).toBeVisible();
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

test("laatste vijf seconden plant audio vooruit, loopt live en herplant na uitstel", async ({ page }) => {
  await page.addInitScript(() => {
    const root = window as typeof window & { chimeStarts: { when: number; current: number }[]; chimeStops: number[] };
    root.chimeStarts = [];
    root.chimeStops = [];
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const voice = original.call(this),
        getCurrentTime = () => this.currentTime,
        start = voice.start.bind(voice),
        stop = voice.stop.bind(voice);
      voice.start = (when = 0) => {
        root.chimeStarts.push({ when, current: getCurrentTime() });
        start(when);
      };
      voice.stop = (when = 0) => {
        root.chimeStops.push(when);
        stop(when);
      };
      return voice;
    };
  });
  await openRun(page);
  const sound = page.getByRole("button", { name: "Geluid bij einde van de geplande tijd", exact: true });
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await bar(page).getByRole("button", { name: "Scenario: nog één punt open", exact: true }).click();
  await bar(page).getByRole("button", { name: "Laatste 5 seconden", exact: true }).click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("59:55", { exact: true })).toBeVisible();
  await expect(bar(page).getByText("Geluid aangezet voor de demo", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { chimeStarts: unknown[] }).chimeStarts.length))
    .toBe(2);
  const starts = await page.evaluate(
    () => (window as unknown as { chimeStarts: { when: number; current: number }[] }).chimeStarts,
  );
  expect(starts[0].when - starts[0].current).toBeCloseTo(5, 0);
  for (let i = 56; i <= 59; i++) {
    await page.clock.runFor(1000);
    await expect(page.getByText(`59:${i}`, { exact: true })).toBeVisible();
  }
  await page.clock.runFor(1000);
  await expect(page.getByText("60:00", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+15 min", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vergadering nog bezig?", exact: true })).toHaveCount(0);
  await bar(page).getByRole("button", { name: "Laatste 5 seconden", exact: true }).click();
  await expect(page.getByText("1:14:55", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { chimeStarts: unknown[] }).chimeStarts.length))
    .toBe(4);
  await page.getByRole("button", { name: "Minimaliseren", exact: true }).click();
  await expect(page.getByRole("status", { name: "Lopende vergadering" })).toContainText("1:14:55");
  await page.clock.runFor(5000);
  await expect(page.getByRole("status", { name: "Lopende vergadering" })).toContainText("0 min over gepland einde");
  await page.getByRole("link", { name: "Afronden", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Vergadering afronden?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Agenda & acties", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { chimeStops: number[] }).chimeStops.filter((v) => v === 0).length),
    )
    .toBeGreaterThanOrEqual(4);
});

test("geluidskeuze onthouden, voorbeeld bij aanzetten en geen inhaalsignaal na refresh", async ({ page }) => {
  await page.addInitScript(() => {
    const root = window as typeof window & { chimeStarts: number[] };
    root.chimeStarts = [];
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const voice = original.call(this),
        start = voice.start.bind(voice);
      voice.start = (when = 0) => {
        root.chimeStarts.push(when);
        start(when);
      };
      return voice;
    };
  });
  await openRun(page);
  const sound = page.getByRole("button", { name: "Geluid bij einde van de geplande tijd", exact: true });
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { chimeStarts: number[] }).chimeStarts.length))
    .toBe(2);
  await page.reload();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect(sound).toHaveAttribute("title", "Klik om het geluid te activeren");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => (window as unknown as { chimeStarts: number[] }).chimeStarts.length)).toBe(0);
  await bar(page).getByRole("button", { name: "Laatste 5 seconden", exact: true }).click();
  await page.clock.runFor(6000);
  await page.reload();
  await sound.click();
  expect(await page.evaluate(() => (window as unknown as { chimeStarts: number[] }).chimeStarts.length)).toBe(0);
});
