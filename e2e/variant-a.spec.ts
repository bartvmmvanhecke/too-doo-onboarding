import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { expectToast, overlapsWithNav, setDemo, trackErrors } from "./helpers";

/** Variant A · Lazy Registration (SPEC-LAZY.md §9): proberen zonder account, account bij bewaren. */

const SENTENCE =
  "Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim: lopende orders, problemen en planning.";

const NOTES = `Productie 5/10
- plooibank: Jan vraagt nieuwe offerte, liefst voor vrijdag
- heftruck: instructie aanpassen na incident, Sofie
- staal leverancier blijft te laat leveren, opnieuw bellen
- planning wk 42 volgende keer beslissen`;

const assistant = (page: Page) => page.getByRole("complementary", { name: "Assistent" });
const log = (page: Page) => page.getByRole("log", { name: "Gesprek met de assistent" });

async function say(page: Page, text: string) {
  const box = assistant(page).getByRole("textbox");
  await box.fill(text);
  await box.press("Enter");
}

/** Wacht tot de assistent geantwoord heeft (typ-indicator weg) en het bericht er staat. */
async function expectAssistant(page: Page, text: string | RegExp) {
  await expect(log(page).getByText(text).last()).toBeVisible();
}

/** Stap 1 tot 3 via de ingang "Vertel het me" (C1–C4). */
async function buildMeeting(page: Page) {
  await assistant(page)
    .getByRole("button", { name: /Vertel het me/ })
    .click();
  await expectAssistant(page, "Waarover gaat je volgende overleg? Eén zin is genoeg.");
  await say(page, SENTENCE);
  await expectAssistant(page, /Begrepen\. Links staat een voorstel van agenda/);
  const fields = page.getByRole("region", { name: "Overleg in opbouw" });
  await expect(fields.getByRole("button", { name: /^Naam: Productieoverleg/ })).toBeVisible();
  await expect(fields.getByRole("button", { name: /^Wanneer: Elke maandag · 08:00–09:00/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lopende zaken" })).toContainText("Knelpunten en beslissingen");
  await expect(assistant(page).getByText("Jan, Sofie, Pieter, Karim en jij")).toBeVisible();
  await expect(assistant(page).getByText("1 van 3")).toBeVisible();

  await assistant(page).getByRole("button", { name: "Klopt" }).click();
  await expectAssistant(page, /Wat werd er vorige keer afgesproken/);
  await expect(assistant(page).getByText("2 van 3")).toBeVisible();
  await say(page, NOTES);
  await expectAssistant(
    page,
    "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
  );
  const actions = page.getByRole("region", { name: "Openstaande acties" });
  await expect(actions).toContainText("3 voorstellen · vink aan wat klopt");
  await expect(actions.getByRole("button", { name: "Wie doet Leverancier staal opnieuw bellen?" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lopende zaken" })).toContainText("beslissing nodig");
  await expectAssistant(page, "Wie gaat leverancier staal opnieuw bellen?");
  await say(page, "Karim belt, tegen woensdag");
  await expectAssistant(page, /Genoteerd: Karim, tegen wo/);
  await expect(
    actions.getByRole("button", { name: /Eigenaar van Leverancier staal opnieuw bellen: Karim/ }),
  ).toBeVisible();

  await assistant(page).getByRole("button", { name: "Zet ze op de agenda" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Je productieoverleg van maandag staat klaar." }),
  ).toBeVisible();
  await expect(page.getByText("Concept", { exact: true })).toHaveCount(0);
  await expect(assistant(page).getByText("3 van 3")).toBeVisible();
  await expectAssistant(page, /Zal ik Jan, Sofie en Karim hun actie nu al mailen\?/);
  await expect(assistant(page).getByRole("group", { name: "Voorbeeldmail voor Jan" })).toContainText(
    "Jan heeft geen account nodig.",
  );
}

test.describe("Variant A · Lazy Registration", () => {
  test("volledig via 'Vertel het me': website → proefomgeving → bewaren met Google → mails → Outlook", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    const events: string[] = [];
    page.on("console", (m) => {
      if (m.text().startsWith("[track]")) events.push(m.text().split(" ")[1]);
    });
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "Probeer Too-doo gratis" }).click();
    await expect(page).toHaveURL(/\/probeer$/);
    await expect(page.getByRole("heading", { level: 1, name: "Je eerste overleg" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Proefomgeving" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prototype-menu" })).toBeVisible();
    expect(await overlapsWithNav(page)).toEqual([]);

    await buildMeeting(page);
    expect(await overlapsWithNav(page)).toEqual([]);

    // Bewaren: het account komt pas bij versturen.
    await assistant(page).getByRole("button", { name: "Ja, stuur ze" }).click();
    const dialog = page.getByRole("dialog", { name: "Bewaar je overleg. Het blijft precies zoals het is." });
    await expect(dialog).toContainText("Dan versturen we de mails in jouw naam");
    const summary = dialog.getByRole("complementary", { name: "Wat we bewaren" });
    await expect(summary).toContainText("Productieoverleg");
    await expect(summary).toContainText("3 acties met eigenaar");
    await expect(summary).toContainText("1 beslissing op de agenda");
    await expect(summary).toContainText("5 deelnemers");
    await expect(summary).toContainText("Daarna meteen verstuurd");
    await expect(dialog.getByLabel(/wachtwoord/i)).toHaveCount(0);
    await dialog.getByRole("button", { name: "Doorgaan met Google" }).click();

    // Na bewaren (C6): alles staat in de app.
    await expect(page).toHaveURL(/\/app\/overleg\/productieoverleg\?welkom=1$/);
    await expect(
      page.getByRole("status").filter({ hasText: "Bewaard, Tom. Je productieoverleg staat in je account." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();
    await expect(page.getByText("Nieuwe offerte plooibank opvragen")).toBeVisible();
    await expect(page.getByText("Leverancier staal opnieuw bellen")).toBeVisible();
    await expect(page.getByText("Planning week 42")).toBeVisible();
    await expect(page.getByText("Lopende orders")).toBeVisible();

    const panel = assistant(page);
    await expect(panel.getByText("Bewaard. Nog de e-mailadressen van je collega's:")).toBeVisible();
    await expect(panel.getByLabel("Jan")).toHaveValue("jan@metaalwerken.be");
    await expect(panel.getByLabel("Karim")).toHaveValue("karim@metaalwerken.be");
    await panel.getByLabel("Karim").fill("");
    await panel.getByRole("button", { name: "Verstuur 2 mails, Karim later" }).click();
    await expectToast(page, "2 mails verstuurd");
    await expect(page.getByText("mail verstuurd", { exact: true })).toHaveCount(2);
    await expect(page.getByText("e-mailadres ontbreekt", { exact: true })).toHaveCount(1);
    await expect(panel.getByText(/Verstuurd naar Jan en Sofie\./)).toBeVisible();
    const checklist = page.getByRole("complementary", { name: "Aan de slag" });
    await expect(checklist).toContainText("2 van 4");

    await panel.getByRole("button", { name: "Haal uit Outlook" }).click();
    const more = page.getByRole("dialog", { name: "Je andere vaste overlegmomenten" });
    await expect(more).toBeVisible();
    if (await more.getByRole("button", { name: "Koppel Outlook" }).isVisible())
      await more.getByRole("button", { name: "Koppel Outlook" }).click();
    await expect(more.getByRole("checkbox", { name: /Managementoverleg/ })).toBeChecked();
    await more.getByRole("button", { name: /overleggen toevoegen/ }).click();
    await expect(checklist).toContainText("3 van 4");

    for (const e of [
      "cta_clicked",
      "trial_app_opened",
      "assistant_entry_chosen",
      "assistant_message_sent",
      "meeting_parsed",
      "meeting_confirmed",
      "actions_extracted",
      "first_action_with_owner",
      "meeting_ready",
      "save_prompt_shown",
      "signup_method_selected",
      "sso_result",
      "signup_completed",
      "owner_mails_sent",
    ]) {
      expect(events, e).toContain(e);
    }
    errors.assertNone();
  });

  test("via notities: inspreken, eigenaars als vraag, naam en tijdstip gevraagd, bewaren met e-mail en code", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await assistant(page).getByRole("button", { name: "Of plak de tekst" }).click();
    await expectAssistant(page, /Wat werd er vorige keer afgesproken/);
    await assistant(page).getByRole("button", { name: "Inspreken" }).click();
    await expect(assistant(page).getByRole("button", { name: "Luistert…" })).toBeVisible();
    await expectAssistant(
      page,
      "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
    );

    // Geen deelnemers: niemand wordt verzonnen, elke eigenaar wordt een vraag.
    await expectAssistant(page, "Wie gaat nieuwe offerte plooibank opvragen?");
    await say(page, "Jan");
    await expectAssistant(page, "Genoteerd: Jan.");
    await assistant(page)
      .getByRole("group", { name: "Eigenaar kiezen" })
      .getByRole("button", { name: "Ikzelf" })
      .click();
    await assistant(page)
      .getByRole("group", { name: "Eigenaar kiezen" })
      .getByRole("button", { name: "Later beslissen" })
      .click();
    await assistant(page).getByRole("button", { name: "Zet ze op de agenda" }).click();

    await expectAssistant(page, "Hoe heet dit overleg? Bijvoorbeeld Productieoverleg.");
    await say(page, "Productieoverleg");
    await expectAssistant(page, "Wanneer gaat het door?");
    await assistant(page).getByRole("group", { name: "Dag kiezen" }).getByRole("button", { name: "ma" }).click();
    await expectAssistant(page, "Hoe laat begint het?");
    await assistant(page).getByRole("group", { name: "Uur kiezen" }).getByRole("button", { name: "08:00" }).click();
    await expectAssistant(page, "Hoe vaak komt het samen?");
    await assistant(page).getByRole("group", { name: "Hoe vaak" }).getByRole("button", { name: "Elke week" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Je productieoverleg van maandag staat klaar." }),
    ).toBeVisible();

    await assistant(page).getByRole("button", { name: "Alleen bewaren" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Werk-e-mail").fill("tom.claes@metaalwerken.be");
    await dialog.getByRole("button", { name: "Stuur me een code" }).click();
    await expect(dialog.getByRole("group", { name: "Code van 6 cijfers" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Bewaar mijn overleg" })).toBeDisabled();
    // Plakken van 6 cijfers vult alle vakjes.
    await dialog.getByLabel("Cijfer 1 van 6").focus();
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.setData("text/plain", "482913");
      document.activeElement?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
    });
    await expect(dialog.getByLabel("Cijfer 6 van 6")).toHaveValue("3");
    await dialog.getByRole("button", { name: "Bewaar mijn overleg" }).click();

    await expect(page).toHaveURL(/\/app\/overleg\/productieoverleg\?welkom=1$/);
    await expect(page.getByRole("status").filter({ hasText: "Bewaard, Tom." })).toBeVisible();
    await expect(page.getByText("Nieuwe offerte plooibank opvragen")).toBeVisible();
    await expect(assistant(page).getByText(/Wil je ook je andere vaste overleggen opvolgen\?/)).toBeVisible();
    await assistant(page).getByRole("button", { name: "Ik zeg ze zelf" }).click();
    await say(page, "teamoverleg elke dinsdag om 9u met Els");
    await expectToast(page, "Teamoverleg toegevoegd");
    // De proefomgeving is leeg na bewaren.
    const guest = await page.evaluate(() => localStorage.getItem("toodoo-guest"));
    expect(guest === null || JSON.parse(guest).state.step === 1).toBe(true);
    errors.assertNone();
  });

  test("Microsoft geblokkeerd valt terug op e-mail met code", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await setDemo(page, { login: "Bedrijf blokkeert" });
    await say(page, "teamoverleg met Els en Bram");
    await expectAssistant(page, /Wanneer gaat het door\?/);
    await assistant(page).getByRole("group", { name: "Dag kiezen" }).getByRole("button", { name: "di" }).click();
    await assistant(page).getByRole("group", { name: "Uur kiezen" }).getByRole("button", { name: "09:00" }).click();
    await assistant(page)
      .getByRole("group", { name: "Hoe vaak" })
      .getByRole("button", { name: "Om de 2 weken" })
      .click();
    await expect(assistant(page).getByText("Els, Bram en jij")).toBeVisible();
    await assistant(page).getByRole("button", { name: "Klopt" }).click();
    await assistant(page).getByRole("button", { name: "Ik heb niets openstaan" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Je teamoverleg van dinsdag staat klaar." })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Hoofdmenu" })
      .getByRole("button", { name: "Bewaar je overleg" })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    await expect(
      dialog.getByText("Inloggen met Microsoft lukt niet bij je bedrijf. Gebruik je werk-e-mail."),
    ).toBeVisible();
    await expect(dialog.getByLabel("Werk-e-mail")).toBeFocused();
    await dialog.getByLabel("Werk-e-mail").fill("els.janssens@bouw-peeters.be");
    await dialog.getByRole("button", { name: "Stuur me een code" }).click();
    for (const [i, d] of [..."123456"].entries()) await dialog.getByLabel(`Cijfer ${i + 1} van 6`).fill(d);
    await dialog.getByRole("button", { name: "Bewaar mijn overleg" }).click();

    await expect(page).toHaveURL(/\/app\/overleg\/teamoverleg\?welkom=1$/);
    await expect(
      page.getByRole("status").filter({ hasText: "Bewaard, Els. Je teamoverleg staat in je account." }),
    ).toBeVisible();
    await expect(page.getByText(/Om de 2 weken op dinsdag · 09:00–10:00/)).toBeVisible();
    // Na een geblokkeerde Microsoft-login geen Outlook-opties (zoals in Variant B).
    await expect(assistant(page).getByRole("button", { name: "Ik zeg ze zelf" })).toBeVisible();
    await expect(assistant(page).getByRole("button", { name: "Haal uit Outlook" })).toHaveCount(0);
    errors.assertNone();
  });

  test("herladen en terugkomen behouden de gast-state; ouder dan 7 dagen start leeg", async ({ page, context }) => {
    await page.goto("/probeer");
    await say(page, "Veiligheidsoverleg maandelijks");
    await expectAssistant(page, /Wanneer gaat het door\?/);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Veiligheidsoverleg" })).toBeVisible();
    await expect(log(page).getByText(/Welkom terug/)).toHaveCount(0);

    // Later terugkomen (nieuw tabblad, zelfde toestel).
    const later = await context.newPage();
    await later.goto("/probeer");
    await expect(later.getByRole("heading", { level: 1, name: "Veiligheidsoverleg" })).toBeVisible();
    await expectAssistant(later, "Welkom terug. Je veiligheidsoverleg staat er nog. Bewaar het wanneer je wilt.");

    // Ouder dan 7 dagen: leeg starten.
    await later.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem("toodoo-guest")!);
      raw.state.createdAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem("toodoo-guest", JSON.stringify(raw));
    });
    const old = await context.newPage();
    await old.goto("/probeer");
    await expect(old.getByRole("heading", { level: 1, name: "Je eerste overleg" })).toBeVisible();
    await expect(log(old).getByText(/Welkom terug/)).toHaveCount(0);
  });

  test("Iets aanpassen zet de velden in bewerkmodus; zelf aanpassen werkt meteen", async ({ page }) => {
    await page.goto("/probeer");
    await say(page, "managementoverleg om de 2 weken op dinsdag 14u30, anderhalf uur");
    await expectAssistant(page, "Wie zit er meestal bij? Voornamen volstaan.");
    await assistant(page).getByRole("group", { name: "Deelnemers" }).getByRole("button", { name: "Later" }).click();
    await assistant(page).getByRole("button", { name: "Iets aanpassen" }).click();
    const name = page.getByLabel("Naam van het overleg");
    await expect(name).toBeFocused();
    await name.fill("MT-overleg");
    await page.getByLabel("Duur").selectOption("60");
    await page.getByRole("button", { name: "Klaar met aanpassen" }).click();
    // Geen nieuwe vraag: de samenvatting bij "Klopt dit?" toont de aanpassing.
    await expect(log(page).getByText("Klopt dit?")).toHaveCount(1);
    await expect(assistant(page).getByText("Om de 2 weken op dinsdag, 14:30–15:30")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "MT-overleg" })).toBeVisible();
  });

  test("Eerst een voorbeeld: /voorbeeld met een knop terug naar /probeer", async ({ page }) => {
    await page.goto("/probeer");
    await assistant(page).getByRole("link", { name: "Eerst een voorbeeld bekijken" }).click();
    await expect(page).toHaveURL(/\/voorbeeld\?van=probeer$/);
    await page.getByRole("link", { name: "Terug naar je proefomgeving" }).first().click();
    await expect(page).toHaveURL(/\/probeer$/);
  });

  test("agenda (reeksen gevonden): koppelen = inloggen, overleg kiezen, acties, geen bewaar-modal", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await expect(assistant(page).getByText("Waarmee wil je starten?")).toBeVisible();
    await assistant(page)
      .getByRole("region", { name: "Uit je agenda" })
      .getByRole("button", { name: "Outlook" })
      .click();

    await expectAssistant(page, /Ik vond 5 vaste overleggen\. Welk wil je eerst opvolgen\?/);
    await expect(
      page.getByRole("status").filter({
        hasText: "Verbonden met Outlook als tom.claes@metaalwerken.be. Je werk wordt vanaf nu automatisch bewaard.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Hoofdmenu" })).toContainText("Tom Claes");
    await expect(page.getByRole("navigation", { name: "Hoofdmenu" })).toContainText("Proefperiode · nog 30 dagen");
    const list = assistant(page).getByRole("group", { name: "Kies een overleg" });
    await expect(list.getByRole("radio")).toHaveCount(5);
    await expect(list.getByRole("radio", { name: /Productieoverleg jij organiseert/ })).toBeChecked();
    await expect(list).toContainText("Elke maandag 08:00 · 6 deelnemers");
    await assistant(page).getByRole("button", { name: "Dit overleg opvolgen" }).click();

    await expectAssistant(page, "Links staat je productieoverleg uit Outlook, als voorstel.");
    await expect(page.getByText("uit Outlook", { exact: true })).toBeVisible();
    const fields = page.getByRole("region", { name: "Overleg in opbouw" });
    await expect(fields.getByRole("button", { name: /^Wanneer: Elke maandag · 08:00–09:00/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Lopende zaken" })).toContainText(
      "Orders, stilstanden en planning volgende week",
    );
    await expectAssistant(page, /Wat werd er vorige keer afgesproken/);
    await say(page, NOTES);
    await expectAssistant(
      page,
      "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
    );
    // Eigenaars uit de deelnemers van de agenda.
    const actions = page.getByRole("region", { name: "Openstaande acties" });
    await expect(
      actions.getByRole("button", { name: /Eigenaar van Instructie heftruck aanpassen na incident: Sofie/ }),
    ).toBeVisible();
    await assistant(page)
      .getByRole("group", { name: "Eigenaar kiezen" })
      .getByRole("button", { name: "Pieter Vermeulen" })
      .click();
    await assistant(page).getByRole("button", { name: "Zet ze op de agenda" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Je productieoverleg van maandag staat klaar." }),
    ).toBeVisible();

    // Al ingelogd: geen bewaar-modal, meteen naar de e-mailadressen.
    await assistant(page).getByRole("button", { name: "Ja, stuur ze" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/app\/overleg\/productieoverleg\?welkom=1$/);
    await expect(assistant(page).getByLabel("Sofie")).toHaveValue("sofie.desmet@metaalwerken.be");
    await expect(page.getByText("Orders, stilstanden en planning volgende week")).toBeVisible();
    errors.assertNone();
  });

  test("agenda (IT-goedkeuring nodig): rustige melding, de andere ingangen blijven bruikbaar", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await setDemo(page, { calendar: "IT-goedkeuring nodig" });
    await assistant(page)
      .getByRole("region", { name: "Uit je agenda" })
      .getByRole("button", { name: "Outlook" })
      .click();
    await expectAssistant(
      page,
      "Je bedrijf moet dit eerst goedkeuren. Geen probleem: vertel het me of gebruik notities.",
    );
    await expect(page.getByRole("region", { name: "Proefomgeving" })).toBeVisible();
    await expect(assistant(page).getByRole("region", { name: "Notities van een vorig overleg" })).toBeVisible();
    await assistant(page)
      .getByRole("button", { name: /Vertel het me/ })
      .click();
    await expectAssistant(page, "Waarover gaat je volgende overleg? Eén zin is genoeg.");
    errors.assertNone();
  });

  for (const [demo, text] of [
    [{ calendar: "Geen reeksen" }, "Ik vond geen vaste overleggen in je agenda."],
    [{ calendar: "Geannuleerd" }, "Het koppelen is geannuleerd. Geen probleem: vertel het me of gebruik notities."],
    [
      { login: "Bedrijf blokkeert" },
      "Inloggen met Microsoft lukt niet bij je bedrijf. Geen probleem: vertel het me of gebruik notities.",
    ],
  ] as const) {
    test(`agenda (${Object.values(demo)[0]}): ${text.slice(0, 40)}…`, async ({ page }) => {
      await page.goto("/probeer");
      await setDemo(page, demo);
      await assistant(page)
        .getByRole("region", { name: "Uit je agenda" })
        .getByRole("button", { name: "Outlook" })
        .click();
      await expectAssistant(page, text);
      if ("calendar" in demo && demo.calendar === "Geen reeksen") {
        await expect(assistant(page).getByRole("radio", { name: /MT-vergadering/ })).toBeVisible();
      } else {
        await expect(assistant(page).getByRole("region", { name: "Notities van een vorig overleg" })).toBeVisible();
      }
    });
  }

  test("notities via bestand: .txt, .docx en .pdf leveren acties op; slepen op Openstaande acties werkt ook", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    // .txt via "Kies bestand" in de assistent.
    await page.goto("/probeer");
    const chooser = page.waitForEvent("filechooser");
    await assistant(page).getByRole("button", { name: "Kies bestand" }).click();
    await (await chooser).setFiles("e2e/fixtures/notities.txt");
    await expectAssistant(page, "Ik las notities.txt.");
    await expectAssistant(
      page,
      "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
    );
    await expect(page.getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();

    // .docx in een nieuwe proefomgeving.
    await page.evaluate(() => localStorage.removeItem("toodoo-guest"));
    await page.reload();
    const chooser2 = page.waitForEvent("filechooser");
    await assistant(page).getByRole("button", { name: "Kies bestand" }).click();
    await (await chooser2).setFiles("e2e/fixtures/verslag.docx");
    await expectAssistant(page, "Ik las verslag.docx.");
    await expect(page.getByRole("region", { name: "Openstaande acties" })).toContainText(
      "Nieuwe offerte plooibank opvragen",
    );

    // .pdf: slepen op het blok "Openstaande acties" in het hoofdvlak.
    await page.evaluate(() => localStorage.removeItem("toodoo-guest"));
    await page.reload();
    const bytes = readFileSync("e2e/fixtures/verslag.pdf").toString("base64");
    const data = await page.evaluateHandle((b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bin], "verslag.pdf", { type: "application/pdf" }));
      return dt;
    }, bytes);
    const zone = page.locator('[data-dropzone="openstaande-acties"]');
    await zone.dispatchEvent("dragover", { dataTransfer: data });
    await zone.dispatchEvent("drop", { dataTransfer: data });
    await expectAssistant(page, "Ik las verslag.pdf.");
    await expect(page.getByRole("heading", { level: 1, name: "Managementoverleg" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Openstaande acties" })).toContainText("Budget");
    await expect(page.getByRole("region", { name: "Lopende zaken" })).toContainText("beslissing nodig");
    errors.assertNone();
  });

  test("elke vraag van de assistent verschijnt precies één keer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "Probeer Too-doo gratis" }).click();
    await expect(assistant(page).getByText("Waarmee wil je starten?")).toHaveCount(1);
    // Eén openingsbericht: welkom en startvraag samen.
    await expect(log(page)).toHaveText("Je eerste overleg staat in twee minuten klaar. Waarmee wil je starten?");
    // De drie blokken staan er (keuzes zichtbaar).
    await expect(assistant(page).getByRole("region", { name: "Uit je agenda" })).toBeVisible();
    await expect(assistant(page).getByRole("region", { name: "Notities van een vorig overleg" })).toBeVisible();

    // Snel dubbelklikken levert één antwoord op.
    await assistant(page)
      .getByRole("button", { name: /Vertel het me/ })
      .dblclick();
    await expectAssistant(page, "Waarover gaat je volgende overleg? Eén zin is genoeg.");

    // Weg en terug terwijl een antwoord onderweg is (Activity verbergt de pagina): het antwoord komt één keer.
    await say(page, "elke maandag om 9u met Els");
    await page.getByRole("link", { name: "bekijk eerst een voorbeeld" }).click();
    await page.getByRole("link", { name: "Terug naar je proefomgeving" }).first().click();
    await expectAssistant(page, "Hoe heet dit overleg? Bijvoorbeeld Productieoverleg.");

    // "Vul het zelf in" en twee keer "Klaar met aanpassen": de open vraag komt niet opnieuw.
    await page.getByRole("button", { name: "Vul het zelf in" }).click();
    await page.getByRole("button", { name: "Klaar met aanpassen" }).click();
    await page.getByRole("button", { name: "Wie zit erbij: ingevuld. Aanpassen" }).click();
    await page.getByRole("button", { name: "Klaar met aanpassen" }).click();
    await page.waitForTimeout(1200);

    const said = await log(page).innerText();
    const count = (q: string) => said.split(q).length - 1;
    expect(count("Waarmee wil je starten?")).toBe(1);
    expect(count("Waarover gaat je volgende overleg?")).toBe(1);
    expect(count("Hoe heet dit overleg?")).toBe(1);
    expect(count("Welkom terug")).toBe(0);
    await expect(assistant(page).getByRole("status", { name: "De assistent typt" })).toHaveCount(0);
  });
});
