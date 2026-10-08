import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Automatische toegankelijkheidscontrole (WCAG 2.1 A/AA) op elke route en de belangrijkste toestanden. */
const CASES: { name: string; path: string; setup?: (page: import("@playwright/test").Page) => Promise<void> }[] = [
  { name: "hero", path: "/" },
  { name: "account A", path: "/start" },
  {
    name: "account B",
    path: "/start",
    setup: async (page) => {
      await page.getByLabel("Werk-e-mail").fill("jan.peeters@metaalwerken.be");
      await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
    },
  },
  { name: "geblokkeerd", path: "/start/geblokkeerd" },
  { name: "overleg vóór toestemming", path: "/overleg" },
  {
    name: "overleg lijst",
    path: "/overleg",
    setup: async (page) => {
      await page.getByRole("button", { name: "Toon mijn overleggen uit Outlook" }).click();
      await page.getByRole("group", { name: "Terugkerend in je Outlook-agenda" }).waitFor();
    },
  },
  {
    name: "zelf invullen met uurlijst open",
    path: "/overleg/zelf",
    setup: async (page) => {
      await page.getByRole("combobox", { name: "Uur" }).click();
    },
  },
  { name: "goedkeuring", path: "/overleg/goedkeuring" },
  { name: "voorbeeld", path: "/voorbeeld" },
  { name: "lege toestand", path: "/app" },
  {
    name: "acties en overleg met modal",
    path: "/overleg/zelf",
    setup: async (page) => {
      await page.getByRole("button", { name: "Productieoverleg" }).click();
      await page.getByRole("button", { name: "Volgende" }).click();
      await page.getByLabel("Actie 1", { exact: true }).fill("Offerte opvragen");
      await page.getByRole("button", { name: "Toon mijn overleg" }).click();
      await page.getByRole("heading", { level: 1, name: "Productieoverleg" }).waitFor();
      await page.getByRole("button", { name: /Je andere vaste vergaderingen toevoegen/ }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "vergadering met agenda en lopende vergadering",
    path: "/app",
    setup: async (page) => {
      await page.getByLabel("Naam", { exact: true }).fill("Teamoverleg");
      await page.getByLabel("Wanneer").fill("ma 08:00");
      await page.getByRole("button", { name: "Maak overleg aan" }).click();
      const add = page.getByLabel("Agendapunt toevoegen aan Lopende zaken");
      await add.fill("Planning week 42");
      await add.press("Enter");
      await page.getByRole("button", { name: "Toevoegen aan Planning week 42" }).click();
      await page.getByRole("button", { name: "Doel", exact: true }).click();
      await page.getByRole("button", { name: "Bespreken" }).click();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Start vergadering" }).click();
      await page.getByRole("button", { name: "Volgend punt" }).click();
      await page.locator("[aria-current=step]").waitFor();
    },
  },
  { name: "prototype", path: "/prototype" },
  { name: "website B", path: "/b" },
  { name: "voorbeeld B", path: "/b/voorbeeld" },
  { name: "reis", path: "/b/reis" },
  { name: "mail", path: "/b/mail" },
  {
    name: "variant B: voorstellen uit notities",
    path: "/prototype",
    setup: async (page) => {
      await page.getByRole("button", { name: /Start flow 3:/ }).click();
      await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
      await page.getByRole("button", { name: "Volg deze 2 overleggen op" }).click();
      await page.getByRole("button", { name: "Haal de acties eruit" }).click();
      await page.getByRole("heading", { name: "4 voorstellen uit je notities" }).waitFor();
    },
  },
  {
    name: "variant B: overzicht",
    path: "/prototype",
    setup: async (page) => {
      await page.getByRole("button", { name: /Start flow 3:/ }).click();
      await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
      await page.getByRole("button", { name: "Volg deze 2 overleggen op" }).click();
      await page.getByRole("button", { name: "Haal de acties eruit" }).click();
      await page.getByRole("button", { name: "Bevestig 4 punten" }).click();
      await page.getByRole("heading", { name: "Dit volgt too-doo nu voor je op" }).waitFor();
    },
  },
];

for (const c of CASES) {
  test(`geen axe-overtredingen: ${c.name}`, async ({ page }) => {
    await page.goto(c.path);
    await page.waitForLoadState("networkidle");
    if (c.setup) await c.setup(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}
