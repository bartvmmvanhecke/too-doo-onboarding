import { expect, test } from "@playwright/test";
import { expectToast, fillAction, setDemo, trackErrors } from "./helpers";

test.describe("Hoofdflow: Microsoft slaagt, reeksen gevonden", () => {
  test("hero → account → lijst → acties → overleg, met alle knoppen in het overleg", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Start gratis met Microsoft" }).click();
    await expect(page).toHaveURL(/\/prototype$/);
    await page.getByRole("button", { name: /Start flow 1:/ }).click();
    await expect(page).toHaveURL(/\/start$/);
    await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    await expect(page).toHaveURL(/\/overleg$/);

    await page.getByRole("button", { name: "Toon mijn overleggen uit Outlook" }).click();
    await expect(page.getByRole("group", { name: "Terugkerend in je Outlook-agenda" })).toBeVisible();
    // Rechterpaneel volgt de keuze.
    await page.getByText("Managementoverleg", { exact: true }).click();
    const panel = page.getByRole("complementary", { name: "Voorbeeld van je overleg" });
    await expect(panel.getByText("Managementoverleg")).toBeVisible();
    await expect(panel.getByText(/Om de 2 weken op dinsdag · 14:00–15:30 · volgende: di \d+ \w+/)).toBeVisible();
    await expect(panel.getByText("+0 uit je agenda")).toHaveCount(0);
    await page.getByRole("link", { name: "Volgende" }).click();

    await expect(page).toHaveURL(/\/acties$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Wat moet er nog gebeuren sinds het vorige managementoverleg?",
    );
    await fillAction(page, 1, "Offerte nieuwe plooibank opvragen", { type: "jan", pick: "Jan Peeters" }, "vr 17 okt");
    await fillAction(page, 2, "Instructie heftruck bijwerken", { type: "sofie@", pick: "Sofie De Smet" });
    await fillAction(page, 3, "Leverancier bellen", { type: "piet@leverancier.be", pick: "Iemand anders toevoegen" });
    const agenda = page.getByRole("complementary", { name: "Agenda van je volgende overleg" });
    await expect(agenda.getByText("Offerte nieuwe plooibank opvragen")).toBeVisible();
    await expect(agenda.getByText("vr 17 okt")).toBeVisible();
    await expect(agenda.getByText("Volgende actie verschijnt hier…")).toHaveCount(0);

    // Herladen breekt de flow niet.
    await page.reload();
    await expect(page.getByLabel("Actie 2", { exact: true })).toHaveValue("Instructie heftruck bijwerken");

    await page.getByRole("button", { name: "Toon mijn overleg" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/managementoverleg$/);
    await expect(
      page.getByRole("status").filter({
        hasText: "Je managementoverleg staat klaar. Je 3 openstaande acties komen dinsdag vanzelf aan bod.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Managementoverleg");
    await expect(page.getByRole("main").getByText(/· 4 deelnemers$/)).toBeVisible();
    for (const what of ["Offerte nieuwe plooibank opvragen", "Instructie heftruck bijwerken", "Leverancier bellen"]) {
      await expect(page.getByRole("checkbox", { name: `${what} afvinken` })).toBeVisible();
    }
    await expect(page.getByText("geen deadline").first()).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /1 van 4/ })).toBeVisible();

    // Afvinken
    await page.getByRole("checkbox", { name: "Instructie heftruck bijwerken afvinken" }).check();
    await expect(page.getByRole("checkbox", { name: "Instructie heftruck bijwerken afvinken" })).toBeChecked();

    // Agendapunt via Enter
    await page.getByLabel("Agendapunt toevoegen").fill("Planning week 42");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Planning week 42")).toBeVisible();

    // + Actie
    await page.getByRole("button", { name: "Actie", exact: true }).click();
    await page.getByLabel("Actie 4", { exact: true }).fill("Nieuwe actie uit overleg");
    await page.keyboard.press("Enter");
    await expectToast(page, "Actie toegevoegd");
    await expect(page.getByRole("checkbox", { name: "Nieuwe actie uit overleg afvinken" })).toBeVisible();

    // Start overleg
    await page.getByRole("button", { name: "Start overleg" }).click();
    await expectToast(page, "Overleg gestart");
    await expect(page.getByRole("progressbar", { name: /2 van 4/ })).toBeVisible();

    // Uitnodigen met bevestiging
    await page.getByRole("button", { name: /Sofie en Piet uitnodigen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Collega's uitnodigen" });
    await expect(dialog.getByText("piet@leverancier.be")).toBeVisible();
    await dialog.getByRole("button", { name: "Uitnodigen" }).click();
    await expectToast(page, /Uitnodiging verstuurd naar Sofie De Smet en Piet/);
    await expect(page.getByRole("progressbar", { name: /3 van 4/ })).toBeVisible();

    // Modal andere overlegmomenten: opent niet vanzelf, wel via checklist
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: /Je andere vaste overlegmomenten toevoegen/ }).click();
    const modal = page.getByRole("dialog", { name: "Je andere vaste overlegmomenten" });
    await expect(modal.getByText("Managementoverleg")).toHaveCount(0); // al toegevoegd
    await expect(modal.getByRole("checkbox", { name: /Productieoverleg/ })).toBeChecked();
    await modal.getByRole("checkbox", { name: /Weekstart sales/ }).check();
    await modal.getByLabel("Naam nieuw overleg").fill("Kwaliteitsoverleg");
    await modal.getByLabel("Ritme Kwaliteitsoverleg").selectOption("monthly");
    await modal.getByLabel("Naam overleg 1").press("Enter");
    await expect(modal.getByLabel("Naam nieuw overleg")).toBeFocused();
    await modal.getByRole("button", { name: "+ Raad van bestuur" }).click();
    await modal.getByRole("button", { name: "5 overleggen toevoegen" }).click();
    await expectToast(page, "5 overleggen toegevoegd");
    await expect(page.getByRole("progressbar", { name: /4 van 4/ })).toBeVisible();
    const menu = page.getByRole("navigation", { name: "Hoofdmenu" });
    await expect(menu.getByRole("link", { name: "Raad van bestuur" })).toBeVisible();
    await menu.getByRole("link", { name: "Kwaliteitsoverleg" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/kwaliteitsoverleg$/);
    await expect(
      page
        .getByRole("main")
        .locator("p", { hasText: /^Maandelijks$/ })
        .filter({ visible: true }),
    ).toBeVisible();

    // "+ Overleggen toevoegen" in de zijbalk opent dezelfde modal
    await menu.getByRole("button", { name: "Overleggen toevoegen" }).click();
    await expect(page.getByRole("dialog", { name: "Je andere vaste overlegmomenten" })).toBeVisible();
    await page.getByRole("button", { name: "Later" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Zijbalk-items buiten het prototype
    await menu.getByRole("link", { name: "Dashboard" }).click();
    await expectToast(page, "Niet beschikbaar in dit prototype");
    // "← Alle vergaderingen" en "Inloggen" landen in het eerste overleg
    await page.getByRole("link", { name: "← Alle vergaderingen" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/managementoverleg$/);
    errors.assertNone();
  });

  test("wie al toestemming gaf, ziet meteen de lijst", async ({ page }) => {
    await page.goto("/overleg");
    await page.getByRole("button", { name: "Toon mijn overleggen uit Outlook" }).click();
    await expect(page.getByRole("group", { name: "Terugkerend in je Outlook-agenda" })).toBeVisible();
    await page.goto("/");
    await page.goto("/overleg");
    await expect(page.getByRole("group", { name: "Terugkerend in je Outlook-agenda" })).toBeVisible();
    await page.getByRole("link", { name: "Staat er niet tussen? Vul het zelf in" }).click();
    await expect(page).toHaveURL(/\/overleg\/zelf$/);
    await expect(page.getByLabel("Naam van het overleg")).toHaveValue("");
  });
});

test.describe("Account", () => {
  test("werk-e-mail: toestand B, Wijzig, bedrijfsnaam en wachtwoordregel", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/start");
    await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
    await expect(page.getByText("Vul een geldig e-mailadres in.")).toBeVisible();
    await page.getByLabel("Werk-e-mail").fill("jan.peeters@metaalwerken.be");
    await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
    await expect(page.getByRole("button", { name: "Doorgaan met Microsoft" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Maak je account aan" })).toBeVisible();
    await expect(page.getByLabel("Voornaam")).toHaveValue("Jan");
    await expect(page.getByText("Je bedrijf (Metaalwerken) vullen we in op basis van je e-mail.")).toBeVisible();
    await page.getByRole("button", { name: "Wijzig werk-e-mail" }).click();
    await expect(page.getByRole("button", { name: "Doorgaan met Microsoft" })).toBeVisible();
    await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
    await page.getByLabel("Wachtwoord").fill("kort");
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await expect(page.getByText("Je wachtwoord heeft minstens 8 tekens nodig.")).toBeVisible();
    await page.getByLabel("Wachtwoord").fill("lang-genoeg");
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await expect(page).toHaveURL(/\/overleg$/);
    errors.assertNone();
  });

  test("Google → /overleg", async ({ page }) => {
    await page.goto("/start");
    await page.getByRole("button", { name: "Doorgaan met Google" }).click();
    await expect(page).toHaveURL(/\/overleg$/);
  });

  test("taalkeuze en voorwaarden zijn geen doodlopende links", async ({ page }) => {
    await page.goto("/start");
    await page.getByLabel("Taal").selectOption("fr");
    await expectToast(page, "Niet beschikbaar in dit prototype");
    await expect(page.getByLabel("Taal")).toHaveValue("nl");
  });
});

test.describe("Terugvalpaden", () => {
  test("Microsoft geblokkeerd → werk-e-mail → zelf invullen zonder Outlook → overleg", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/start");
    await setDemo(page, { login: "Bedrijf blokkeert" });
    await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    await expect(page).toHaveURL(/\/start\/geblokkeerd$/);
    await expect(page.getByText("Je bedrijf laat inloggen met Microsoft voor nieuwe apps niet toe")).toBeVisible();
    await expect(page.getByLabel("Werk-e-mail")).toHaveValue("jan.peeters@metaalwerken.be");

    await page.getByText("Liever toch via Microsoft? Vraag het aan je IT-beheerder").click();
    await page.getByRole("button", { name: "Mail de handleiding naar IT" }).click();
    await page.getByLabel("E-mail van je IT-beheerder").fill("it@metaalwerken.be");
    await page.getByRole("button", { name: "Stuur handleiding" }).click();
    await expect(page.getByText("Verstuurd naar it@metaalwerken.be.")).toBeVisible();

    await page.getByLabel("Je naam").fill("Jan Peeters");
    await page.getByLabel("Kies een wachtwoord").fill("geheim-wachtwoord");
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await expect(page).toHaveURL(/\/overleg\/zelf$/);
    await expect(page.getByRole("link", { name: "Toch kiezen uit je Outlook-agenda" })).toHaveCount(0);

    // Outlook wordt niet meer aangeboden
    await page.goto("/overleg");
    await expect(page).toHaveURL(/\/overleg\/zelf$/);

    await page.getByRole("button", { name: "Veiligheidsoverleg" }).click();
    await expect(page.getByLabel("Naam van het overleg")).toHaveValue("Veiligheidsoverleg");
    await page.getByLabel("Naam van het overleg").fill("Veiligheidsoverleg hal 2");
    await expect(page.getByRole("button", { name: "Veiligheidsoverleg" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("combobox", { name: "Uur" }).fill("1030");
    await page.getByRole("combobox", { name: "Uur" }).press("Tab");
    await page.getByText("30 min", { exact: true }).click();
    await page.getByText("Om de 2 weken", { exact: true }).click();
    const preview = page.getByRole("complementary", { name: "Voorbeeld van je overleg" });
    await expect(preview.getByText("Veiligheidsoverleg hal 2")).toBeVisible();
    await expect(preview.getByText(/Om de 2 weken op maandag · 10:30–11:00/)).toBeVisible();
    await expect(
      preview.getByText('Het overlegtype ("Veiligheid") leiden we af uit de naam. Je kunt het later wijzigen.'),
    ).toBeVisible();
    await page.getByRole("button", { name: "Volgende" }).click();
    await expect(page).toHaveURL(/\/acties$/);
    await page.getByRole("button", { name: "Sla over, doe ik tijdens het overleg" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/veiligheidsoverleg-hal-2$/);
    await expect(
      page.getByText("Je veiligheidsoverleg hal 2 staat klaar. Noteer je acties tijdens het overleg."),
    ).toBeVisible();
    await expect(page.getByRole("main").getByText(/^Om de 2 weken op maandag · 10:30–11:00/)).toBeVisible();

    await page.getByRole("button", { name: /Je andere vaste overlegmomenten toevoegen/ }).click();
    const modal = page.getByRole("dialog", { name: "Je andere vaste overlegmomenten" });
    await expect(modal.getByText("Gevonden in je Outlook-agenda")).toHaveCount(0);
    await expect(modal.getByRole("button", { name: "Koppel Outlook" })).toHaveCount(0);
    errors.assertNone();
  });

  test("geen reeksen → losse afspraak voorgevuld in 2b", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/overleg");
    await setDemo(page, { calendar: "Geen reeksen" });
    await page.getByRole("button", { name: "Toon mijn overleggen uit Outlook" }).click();
    await expect(page.getByText("Je agenda is gekoppeld, maar we vonden geen vaste overleggen")).toBeVisible();
    await expect(page.getByRole("link", { name: /Vul je overleg zelf in/ })).toBeVisible();
    await page.getByRole("link", { name: /MT-vergadering/ }).click();
    await expect(page).toHaveURL(/\/overleg\/zelf$/);
    await expect(page.getByLabel("Naam van het overleg")).toHaveValue("MT-vergadering");
    await expect(page.getByRole("combobox", { name: "Uur" })).toHaveValue("14:00");
    await expect(page.getByRole("radio", { name: "1u30" })).toBeChecked();
    await expect(page.getByLabel("Volgende keer")).toHaveValue(/^di \d+ \w+$/);
    const preview = page.getByRole("complementary", { name: "Voorbeeld van je overleg" });
    await expect(preview.getByRole("img", { name: "Sofie De Smet" })).toBeVisible();
    await page.getByRole("button", { name: "Volgende" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Wat moet er nog gebeuren sinds het vorige MT-vergadering?",
    );
    await page.getByRole("combobox", { name: "Eigenaar actie 1" }).click();
    await expect(page.getByRole("option", { name: /Lotte Maes/ })).toBeVisible();
    await page.getByLabel("Actie 1", { exact: true }).fill("Budget 2026 voorbereiden");
    await page.getByRole("button", { name: "Toon mijn overleg" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/mt-vergadering$/);
    await expect(
      page.getByText("Je MT-vergadering staat klaar. Je 1 openstaande actie komt dinsdag vanzelf aan bod."),
    ).toBeVisible();
    await expect(page.getByRole("main").getByText(/· 4 deelnemers$/)).toBeVisible();
    errors.assertNone();
  });

  test("IT-goedkeuring nodig → uitleg sturen → zelf invullen → overleg", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/overleg");
    await setDemo(page, { calendar: "IT-goedkeuring nodig" });
    await page.getByRole("button", { name: "Toon mijn overleggen uit Outlook" }).click();
    await expect(page).toHaveURL(/\/overleg\/goedkeuring$/);
    await expect(page.getByText("Bedankt, Jan")).toBeVisible();
    await page.getByRole("button", { name: "Stuur uitleg" }).click();
    await expect(page.getByText("Vul het e-mailadres van je IT-beheerder in.")).toBeVisible();
    await page.getByLabel("E-mail van je IT-beheerder (optioneel)").fill("it@metaalwerken.be");
    await page.getByRole("button", { name: "Stuur uitleg" }).click();
    await expect(page.getByText("Verstuurd naar it@metaalwerken.be.")).toBeVisible();
    await page.getByRole("link", { name: /Vul je overleg zelf in/ }).click();
    await expect(page).toHaveURL(/\/overleg\/zelf$/);
    await page.getByRole("button", { name: "Productieoverleg" }).click();
    await page.getByRole("button", { name: "Volgende" }).click();
    await page.getByRole("button", { name: "Toon mijn overleg" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/productieoverleg$/);
    errors.assertNone();
  });

  test("geannuleerd → blijft in toestand 1 met rustige melding", async ({ page }) => {
    await page.goto("/overleg");
    await setDemo(page, { calendar: "Geannuleerd" });
    await page.getByRole("button", { name: "Toon mijn overleggen uit Outlook" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Geen probleem, vul het zelf in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Toon mijn overleggen uit Outlook" })).toBeVisible();
    await page.getByRole("link", { name: "vul het zelf in", exact: true }).click();
    await expect(page).toHaveURL(/\/overleg\/zelf$/);
  });

  test("zelf invullen vraagt een naam", async ({ page }) => {
    await page.goto("/overleg/zelf");
    await page.getByRole("button", { name: "Volgende" }).click();
    await expect(page.getByText("Geef je overleg een naam.")).toBeVisible();
    await expect(page.getByLabel("Naam van het overleg")).toBeFocused();
  });
});

test.describe("Later en lege toestand", () => {
  test("Ik doe dit later → lege toestand → snel aanmaken", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/overleg");
    await page.getByRole("link", { name: "Ik doe dit later" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Zet je eerste vaste overleg klaar" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /0 van 4/ })).toBeVisible();
    await page.getByRole("button", { name: /Je eerste overleg klaarzetten/ }).click();
    await expect(page.getByLabel("Naam", { exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Teamoverleg" }).click();
    await page.getByLabel("Wanneer").fill("blabla");
    await page.getByRole("button", { name: "Maak overleg aan" }).click();
    await expect(page.getByText("Typ een dag en uur, bijv. ma 08:00.")).toBeVisible();
    await page.getByLabel("Wanneer").fill("do 9u30");
    await page.getByLabel("Hoe vaak").selectOption("biweekly");
    await page.getByRole("button", { name: "Maak overleg aan" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/teamoverleg$/);
    await expect(page.getByText(/Om de 2 weken op donderdag · 09:30–10:30 · volgende: do \d+ \w+/)).toBeVisible();
    // /app met een overleg toont dat overleg
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app\/overleg\/teamoverleg$/);
    errors.assertNone();
  });

  for (const [outcome, expected] of [
    ["Reeksen gevonden", /\/overleg$/],
    ["Geen reeksen", /\/overleg$/],
    ["IT-goedkeuring nodig", /\/overleg\/goedkeuring$/],
  ] as const) {
    test(`Koppel Outlook in /app: ${outcome}`, async ({ page }) => {
      await page.goto("/app");
      await setDemo(page, { calendar: outcome });
      await page.getByRole("button", { name: "Koppel Outlook" }).click();
      await expect(page).toHaveURL(expected);
    });
  }

  test("Koppel Outlook in /app: geannuleerd blijft op /app", async ({ page }) => {
    await page.goto("/app");
    await setDemo(page, { calendar: "Geannuleerd" });
    await page.getByRole("button", { name: "Koppel Outlook" }).click();
    await expectToast(page, "Geen probleem, vul het zelf in");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("Koppel Outlook in de modal, alle uitkomsten", async ({ page }) => {
    await page.goto("/app");
    await page.getByLabel("Naam", { exact: true }).fill("Productieoverleg");
    await page.getByRole("button", { name: "Maak overleg aan" }).click();
    const open = async () => {
      await page.getByRole("button", { name: /Je andere vaste overlegmomenten toevoegen/ }).click();
      return page.getByRole("dialog", { name: "Je andere vaste overlegmomenten" });
    };
    for (const [outcome, check] of [
      ["Geannuleerd", "Geen probleem, vul het zelf in."],
      ["IT-goedkeuring nodig", "Je IT-beheerder moet de agendakoppeling eerst goedkeuren"],
    ] as const) {
      await setDemo(page, { calendar: outcome });
      const modal = await open();
      await modal.getByRole("button", { name: "Koppel Outlook" }).click();
      await expect(modal.getByText(check)).toBeVisible();
      await modal.getByRole("button", { name: "Later" }).click();
    }
    await setDemo(page, { calendar: "Reeksen gevonden" });
    const modal = await open();
    await modal.getByRole("button", { name: "Koppel Outlook" }).click();
    // Productieoverleg staat al in too-doo en wordt niet opnieuw voorgesteld
    await expect(modal.getByRole("checkbox", { name: /Managementoverleg/ })).toBeChecked();
    await expect(modal.getByRole("checkbox", { name: /Productieoverleg/ })).toHaveCount(0);
  });
});

test.describe("Voorbeelddata", () => {
  test("rondleiding van 3 stappen en terug naar eigen overleg", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Bekijk de rondleiding · 2 min" }).click();
    await expect(page).toHaveURL(/\/voorbeeld$/);
    const tour = page.getByRole("complementary", { name: "Rondleiding" });
    await expect(tour.getByText("Wat je hier ziet · 1 van 3")).toBeVisible();
    await tour.getByRole("button", { name: "Volgende" }).click();
    await expect(tour.getByText("Lopende zaken")).toBeVisible();
    await tour.getByRole("button", { name: "Volgende" }).click();
    await expect(tour.getByText("Eén plek voor alle acties")).toBeVisible();
    await tour.getByRole("button", { name: "Sluiten" }).click();
    await expect(tour).toHaveCount(0);
    await page.getByRole("checkbox", { name: "Instructie heftruck bijwerken afvinken" }).check();
    await page.getByRole("link", { name: "Voeg je eigen overleg toe" }).click();
    await expect(page).toHaveURL(/\/overleg$/);
    // Niets bewaard
    await page.goto("/voorbeeld");
    await expect(page.getByRole("checkbox", { name: "Instructie heftruck bijwerken afvinken" })).not.toBeChecked();
    errors.assertNone();
  });

  for (const from of ["/overleg", "/app"]) {
    test(`voorbeeld bereikbaar vanuit ${from}`, async ({ page }) => {
      await page.goto(from);
      await page.getByRole("link", { name: /Eerst rondkijken met voorbeelddata|Bekijk eerst een voorbeeld/ }).click();
      await expect(page).toHaveURL(/\/voorbeeld$/);
    });
  }
});

test.describe("Robuustheid", () => {
  test("rechtstreeks naar /acties zonder overleg → /overleg", async ({ page }) => {
    await page.goto("/acties");
    await expect(page).toHaveURL(/\/overleg$/);
  });

  test("onbekend overleg → /app", async ({ page }) => {
    await page.goto("/app/overleg/bestaat-niet");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("Reset demo wist alles", async ({ page }) => {
    await page.goto("/app");
    await page.getByLabel("Naam", { exact: true }).fill("Teamoverleg");
    await page.getByRole("button", { name: "Maak overleg aan" }).click();
    await expect(page).toHaveURL(/teamoverleg$/);
    await page.getByRole("button", { name: "Demo", exact: true }).click();
    await page.getByRole("button", { name: "Reset demo" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Zet je eerste vaste overleg klaar" })).toBeVisible();
  });

  test("uurveld: typen, ongeldig, − en +, en lijst", async ({ page }) => {
    await page.goto("/overleg/zelf");
    const uur = page.getByRole("combobox", { name: "Uur" });
    for (const [typed, expected] of [
      ["8u", "08:00"],
      ["0800", "08:00"],
      ["8:30", "08:30"],
      ["8.30", "08:30"],
      ["abc", "08:30"],
      ["25:00", "08:30"],
    ]) {
      await uur.fill(typed);
      await uur.press("Tab");
      await expect(uur).toHaveValue(expected);
    }
    await page.getByRole("button", { name: "15 minuten later" }).click();
    await expect(uur).toHaveValue("08:45");
    await page.getByRole("button", { name: "15 minuten vroeger" }).click();
    await page.getByRole("button", { name: "15 minuten vroeger" }).click();
    await expect(uur).toHaveValue("08:15");
    await uur.click();
    await expect(page.getByRole("listbox", { name: "Uren" })).toBeVisible();
    await expect(page.getByRole("option", { name: "06:00" })).toBeAttached();
    await expect(page.getByRole("option", { name: "20:00" })).toBeAttached();
    await expect(page.getByRole("option")).toHaveCount(57);
    await page.getByRole("option", { name: "09:45" }).click();
    await expect(uur).toHaveValue("09:45");
    // Toetsenbord
    await uur.focus();
    await uur.press("ArrowDown"); // opent de lijst op het huidige uur
    await uur.press("ArrowDown");
    await uur.press("Enter");
    await expect(uur).toHaveValue("10:00");
    // Datum: ongeldige invoer zet de vorige waarde terug
    const dag = page.getByLabel("Volgende keer");
    const before = await dag.inputValue();
    await dag.fill("32/13");
    await dag.press("Tab");
    await expect(dag).toHaveValue(before);
    await dag.fill("13/10");
    await dag.press("Tab");
    await expect(dag).toHaveValue(/^\w\w 13 okt$/);
  });
});
