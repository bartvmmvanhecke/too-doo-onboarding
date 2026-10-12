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
      await page.getByRole("button", { name: "Connecteer Outlook en kies een meeting" }).click();
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
      await page.waitForURL(/\/voorbeeld$/);
      await page.goto("/app/overleg/productieoverleg");
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
      await page.getByRole("button", { name: "Doel toevoegen" }).first().click();
      await page.getByRole("checkbox", { name: /Bespreken/ }).check();
      await page.getByRole("button", { name: "Pas 1 doel toe" }).click();
      await page.getByRole("button", { name: "Beslissing toevoegen bij Planning week 42" }).click();
      await page.getByRole("textbox", { name: "Beslissing", exact: true }).fill("Planning ok");
      await page.keyboard.press("Enter");
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .include("[role=dialog]")
        .analyze()
        .then((r) => {
          expect(r.violations.map((v) => v.id)).toEqual([]);
        });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Start vergadering" }).click();
      await page.getByRole("button", { name: "Volgend punt" }).click();
      await page.locator("[aria-current=step]").waitFor();
    },
  },
  { name: "prototype", path: "/prototype" },
  { name: "variant A: welkomstscherm", path: "/probeer" },
  {
    name: "variant A: ⋯-menu van de assistent",
    path: "/probeer",
    setup: async (page) => {
      await page
        .getByRole("textbox", { name: "Bericht aan de assistent" })
        .fill("Ons productieoverleg: orders, problemen en planning");
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Klopt" }).waitFor();
      await page.getByRole("button", { name: "Meer opties" }).click();
      await page.getByRole("menu", { name: "Meer opties" }).waitFor();
    },
  },
  {
    name: "variant A: lege meeting",
    path: "/probeer",
    setup: async (page) => {
      await page.getByRole("button", { name: "Start met een lege meeting" }).click();
      await page.getByRole("region", { name: "Proefomgeving" }).waitFor();
      // De inkomende app is al zichtbaar terwijl het welkomstscherm nog uitfade.
      await page.getByRole("button", { name: "Start met een lege meeting" }).waitFor({ state: "detached" });
    },
  },
  {
    name: "variant A: notities gekozen, +-menu open",
    path: "/probeer",
    setup: async (page) => {
      await page.getByRole("button", { name: /^Gebruik notities van een vorig overleg/ }).click();
      await page.getByRole("button", { name: "Kies bestand" }).waitFor();
      await page.getByRole("button", { name: "Toevoegen: notities, bestand of agenda" }).click();
      await page.getByRole("menu", { name: "Toevoegen" }).waitFor();
    },
  },
  {
    name: "variant A: voorstel van het overleg",
    path: "/probeer",
    setup: async (page) => {
      await page
        .getByRole("textbox", { name: "Bericht aan de assistent" })
        .fill(
          "Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim: lopende orders, problemen en planning.",
        );
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Klopt" }).waitFor();
    },
  },
  {
    name: "variant A: acties en bewaar-modal",
    path: "/probeer",
    setup: async (page) => {
      await page
        .getByRole("textbox", { name: "Bericht aan de assistent" })
        .fill("Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim: orders en planning");
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Klopt" }).click();
      await page.getByRole("button", { name: "Inspreken" }).first().click();
      await page.getByRole("button", { name: "Zet ze op de agenda" }).click();
      await page.getByRole("button", { name: "Alleen bewaren" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  { name: "website B", path: "/b" },
  { name: "voorbeeld B", path: "/b/voorbeeld" },
  { name: "reis", path: "/b/reis" },
  { name: "mail", path: "/b/mail" },
  {
    name: "flow 3: voorstellen uit notities",
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
    name: "flow 3: overzicht",
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
    // Laat navigatie-assets en sluitende tooltip/popover-animaties afronden vóór de contrastmeting.
    await page.mouse.move(0, 0);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-slot="tooltip-content"][data-state="closed"]')).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}
