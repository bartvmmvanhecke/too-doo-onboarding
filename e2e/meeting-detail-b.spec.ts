import { test, expect, type Page } from "@playwright/test";
import { trackErrors } from "./helpers";
async function seed(page: Page, empty = true) {
  await page.goto("/app");
  await page.evaluate(
    ({ empty }) => {
      const raw = JSON.parse(localStorage.getItem("too-doo-onboarding") || '{"state":{},"version":0}');
      const meeting = {
        id: "document-b",
        name: "Productie",
        recurrence: "weekly",
        date: "2026-10-19",
        time: 480,
        duration: 60,
        type: "",
        participants: ["jp", "sd"],
        actions: [],
        blocks: empty
          ? []
          : [
              {
                id: "block-1",
                kind: "topics",
                title: "Lopende zaken",
                duration: null,
                presenterId: null,
                items: [{ id: "item-1", text: "Leverancier", ownerIds: [], duration: null, purposes: [], entries: [] }],
              },
            ],
        showWelcome: false,
        invited: true,
        held: false,
      };
      raw.version = 4;
      raw.state.meetings = [meeting];
      raw.state.user = { firstName: "Jan", lastName: "Peeters", email: "jan@example.com", company: "Metaalwerken" };
      localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
    },
    { empty },
  );
  await page.goto("/app/overleg/document-b?variant=b");
  await expect(page.getByRole("heading", { level: 1, name: "Productie" })).toBeVisible();
}
async function state(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state.meetings[0]);
}
test("deelbare variant, gedeelde data en menu alleen op detail", async ({ page }) => {
  const errors = trackErrors(page);
  await seed(page);
  await expect(page.getByText("Typ, plak", { exact: false })).toBeVisible();
  const input = page.getByLabel("Nieuw agendapunt", { exact: true });
  await expect(input).toBeFocused();
  await input.fill("Nieuw punt 10m");
  await expect(page.getByText("Typ, plak", { exact: false })).toHaveCount(0);
  await input.press("Enter");
  expect((await state(page)).blocks[0].items[0]).toMatchObject({ text: "Nieuw punt", duration: 10 });
  await page.reload();
  await expect(page.locator(".meeting-document")).toBeVisible();
  await page.getByRole("button", { name: "Prototype-menu" }).click();
  await page.getByRole("button", { name: "Variant A", exact: true }).click();
  await expect(page.locator(".meeting-document")).toHaveCount(0);
  await expect(page.getByText("Nieuw punt", { exact: true })).toBeVisible();
  await page.goto("/app");
  await page.getByRole("button", { name: "Prototype-menu" }).click();
  await expect(page.getByRole("group", { name: "Meeting detail: variant A / B" })).toHaveCount(0);
  errors.assertNone();
});
test("toetsenbord: notities, checkboxactie, nieuw blok, eigenaar, doel en pauze", async ({ page }) => {
  await seed(page, false);
  let input = page.getByLabel("Nieuw agendapunt", { exact: true });
  await input.fill("Notitie");
  await input.press("Tab");
  input = page.getByRole("textbox", { name: "Nieuwe ingesprongen regel" });
  await input.press("Enter");
  await input.fill("[] Maak de offerte");
  await input.press("Enter");
  expect((await state(page)).actions[0].what).toBe("Maak de offerte");
  await input.press("Enter");
  input = page.getByLabel("Nieuw agendapunt", { exact: true }).first();
  await input.fill("# Varia");
  await input.press("Enter");
  await expect(page.getByRole("textbox", { name: "Bloktitel" }).last()).toHaveValue("Varia");
  input = page.getByLabel("Nieuw agendapunt", { exact: true }).last();
  input = page.locator("input[data-document-line]:focus");
  await input.fill("Offerte @Jan");
  await input.press("Enter");
  await input.press("End");
  await input.press("Space");
  await input.press("/");
  await input.press("b");
  await input.press("e");
  await input.press("ArrowDown");
  await input.press("Enter");
  await input.press("Enter");
  const item = (await state(page)).blocks.at(-1).items[0];
  expect(item.ownerIds).toEqual(["jp"]);
  expect(item.purposes).toContain("decide");
  input = page.getByLabel("Nieuw agendapunt", { exact: true }).last();
  await input.fill("/pauze");
  await input.press("Enter");
  await expect(page.getByText("Pauze · 5 min", { exact: true })).toBeVisible();
});
test("voorstellen behouden focus, bevestiging en weigering", async ({ page }) => {
  await seed(page);
  const input = page.getByLabel("Nieuw agendapunt", { exact: true });
  await input.fill("Sofie belt de leverancier opnieuw. Jan maakt de nieuwe offerte voor vrijdag.");
  await expect(page.getByRole("button", { name: "Bevestig actie" })).toHaveCount(2);
  await expect(input).toBeFocused();
  await expect(page.getByText("Voorstel: vrijdag")).toBeVisible();
  await page.getByRole("button", { name: "Geen actie" }).first().click();
  await expect(page.getByRole("button", { name: "Bevestig actie" })).toHaveCount(1);
  await page.keyboard.press("Control+Enter");
  await expect.poll(async () => (await state(page)).actions.length).toBe(1);
  expect((await state(page)).actions[0]).toMatchObject({ ownerId: "jp", deadline: "2026-10-23" });
  await expect(page.getByRole("button", { name: "Bevestig actie" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Productie", level: 1 })).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByRole("button", { name: "Bevestig actie" })).toHaveCount(0);
});
test("plakken maakt punten en notities, voorbeelden komen terug na verwijderen", async ({ page }) => {
  await seed(page);
  const input = page.getByLabel("Nieuw agendapunt", { exact: true });
  await input.evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", "- Eerste punt\n  Een notitie\n1. Tweede punt");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
  });
  const meeting = await state(page);
  expect(meeting.blocks[0].items.map((i: { text: string }) => i.text)).toEqual(["Eerste punt", "Tweede punt"]);
  expect(meeting.blocks[0].items[0].entries[0].text).toBe("Een notitie");
  const points = page.getByRole("textbox", { name: "Agendapunt in naamloos blok" });
  await points.last().fill("");
  await points.last().press("Backspace");
  await points.first().fill("");
  await points.first().press("Backspace");
  await expect(page.getByText("Typ, plak", { exact: false })).toBeVisible();
});

test("focus blijft na Tab en Shift+Enter bewaart een regeleinde in dezelfde titel", async ({ page }) => {
  await seed(page, false);
  const input = page.getByLabel("Nieuw agendapunt", { exact: true });
  await input.fill("Een notitie");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Nieuwe ingesprongen regel")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.locator("input[data-document-line]:focus")).toHaveAttribute("aria-label", "Nieuw agendapunt");
  await page.keyboard.type("Eerste titelregel");
  await page.keyboard.press("Shift+Enter");
  await expect(page.getByLabel("Nieuw agendapunt, vervolg 2")).toBeFocused();
  await page.keyboard.type("Tweede titelregel");
  await page.keyboard.press("Enter");
  expect((await state(page)).blocks[0].items[1].text).toBe("Eerste titelregel\nTweede titelregel");
});
test("blok verwijderen verschuift punten en kan ongedaan gemaakt worden", async ({ page }) => {
  await seed(page, false);
  await page.getByLabel("Nieuw agendapunt", { exact: true }).fill("# Tweede blok");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Tweede punt");
  await page.keyboard.press("Enter");
  const title = page.getByLabel("Bloktitel").last();
  await title.fill("");
  await title.press("Enter");
  expect((await state(page)).blocks[0].items.map((i: { text: string }) => i.text)).toEqual([
    "Leverancier",
    "Tweede punt",
  ]);
  await page.getByRole("button", { name: "Ongedaan maken" }).click();
  await expect(page.getByLabel("Bloktitel").last()).toHaveValue("Tweede blok");
});
test("toegankelijk document en schermopbouw", async ({ page }) => {
  await seed(page, false);
  await page
    .getByLabel("Nieuw agendapunt", { exact: true })
    .fill("Sofie belt de staal-leverancier opnieuw. Jan maakt de nieuwe offerte voor vrijdag.");
  await expect(page.getByRole("button", { name: "Bevestig actie" })).toHaveCount(2);
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const result = await new AxeBuilder({ page }).include(".meeting-document").analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: "/tmp/meeting-detail-b-preview.png", fullPage: true });
});

