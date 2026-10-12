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

const startChoices = (page: Page) => assistant(page).getByRole("group", { name: "Manier van starten" });

type Choice = "Vertel het me" | "Gebruik notities van een vorig overleg" | "Haal het uit mijn agenda";

/** Een van de drie keuzes op het welkomstscherm (C0f). */
async function start(page: Page, name: Choice) {
  await startChoices(page)
    .getByRole("button", { name: new RegExp(`^${name}`) })
    .click();
}

/** Na de overgang staat de app er: de proefomgeving, en de assistent zet je overleg niet meer klaar. */
async function expectDocked(page: Page) {
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  await expect(log(page).getByText("Ik zet je overleg klaar…")).toHaveCount(0);
}

const SENTENCE_QUESTION = "Waarover gaat je volgende overleg? Eén zin is genoeg. Wie en wanneer mag erbij, hoeft niet.";

/** "Haal het uit mijn agenda" → "Outlook of Google?" → Outlook. */
async function connectOutlook(page: Page) {
  await start(page, "Haal het uit mijn agenda");
  await expectAssistant(page, "Outlook of Google?");
  await assistant(page).getByRole("group", { name: "Agenda kiezen" }).getByRole("button", { name: "Outlook" }).click();
}

const REMINDER = "Heb je notities van de vorige keer? Plak ze hier, dan staan de openstaande acties meteen klaar.";

async function say(page: Page, text: string) {
  const box = assistant(page).getByRole("textbox");
  await box.fill(text);
  await box.press("Enter");
}

/** Wacht tot de assistent geantwoord heeft (typ-indicator weg) en het bericht er staat. */
async function expectAssistant(page: Page, text: string | RegExp) {
  await expect(log(page).getByText(text).last()).toBeVisible();
}

