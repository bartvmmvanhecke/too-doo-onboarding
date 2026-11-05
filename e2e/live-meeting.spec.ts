import { test, expect } from "@playwright/test";

test("aanwezigheid naar vergadermodus, verslag opslaan en vergadering beëindigen", async ({ page }) => {
  await page.goto("/app");
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("too-doo-onboarding") || '{"state":{},"version":4}');
    raw.version = 4;
    raw.state.user = { firstName: "Jan", lastName: "Peeters", email: "jan@example.com", company: "Test" };
    raw.state.meetings = [
      {
        id: "live-test",
        name: "Sync Stijn",
        recurrence: "weekly",
        date: "2026-11-05",
        time: 480,
        duration: 60,
        type: "",
        participants: ["sd", "jp"],
        actions: [],
        showWelcome: false,
        invited: true,
        held: false,
        blocks: [
          {
            id: "theme",
            kind: "topics",
            title: "Nieuw thema, bv. HR",
            duration: null,
            presenterId: null,
            items: [
              {
                id: "headset",
                text: "Welke headset nemen we?",
                ownerIds: ["jp"],
                duration: 15,
                purposes: [],
                entries: [],
              },
              { id: "testing", text: "Wie gaat testen?", ownerIds: ["jp"], duration: null, purposes: [], entries: [] },
            ],
          },
          { id: "varia", kind: "topics", title: "Varia", duration: null, presenterId: null, items: [] },
        ],
      },
    ];
    localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
  });
  await page.goto("/app/overleg/live-test");
  await page.getByRole("button", { name: "Start vergadering", exact: true }).click();
  await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Vergaderagenda" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/live-meeting-desktop.png" });

  await page.getByRole("button", { name: "Beslissing toevoegen", exact: true }).click();
  await page.getByLabel("Omschrijving").fill("We kiezen headset A");
  await page.getByRole("button", { name: "Toevoegen", exact: true }).click();
  await expect(page.getByText("We kiezen headset A", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Actie toevoegen", exact: true }).click();
  await page.getByLabel("Omschrijving").fill("Bestel twee headsets");
  await page.getByLabel("Verantwoordelijke").selectOption("jp");
  await page.getByLabel("Deadline").fill("2026-11-12");
  await page.getByRole("button", { name: "Toevoegen", exact: true }).click();
  await page.getByLabel("Schrijf een notitie", { exact: true }).fill("Iedereen is akkoord");
  await page.getByRole("button", { name: "Notitie toevoegen", exact: true }).click();
  await page.getByLabel("Privénotitie", { exact: true }).check();
  await page.getByLabel("Schrijf een notitie", { exact: true }).fill("Mijn eigen bedenking");
  await page.getByRole("button", { name: "Notitie toevoegen", exact: true }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "headset.txt", mimeType: "text/plain", buffer: Buffer.from("Specificaties headset A") });
  await expect(page.getByRole("link", { name: "headset.txt" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Iedereen is akkoord", { exact: true })).toBeVisible();
  await expect(page.getByText("Mijn eigen bedenking", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "headset.txt" })).toHaveAttribute("href", /data:/);
  await page.getByRole("button", { name: "Verplaats agendapunt", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Varia", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/live-meeting-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Voltooien", exact: true }).click();
  await expect(page.getByRole("button", { name: "Wie gaat testen?", exact: true })).toHaveAttribute(
    "aria-current",
    "step",
  );
  await page.getByRole("button", { name: "Vergadering beëindigen", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Vergadering beëindigen", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Vergaderagenda" })).toHaveCount(0);
  const meeting = await page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state.meetings[0]);
  expect(meeting.run).toBeNull();
  expect(meeting.held).toBe(true);
  expect(meeting.actions[0].what).toBe("Bestel twee headsets");
  const headset = meeting.blocks.find((b: { id: string }) => b.id === "varia").items[0];
  expect(headset.entries.map((e: { kind: string }) => e.kind)).toEqual(["decision", "action", "note", "document"]);
  expect(meeting.privateNotes).toHaveLength(1);
});