test("wijzigingen in de bronregel blijven bewaard na bevestiging", async ({ page }) => {
  await seed(page, false);
  const source = page.getByLabel("Agendapunt in Lopende zaken");
  await source.fill("Jan maakt de offerte voor vrijdag");
  await page.getByRole("button", { name: "Bevestig actie" }).click();
  expect((await state(page)).blocks[0].items[0].text).toBe("Jan maakt de offerte voor vrijdag");
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.getByLabel("Nieuw agendapunt", { exact: true }).fill("Punt /be");
  const result = await new AxeBuilder({ page }).include(".meeting-document").analyze();
  expect(result.violations).toEqual([]);
});

test("variantkeuze en toevoegen van een notitie werken zonder focusverlies", async ({ page }) => {
  await seed(page, false);
  await page.getByRole("button", { name: "Prototype-menu" }).click();
  await expect(page.getByRole("button", { name: "Variant A", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Variant B", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "Prototype-menu" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Prototype-menu" })).toBeFocused();
  await page.getByLabel("Agendapunt in Lopende zaken").focus();
  await page.getByRole("button", { name: "Toevoegen bij item-1" }).click();
  await page.getByRole("option", { name: "Notitie", exact: true }).click();
  await expect(page.getByLabel("Nieuwe ingesprongen regel")).toBeFocused();
});