/** Stap 1 tot 3 via de ingang "Ik vertel het je" (C1–C4). */
async function buildMeeting(page: Page) {
  await start(page, "Vertel het me");
  await expectAssistant(page, "Waarover gaat je volgende overleg? Eén zin is genoeg.");
  await say(page, SENTENCE);
  await expectAssistant(page, /Begrepen\. Links staat een voorstel van agenda/);
  // Het detailscherm: titel, datumregel en agendapunten als blokken met "voorstel".
  await expect(page.getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Wanneer: Elke maandag · 08:00–09:00/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Deelnemers: Jan, Sofie, Pieter, Karim/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Knelpunten en beslissingen" })).toContainText("voorstel");
  await expect(page.getByRole("button", { name: "Start overleg" })).toBeDisabled();
  await expect(assistant(page).getByText("Jan, Sofie, Pieter, Karim en jij")).toBeVisible();
  await expect(assistant(page).getByText("1 van 3")).toBeVisible();

  await assistant(page).getByRole("button", { name: "Klopt" }).click();
  await expectAssistant(page, REMINDER);
  await expect(assistant(page).getByText("2 van 3")).toBeVisible();
  await say(page, NOTES);
  await expectAssistant(
    page,
    "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
  );
  const actions = page.getByRole("region", { name: "Openstaande acties" });
  await expect(actions).toContainText("3 voorstellen · vink aan wat klopt");
  await expect(actions.getByRole("button", { name: "Wie doet Leverancier staal opnieuw bellen?" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Knelpunten en beslissingen" })).toContainText("beslissing nodig");
  await expectAssistant(page, "Wie gaat leverancier staal opnieuw bellen?");
  await say(page, "Karim belt, tegen woensdag");
  await expectAssistant(page, /Genoteerd: Karim, tegen wo/);
  await expect(
    actions
      .getByRole("listitem")
      .filter({ hasText: "Leverancier staal opnieuw bellen" })
      .getByRole("button", { name: "Eigenaar: Karim. Wijzigen" }),
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
    await expect(page.getByRole("heading", { level: 1, name: /^Welkom bij Too-doo\./ })).toBeVisible();
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
    await expect(page.getByRole("region", { name: "Lopende orders" })).toBeVisible();

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
    await start(page, "Gebruik notities van een vorig overleg");
    await expectAssistant(
      page,
      "Top. Sleep ze hierheen, spreek ze in of plak de tekst. Ik haal de acties en eigenaars eruit.",
    );
    await assistant(page).getByRole("button", { name: "Inspreken" }).click();
    await expect(assistant(page).getByText("Opname wordt uitgeschreven…")).toBeVisible();
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
    // Ook na bewaren: het "+"-menu in het chatveld (C6).
    await assistant(page).getByRole("button", { name: "Toevoegen: notities, bestand of agenda" }).click();
    await page.getByRole("menuitem", { name: "Notities plakken" }).click();
    await expect(assistant(page).getByRole("textbox")).toHaveAttribute("placeholder", "Plak je notities hier");
    await say(page, "- offerte lasrobot opvragen, Jan");
    await expectAssistant(page, "Ik vond 1 actie. Ze staan bij de openstaande acties.");
    await expect(page.getByRole("main").getByText("Offerte lasrobot opvragen", { exact: true })).toBeVisible();
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
    await expect(old.getByRole("heading", { level: 1, name: /^Welkom bij Too-doo\./ })).toBeVisible();
    await expect(log(old).getByText(/Welkom terug/)).toHaveCount(0);
  });

  test("Iets aanpassen zet de velden in bewerkmodus; zelf aanpassen werkt meteen", async ({ page }) => {
    await page.goto("/probeer");
    await say(page, "managementoverleg om de 2 weken op dinsdag 14u30, anderhalf uur");
    await expectAssistant(page, "Wie zit er meestal bij? Voornamen volstaan.");
    await assistant(page).getByRole("group", { name: "Deelnemers" }).getByRole("button", { name: "Later" }).click();
    await assistant(page).getByRole("button", { name: "Iets aanpassen" }).click();
    // De titel staat in bewerkmodus; datumregel en avatars openen hun bewerker.
    const name = page.getByLabel("Naam van het overleg aanpassen");
    await expect(name).toBeFocused();
    await name.fill("MT-overleg");
    await name.press("Enter");
    await page.getByRole("button", { name: /^Wanneer: / }).click();
    await page.getByLabel("Duur").selectOption("60");
    await page.keyboard.press("Escape");
    // Geen nieuwe vraag: de samenvatting bij "Klopt dit?" toont de aanpassing.
    await expect(log(page).getByText("Klopt dit?")).toHaveCount(1);
    await expect(assistant(page).getByText("Om de 2 weken op dinsdag, 14:30–15:30")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "MT-overleg" })).toBeVisible();
  });

  test("Eerst een voorbeeld: /voorbeeld met een knop terug naar /probeer", async ({ page }) => {
    await page.goto("/probeer");
    await assistant(page).getByRole("link", { name: "Bekijk eerst een voorbeeld" }).click();
    await expect(page).toHaveURL(/\/voorbeeld\?van=probeer$/);
    await page.getByRole("link", { name: "Terug naar je proefomgeving" }).first().click();
    await expect(page).toHaveURL(/\/probeer$/);
  });

  test("agenda (reeksen gevonden): koppelen = inloggen, overleg kiezen, acties, geen bewaar-modal", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await connectOutlook(page);

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
    await expect(page.getByRole("button", { name: /^Wanneer: Elke maandag · 08:00–09:00/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Orders, stilstanden en planning volgende week" })).toContainText(
      "voorstel",
    );
    await expectAssistant(page, REMINDER);
    await say(page, NOTES);
    await expectAssistant(
      page,
      "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
    );
    // Eigenaars uit de deelnemers van de agenda.
    const actions = page.getByRole("region", { name: "Openstaande acties" });
    await expect(
      actions
        .getByRole("listitem")
        .filter({ hasText: "Instructie heftruck aanpassen na incident" })
        .getByRole("button", { name: "Eigenaar: Sofie De Smet. Wijzigen" }),
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
    await expect(page.getByRole("region", { name: "Orders, stilstanden en planning volgende week" })).toBeVisible();
    errors.assertNone();
  });

  test("agenda (IT-goedkeuring nodig): rustige melding, de twee andere keuzes opnieuw als tekstregels", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await setDemo(page, { calendar: "IT-goedkeuring nodig" });
    await connectOutlook(page);
    await expectAssistant(
      page,
      "Je bedrijf moet dit eerst goedkeuren. Geen probleem: vertel het me of gebruik notities.",
    );
    await expect(startChoices(page).getByRole("button")).toHaveText([
      /^Vertel het me/,
      /^Gebruik notities van een vorig overleg/,
    ]);
    await start(page, "Vertel het me");
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
      await connectOutlook(page);
      await expectAssistant(page, text);
      if ("calendar" in demo && demo.calendar === "Geen reeksen") {
        await expect(assistant(page).getByRole("radio", { name: /MT-vergadering/ })).toBeVisible();
      } else {
        await expect(startChoices(page).getByRole("button")).toHaveCount(2);
      }
    });
  }

  test("notities via bestand: .txt, .docx en .pdf leveren acties op; slepen op Openstaande acties werkt ook", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    // .txt via "Kies bestand" in de assistent.
    await page.goto("/probeer");
    await start(page, "Gebruik notities van een vorig overleg");
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
    await start(page, "Gebruik notities van een vorig overleg");
    const chooser2 = page.waitForEvent("filechooser");
    await assistant(page).getByRole("button", { name: "Kies bestand" }).click();
    await (await chooser2).setFiles("e2e/fixtures/verslag.docx");
    await expectAssistant(page, "Ik las verslag.docx.");
    await expect(page.getByRole("region", { name: "Openstaande acties" })).toContainText(
      "Nieuwe offerte plooibank opvragen",
    );

    // .pdf: slepen op het blok "Openstaande acties" in het hoofdvlak (een lege vergadering, C1d).
    await page.evaluate(() => localStorage.removeItem("toodoo-guest"));
    await page.reload();
    await assistant(page).getByRole("button", { name: "Start met een lege meeting" }).click();
    await page.getByRole("button", { name: "Assistent openen" }).click();
    const bytes = readFileSync("e2e/fixtures/verslag.pdf").toString("base64");
    const data = await page.evaluateHandle((b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bin], "verslag.pdf", { type: "application/pdf" }));
      return dt;
    }, bytes);
    const zone = page.getByRole("region", { name: "Openstaande acties" });
    await zone.dispatchEvent("dragover", { dataTransfer: data });
    await zone.dispatchEvent("drop", { dataTransfer: data });
    await expectAssistant(page, "Ik las verslag.pdf.");
    await expect(page.getByRole("region", { name: "Openstaande acties" })).toContainText("Budget");
    await expect(page.getByRole("region", { name: "Lopende zaken" })).toContainText("beslissing nodig");
    errors.assertNone();
  });

  test("elke vraag van de assistent verschijnt precies één keer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "Probeer Too-doo gratis" }).click();
    await expect(assistant(page).getByRole("heading", { level: 1, name: /^Welkom bij Too-doo\./ })).toHaveCount(1);
    await expect(startChoices(page).getByRole("button")).toHaveCount(3);

    // Snel dubbelklikken levert één antwoord op.
    await startChoices(page)
      .getByRole("button", { name: /^Vertel het me/ })
      .dblclick();
    await expectAssistant(page, SENTENCE_QUESTION);

    // Weg en terug terwijl een antwoord onderweg is (Activity verbergt de pagina): het antwoord komt één keer.
    await say(page, "elke maandag om 9u met Els");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("main").getByRole("link", { name: "Probeer Too-doo gratis" }).click();
    await expectAssistant(page, "Hoe heet dit overleg? Bijvoorbeeld Productieoverleg.");
    await say(page, "Teamoverleg");
    await expectDocked(page);
    await expectAssistant(page, /Klopt dit\?/);

    // Twee keer zelf iets aanpassen in de datumregel: de open vraag komt niet opnieuw.
    await page.getByRole("button", { name: /^Wanneer: / }).click();
    await page.getByLabel("Duur").selectOption("30");
    await page.getByLabel("Duur").selectOption("90");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1200);

    const said = await log(page).innerText();
    const count = (q: string) => said.split(q).length - 1;
    expect(count("Waarover gaat je volgende overleg?")).toBe(1);
    expect(count("Hoe heet dit overleg?")).toBe(1);
    expect(count("Klopt dit?")).toBe(1);
    expect(count("Welkom terug")).toBe(0);
    await expect(assistant(page).getByRole("status", { name: "De assistent typt" })).toHaveCount(0);
  });

  test("hoofdvlak in de vorm van het detailscherm: verborgen lagen, + Agendapunt, oplichten", async ({ page }) => {
    await page.goto("/probeer");
    await assistant(page).getByRole("button", { name: "Start met een lege meeting" }).click();
    const main = page.getByRole("main");
    // Lege vergadering (C1d).
    await expect(main.getByText("Concept", { exact: true })).toBeVisible();
    await expect(main.getByLabel("Naam van het overleg aanpassen")).toHaveValue("Nieuwe vergadering");
    await main.getByLabel("Naam van het overleg aanpassen").press("Enter");
    await expect(main.getByRole("button", { name: /^Wanneer: nog niet ingevuld/ })).toHaveText("Wanneer?");
    await expect(main.getByRole("button", { name: "Wie zit erbij? Aanpassen" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Start overleg" })).toBeDisabled();
    await expect(main.getByRole("heading", { level: 2, name: "Agendapunten" })).toBeVisible();
    // Verborgen zolang er geen inhoud is: details, terugknop, tijdsbudget, tellers, type-labels, blokken toevoegen.
    for (const name of [
      /^Details$/,
      /^Vergaderingen$/,
      /Blok of pauze toevoegen/,
      /^Agendapunt toevoegen aan/,
      /Doel/,
    ]) {
      await expect(main.getByRole("button", { name })).toHaveCount(0);
    }
    await expect(main.getByRole("link", { name: /^Vergaderingen$/ })).toHaveCount(0);
    // "Openstaande acties" staat open, met de uitleg van C1d en "kies een bestand".
    await expect(main.getByRole("button", { name: "Openstaande acties inklappen" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const open = main.getByRole("region", { name: "Openstaande acties" });
    await expect(open).toContainText("Nog niets open. Acties die je tijdens de vergadering noteert");
    await expect(open).toContainText("kies een bestand");

    // Eén inline regel "+ Agendapunt".
    await expect(main.getByRole("button", { name: "Agendapunt", exact: true })).toHaveCount(1);
    await main.getByRole("button", { name: "Agendapunt", exact: true }).click();
    await main.getByLabel("Agendapunt toevoegen").fill("Budget 2027");
    await main.getByLabel("Agendapunt toevoegen").press("Enter");
    await expect(main.getByRole("region", { name: "Budget 2027" })).toBeVisible();

    // Wat de assistent invult, licht op in de titel, de datumregel en de avatars.
    await page.getByRole("button", { name: "Assistent openen" }).click();
    await say(page, "Ons productieoverleg, elke maandag om 8u met Jan en Sofie");
    const title = main.getByRole("heading", { level: 1 });
    await expect(title).toHaveText("Productieoverleg");
    await expect(title).toHaveClass(/bg-brand-selected/);
    await expect(main.getByRole("button", { name: /^Wanneer: Elke maandag/ })).toHaveClass(/bg-brand-selected/);
    await expect(main.getByRole("button", { name: /^Deelnemers: Jan, Sofie/ })).toHaveClass(/bg-brand-selected/);
    await expect(title).not.toHaveClass(/bg-brand-selected/, { timeout: 4000 });

    // Titel en deelnemers zijn rechtstreeks aanpasbaar.
    await main.getByRole("button", { name: /^Deelnemers: Jan, Sofie/ }).click();
    await page.getByLabel("Deelnemer toevoegen").fill("Karim");
    await page.getByLabel("Deelnemer toevoegen").press("Enter");
    await page.keyboard.press("Escape");
    await expect(main.getByRole("button", { name: /^Deelnemers: Jan, Sofie, Karim/ })).toBeVisible();
    await title.getByRole("button").click();
    await main.getByLabel("Naam van het overleg aanpassen").fill("Productie-overleg");
    await main.getByLabel("Naam van het overleg aanpassen").press("Enter");
    await expect(title).toHaveText("Productie-overleg");
  });
});

/** SPEC-LAZY.md §4, Stap 0: welkom als gesplitst scherm dat aandokt (C0f–C0i), en C1d. */
test.describe("Variant A · welkom en overgang", () => {
  const SHORT = "Ons productieoverleg: orders, problemen en planning";
  const panelBox = async (page: Page) => (await assistant(page).boundingBox())!;

  test("vertellen: het gesprek loopt verder in het paneel en komt uit op C1", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await expect(page.getByRole("region", { name: "Wat too-doo doet" })).toBeVisible();
    await expect(startChoices(page).getByRole("button")).toHaveText([
      /^Vertel het me/,
      /^Gebruik notities van een vorig overleg/,
      /^Haal het uit mijn agenda/,
    ]);
    await expect(assistant(page).getByRole("button", { name: "Start met een lege meeting" })).toBeVisible();
    await expect(assistant(page).getByRole("link", { name: "Bekijk eerst een voorbeeld" })).toBeVisible();
    await expect(assistant(page).getByRole("button", { name: "Toevoegen: notities, bestand of agenda" })).toBeVisible();

    await start(page, "Vertel het me");
    await expect(log(page).getByText("Vertel het me", { exact: true })).toBeVisible();
    await expectAssistant(page, SENTENCE_QUESTION);
    await expect(assistant(page).getByRole("textbox")).toBeFocused();
    await say(page, SHORT);
    await expectDocked(page);
    await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Wat too-doo doet" })).toHaveCount(0);
    await expectAssistant(
      page,
      "Je productieoverleg staat klaar, met een voorstel van agenda. Wanneer gaat het door en wie zit erbij?",
    );
    await expect(assistant(page).getByRole("button", { name: "Haal het uit mijn agenda" })).toBeVisible();
    await say(page, "elke maandag om 8u");
    await expectAssistant(page, "Wie zit er meestal bij? Voornamen volstaan.");
    errors.assertNone();
  });

  test("vertellen zonder herkende naam: na verzenden meteen de overgang, de naam wordt in de app gevraagd", async ({
    page,
  }) => {
    await page.goto("/probeer");
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
    await say(page, "wekelijks overleg met Tina");
    await expectDocked(page);
    await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Je eerste overleg" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: /^Deelnemers: Tina/ })).toBeVisible();
    await expectAssistant(page, "Hoe heet dit overleg? Bijvoorbeeld Productieoverleg.");
  });

  test("vrije tekst werkt ook zonder eerst te kiezen", async ({ page }) => {
    await page.goto("/probeer");
    await say(page, SHORT);
    await expectDocked(page);
    await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("toodoo-guest")!).state.startPath)).toBe("tell");
  });

  test("notities: dropzone, Inspreken en plakken; komt uit op C3 met de teller", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await start(page, "Gebruik notities van een vorig overleg");
    await expect(assistant(page).locator("[data-dropzone]")).toContainText("Word, PDF, e-mail, foto of geluidsopname");
    await expect(assistant(page).getByRole("button", { name: "Kies bestand" })).toBeVisible();
    await expect(assistant(page).getByRole("button", { name: "Inspreken" })).toBeVisible();
    await expect(assistant(page).getByText("Of plak de tekst in het chatveld.")).toBeVisible();
    await say(page, NOTES);
    await expectDocked(page);
    const actions = page.getByRole("region", { name: "Openstaande acties" });
    await expect(actions).toContainText("3 voorstellen · vink aan wat klopt");
    await expectAssistant(page, "Ik vond 3 acties en 1 beslissing.");
    await expectAssistant(page, "Wie gaat nieuwe offerte plooibank opvragen?");
    errors.assertNone();
  });

  test("een geluidsopname toont eerst 'Opname wordt uitgeschreven…'", async ({ page }) => {
    await page.goto("/probeer");
    await start(page, "Gebruik notities van een vorig overleg");
    const chooser = page.waitForEvent("filechooser");
    await assistant(page).getByRole("button", { name: "Kies bestand" }).click();
    await (await chooser).setFiles({ name: "overleg.m4a", mimeType: "audio/mp4", buffer: Buffer.from("geluid") });
    await expect(assistant(page).getByText("Opname wordt uitgeschreven…").first()).toBeVisible();
    await expectAssistant(page, /Ik las overleg\.m4a\. Een opname echt uitschrijven kan het prototype nog niet/);
    await expectDocked(page);
  });

  test("agenda: Outlook of Google, koppelen = inloggen; komt uit op C1b", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await start(page, "Haal het uit mijn agenda");
    await expectAssistant(page, "Outlook of Google?");
    await expect(
      assistant(page).getByText(
        "We lezen alleen je vaste vergaderingen. Je logt meteen in, zodat je werk bewaard blijft.",
      ),
    ).toBeVisible();
    await assistant(page)
      .getByRole("group", { name: "Agenda kiezen" })
      .getByRole("button", { name: "Outlook" })
      .click();
    await expectDocked(page);
    await expect(assistant(page).getByRole("group", { name: "Kies een overleg" }).getByRole("radio")).toHaveCount(5);
    await expect(page.getByRole("navigation", { name: "Hoofdmenu" }).first()).toContainText("Tom Claes");
    errors.assertNone();
  });

  test("mislukte agendakoppeling: rustige melding, de twee andere keuzes opnieuw, nog op het welkomstscherm", async ({
    page,
  }) => {
    await page.goto("/probeer");
    await setDemo(page, { calendar: "IT-goedkeuring nodig" });
    await connectOutlook(page);
    await expectAssistant(
      page,
      "Je bedrijf moet dit eerst goedkeuren. Geen probleem: vertel het me of gebruik notities.",
    );
    await expect(startChoices(page).getByRole("button")).toHaveText([
      /^Vertel het me/,
      /^Gebruik notities van een vorig overleg/,
    ]);
    await expect(page.getByRole("region", { name: "Wat too-doo doet" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Proefomgeving" })).toHaveCount(0);
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
  });

  test("lege meeting: geen overgang, meteen C1d met de assistent ingeklapt", async ({ page }) => {
    await page.goto("/probeer");
    await assistant(page).getByRole("button", { name: "Start met een lege meeting" }).click();
    await expect(page.getByRole("region", { name: "Proefomgeving" })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Naam van het overleg aanpassen")).toBeFocused();
    await expect(page.getByRole("main").getByLabel("Naam van het overleg aanpassen")).toHaveValue("Nieuwe vergadering");
    await expect(page.getByRole("main").getByRole("button", { name: "Uit agenda halen" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Deelnemers uit agenda" })).toBeVisible();
    await expect(page.getByText("Klaar", { exact: true })).toHaveCount(0);
    await expect(assistant(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Assistent openen" }).click();
    await expect(log(page)).toHaveText("Zeg het als ik iets kan invullen.");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("toodoo-guest")!).state.startPath)).toBe("empty");
  });

  test("de overgang speelt één keer; herladen toont meteen de app", async ({ page }) => {
    await page.goto("/probeer");
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
    await say(page, SHORT);
    await expect(log(page).getByText("Ik zet je overleg klaar…")).toBeVisible();
    await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Klaar" })).toBeVisible();
    await expectDocked(page);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("toodoo-guest")!).state);
    expect(state).toMatchObject({ transitionPlayed: true, startPath: "tell" });

    await page.reload();
    await expect(page.getByRole("region", { name: "Proefomgeving" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Wat too-doo doet" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: /^Welkom bij Too-doo\./ })).toHaveCount(0);
    await expect(log(page).getByText("Ik zet je overleg klaar…")).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Klaar" })).toHaveCount(0);
  });

  test("met reduced motion: geen beweging, enkel een crossfade", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/probeer");
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
    await say(page, SHORT);
    const title = page.getByRole("main").getByRole("heading", { level: 1 });
    await title.waitFor();
    // Vanaf het eerste beeld van de app: titel en zijbalk staan stil, zonder transform.
    const first = (await title.boundingBox())!;
    const bg = page.locator("nav[aria-label=Hoofdmenu] > div[aria-hidden]").first();
    expect(await bg.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    expect((await bg.boundingBox())!.width).toBe(220);
    await page.waitForTimeout(150);
    expect(await title.boundingBox()).toEqual(first);
    expect(await bg.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    await expectDocked(page);
  });

  test("het assistentpaneel staat voor, tijdens en na de overgang op dezelfde plek en breedte", async ({ page }) => {
    await page.goto("/probeer");
    const before = await panelBox(page);
    expect(before).toMatchObject({ width: 400 });
    expect(before.x + before.width).toBe(page.viewportSize()!.width);
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
    await say(page, SHORT);
    await page.getByRole("main").getByRole("heading", { level: 1 }).waitFor();
    const during = await panelBox(page);
    await expectDocked(page);
    const after = await panelBox(page);
    for (const box of [during, after]) {
      expect(box.x).toBe(before.x);
      expect(box.width).toBe(before.width);
      expect(box.y).toBe(before.y);
    }
  });
});

/** SPEC-LAZY.md §4: "Ingangen blijven bereikbaar, ook na stap 1". */
test.describe("Variant A · ingangen", () => {
  const LONG_SENTENCE =
    "Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim. We bespreken de lopende orders, de stilstanden van vorige week, de planning voor de komende weken, de nieuwe machine en alles wat er nog op de werkvloer speelt.";

  test("het +-menu in het chatveld: notities plakken, bestand kiezen, agenda koppelen", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    const plus = assistant(page).getByRole("button", { name: "Toevoegen: notities, bestand of agenda" });
    await plus.click();
    const menu = page.getByRole("menu", { name: "Toevoegen" });
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Notities plakken",
      /^Bestand kiezen\s*Word, PDF, foto$/,
      /^Agenda koppelen\s*Outlook, Google$/,
    ]);

    // Agenda koppelen: hetzelfde pad als "Haal het uit mijn agenda".
    await menu.getByRole("menuitem", { name: /Agenda koppelen/ }).click();
    await expectAssistant(page, "Outlook of Google?");

    // Notities plakken: het chatveld wacht op notities.
    await plus.click();
    await page.getByRole("menuitem", { name: "Notities plakken" }).click();
    await expectAssistant(page, "Sleep je notities hierheen of plak de tekst. Ik haal de acties en eigenaars eruit.");
    await expect(assistant(page).getByRole("textbox")).toHaveAttribute("placeholder", "Plak je notities hier");

    // Bestand kiezen: de bestandskiezer, zelfde verwerking als de dropzone.
    await plus.click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: /Bestand kiezen/ }).click();
    await (await chooser).setFiles("e2e/fixtures/notities.txt");
    await expectAssistant(page, "Ik las notities.txt.");
    await expectAssistant(
      page,
      "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
    );
    errors.assertNone();
  });

  test("geplakte notities worden herkend: 'Ja, verwerk' en 'Nee, gewoon bericht'", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await say(page, SENTENCE);
    await expectAssistant(page, /Klopt dit\?/);
    await say(page, NOTES);
    await expectAssistant(
      page,
      "Dit lijken notities van een vorig overleg. Zal ik er de openstaande acties en agendapunten uit halen?",
    );
    await assistant(page).getByRole("button", { name: "Ja, verwerk" }).click();
    await expectAssistant(
      page,
      "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
    );
    await expect(page.getByRole("region", { name: "Openstaande acties" })).toContainText("3 voorstellen");

    // Nee: de tekst wordt een gewoon bericht (hier: de zin over het overleg).
    await page.evaluate(() => localStorage.removeItem("toodoo-guest"));
    await page.reload();
    await say(page, LONG_SENTENCE);
    await expectAssistant(page, /Dit lijken notities van een vorig overleg\./);
    await assistant(page).getByRole("button", { name: "Nee, gewoon bericht" }).click();
    await expectAssistant(page, /Klopt dit\?/);
    await expect(page.getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Openstaande acties" })).not.toContainText("voorstellen");
    errors.assertNone();
  });

  test("'Uit agenda halen' in de datumregel vult dag en uur; de link verdwijnt dan", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
    await say(page, "Ons productieoverleg: orders, problemen en planning");
    await expectDocked(page);
    const main = page.getByRole("main");
    await expect(main.getByRole("button", { name: "Uit agenda halen" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Deelnemers uit agenda" })).toBeVisible();

    await main.getByRole("button", { name: "Uit agenda halen" }).click();
    await expectAssistant(page, "Outlook of Google?");
    await assistant(page)
      .getByRole("group", { name: "Agenda kiezen" })
      .getByRole("button", { name: "Outlook" })
      .click();
    await expectAssistant(page, /Welk wil je gebruiken\?/);
    await assistant(page).getByRole("button", { name: "Dit overleg opvolgen" }).click();
    await expectAssistant(page, "Ik nam dag en uur over uit je productieoverleg in Outlook.");
    await expect(page.getByRole("button", { name: /^Wanneer: Elke maandag · 08:00–09:00/ })).toBeVisible();
    // Enkel dat veld: geen deelnemers verzonnen.
    await expect(main.getByRole("button", { name: "Uit agenda halen" })).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Deelnemers uit agenda" })).toBeVisible();
    // De assistent gaat verder met wat ontbreekt.
    await expectAssistant(page, "Wie zit er meestal bij? Voornamen volstaan.");
    errors.assertNone();
  });

  test("de herinnering over notities verschijnt één keer, ook na herladen", async ({ page }) => {
    await page.goto("/probeer");
    await say(page, SENTENCE);
    await assistant(page).getByRole("button", { name: "Klopt" }).click();
    await expectAssistant(page, REMINDER);
    await expect(log(page).getByText(REMINDER)).toHaveCount(1);
    const stored = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("toodoo-guest") ?? "{}").state?.notesReminderShown);
    await expect.poll(stored).toBe(true);

    await page.reload();
    await expect(log(page).getByText(REMINDER)).toHaveCount(1);
    await assistant(page).getByRole("button", { name: "Ik heb niets openstaan" }).click();
    await expectAssistant(page, /Klaar\. Je productieoverleg staat klaar/);

    // Een tweede overleg: de herinnering komt niet opnieuw.
    await assistant(page).getByRole("button", { name: "Nog even rondkijken" }).click();
    await assistant(page).getByRole("button", { name: "Nog een overleg toevoegen" }).click();
    await expectAssistant(page, /blijft staan\. Waarover gaat je volgende overleg\?/);
    await say(page, "teamoverleg elke dinsdag om 9u met Els");
    await assistant(page).getByRole("button", { name: "Klopt" }).click();
    await expectAssistant(page, /Staat er nog iets open van de vorige keer\?/);
    await page.reload();
    await expect(log(page).getByText(REMINDER)).toHaveCount(1);
  });

  test("geen enkele vraag van de assistent verschijnt dubbel, over alle ingangen heen", async ({ page }) => {
    await page.goto("/probeer");
    await start(page, "Haal het uit mijn agenda");
    await expectAssistant(page, "Outlook of Google?");
    // Opnieuw via het menu, terwijl de vraag al openstaat.
    const plus = assistant(page).getByRole("button", { name: "Toevoegen: notities, bestand of agenda" });
    await plus.click();
    await page.getByRole("menuitem", { name: /Agenda koppelen/ }).click();
    await say(page, "koppel mijn agenda");
    await page.waitForTimeout(1000);
    // Notities kiezen, twee keer, en ook getypt.
    await plus.click();
    await page.getByRole("menuitem", { name: "Notities plakken" }).click();
    await plus.click();
    await page.getByRole("menuitem", { name: "Notities plakken" }).click();
    await say(page, "ik heb notities");
    await page.waitForTimeout(1000);
    await say(page, NOTES);
    await expectDocked(page);
    await expectAssistant(page, /Ik vond 3 acties/);
    await assistant(page).getByRole("button", { name: "Zet ze op de agenda" }).click();
    // De naam kwam uit de kopregel van de notities: de volgende vraag is de dag.
    await expectAssistant(page, "Wanneer gaat het door?");
    await page.waitForTimeout(1000);

    const said = await log(page).innerText();
    const questions = said
      .split(/\n+|(?<=[.?])\s+/)
      .map((q) => q.trim())
      .filter((q) => q.endsWith("?"));
    const dup = questions.filter((q, i) => questions.indexOf(q) !== i);
    expect(dup).toEqual([]);
    expect(questions).toContain("Outlook of Google?");
    await expect(assistant(page).getByRole("status", { name: "De assistent typt" })).toHaveCount(0);
  });
});
