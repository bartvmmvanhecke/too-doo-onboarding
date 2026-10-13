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
  await expect(page.getByRole("dialog").getByText("Gert Janssens", { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Doorgaan", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Accepteren", exact: true }).click();
}

/** Bericht 1 en 2 na het vertelpad (Stap 1, C1). */
const TELL_READY =
  "Je productieoverleg staat klaar. Ik zette drie thema's klaar. Klopt dit ongeveer? Vul er gerust agendapunten onder aan.";
const NOTES_TELL = "Heb je open punten of notities van de vorige keer? Dan maak ik er acties van.";

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
  await expectAssistant(page, TELL_READY);
  // Het detailscherm: titel, datumregel en agendapunten als blokken met "voorstel".
  await expect(page.getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Wanneer: Elke maandag · 08:00–09:00/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Deelnemers: Jan, Sofie, Pieter, Karim/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Knelpunten en beslissingen" })).toContainText("voorstel");
  // Nog geen agendapunt: "Start overleg" is uitgeschakeld.
  await expect(page.getByRole("button", { name: "Start overleg" })).toBeDisabled();
  await expect(assistant(page).getByText("1 van 3")).toHaveCount(0);

  await assistant(page).getByRole("button", { name: "Klopt" }).click();
  await expectAssistant(page, NOTES_TELL);
  await say(page, NOTES);
  await expectAssistant(
    page,
    "Ik vond 3 acties en 1 beslissing. Ze staan links op de agenda; vink uit wat niet klopt.",
  );
  const actions = page.getByRole("region", { name: "Openstaande acties" });
  await expect(actions).toContainText("3 voorstellen · vink aan wat klopt");
  await expect(actions.getByRole("button", { name: "Wie doet Leverancier staal opnieuw bellen?" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Knelpunten en beslissingen" })).toContainText("Beslissen");
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

  test("voorbeeldsuggesties onder 'Vertel het me' vullen het chatveld zonder te versturen", async ({ page }) => {
    await page.goto("/probeer");
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
    const suggestions = assistant(page).getByRole("group", { name: "Of begin met een voorbeeld" });
    await expect(suggestions.getByRole("button")).toHaveText([
      "Wekelijks productieoverleg",
      "Maandelijks directieoverleg",
      "Teamoverleg sales",
      "1-op-1 met een medewerker",
    ]);
    const box = assistant(page).getByRole("textbox");

    // Een tik vult het veld, focus erin, cursor achteraan; er wordt niets verstuurd.
    await suggestions.getByRole("button", { name: "Teamoverleg sales" }).click();
    await expect(box).toHaveValue("Teamoverleg sales");
    await expect(box).toBeFocused();
    expect(await box.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe("Teamoverleg sales".length);
    await expect(log(page).getByText("Teamoverleg sales")).toHaveCount(0);
    await expect(suggestions).toHaveCount(0);

    // Veld weer leeg: de suggesties komen terug.
    await box.fill("");
    await expect(suggestions).toBeVisible();

    // Aanvullen en versturen werkt zoals een zelfgetypte zin; daarna geen suggesties meer.
    await suggestions.getByRole("button", { name: "Wekelijks productieoverleg" }).click();
    await page.keyboard.type(" met Tania");
    await box.press("Enter");
    await expectAssistant(page, /Je productieoverleg staat klaar/);
    await expectDocked(page);
    await expect(suggestions).toHaveCount(0);
  });

  test("geen voorbeeldsuggesties na 'Notities' of 'Agenda'", async ({ page }) => {
    await page.goto("/probeer");
    await start(page, "Gebruik notities van een vorig overleg");
    await expect(assistant(page).getByRole("button", { name: "Kies bestand" }).first()).toBeVisible();
    await expect(assistant(page).getByText("Of begin met een voorbeeld")).toHaveCount(0);
  });

  test("Microsoft geblokkeerd valt terug op e-mail met code", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await setDemo(page, { login: "Bedrijf blokkeert" });
    await say(page, "teamoverleg om de 2 weken op dinsdag om 9u met Els en Bram: planning en veiligheid");
    await expectAssistant(page, /Je teamoverleg staat klaar\. Ik zette twee thema's klaar\./);
    await assistant(page).getByRole("button", { name: "Klopt" }).click();
    await expectAssistant(page, NOTES_TELL);
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
    await expectAssistant(page, /Waar willen jullie in die meeting vooral vooruitgang op boeken\?/);
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

  test("Iets aanpassen zet de titel in bewerkmodus en gaat door naar de notities; zelf aanpassen werkt meteen", async ({
    page,
  }) => {
    await page.goto("/probeer");
    await say(page, "managementoverleg om de 2 weken op dinsdag 14u30, anderhalf uur: budget en personeel");
    await expectAssistant(page, /Je managementoverleg staat klaar\. Ik zette twee thema's klaar\./);
    await assistant(page).getByRole("button", { name: "Iets aanpassen" }).click();
    // De titel staat in bewerkmodus; de assistent gaat toch door naar bericht 2.
    const name = page.getByLabel("Naam van het overleg aanpassen");
    await expect(name).toBeFocused();
    await name.fill("MT-overleg");
    await name.press("Enter");
    await expectAssistant(page, NOTES_TELL);
    await page.getByRole("button", { name: /^Wanneer: / }).click();
    await page.getByLabel("Duur").selectOption("60");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /^Wanneer: Om de 2 weken op dinsdag · 14:30–15:30/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "MT-overleg" })).toBeVisible();
    // Geen extra vraag na het aanpassen.
    await expect(log(page).getByText(NOTES_TELL)).toHaveCount(1);
  });

  test("Eerst een voorbeeld: /voorbeeld met een knop terug naar /probeer", async ({ page }) => {
    await page.goto("/probeer");
    await assistant(page).getByRole("link", { name: "Bekijk eerst een voorbeeld" }).click();
    await expect(page).toHaveURL(/\/voorbeeld\?van=probeer$/);
    await page.getByRole("link", { name: "Terug naar mijn overleg" }).first().click();
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
    await expect(page.getByRole("region", { name: "Lopende zaken" })).toContainText("Beslissen");
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
    await say(page, "teamoverleg elke maandag om 9u met Els: planning");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("main").getByRole("link", { name: "Probeer Too-doo gratis" }).click();
    await expectAssistant(page, /Je teamoverleg staat klaar\. Ik zette één thema klaar\./);
    await expectDocked(page);

    // Twee keer zelf iets aanpassen in de datumregel: de open vraag komt niet opnieuw.
    await page.getByRole("button", { name: /^Wanneer: / }).click();
    await page.getByLabel("Duur").selectOption("30");
    await page.getByLabel("Duur").selectOption("90");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1200);

    const said = await log(page).innerText();
    const count = (q: string) => said.split(q).length - 1;
    expect(count("Waarover gaat je volgende overleg?")).toBe(1);
    expect(count("Klopt dit ongeveer?")).toBe(1);
    expect(count("Hoe heet dit overleg?")).toBe(0);
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
    for (const name of [/^Details$/, /^Vergaderingen$/, /Blok of pauze toevoegen/, /Doel/]) {
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

    // Onderaan één knop "+ Thema" (nieuw blok).
    await expect(main.getByRole("button", { name: "Thema", exact: true })).toHaveCount(1);
    await main.getByRole("button", { name: "Thema", exact: true }).click();
    await main.getByLabel("Thema toevoegen").fill("Budget 2027");
    await main.getByLabel("Thema toevoegen").press("Enter");
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
    await expectAssistant(page, TELL_READY);
    await expect(assistant(page).getByRole("button", { name: "Klopt" })).toBeVisible();
    await expect(assistant(page).getByRole("button", { name: "Iets aanpassen" })).toBeVisible();
    // Een vrij antwoord telt als bevestiging; daarna bericht 2. Wanneer en wie worden niet gevraagd.
    await say(page, "ja, dat klopt");
    await expectAssistant(page, NOTES_TELL);
    await expect(assistant(page).getByRole("button", { name: "Kies bestand" })).toBeVisible();
    await expect(assistant(page).getByText("Of plak of typ ze hieronder.")).toBeVisible();
    await assistant(page).getByRole("button", { name: "Ik heb niets openstaan" }).click();
    await expectAssistant(page, /Klaar\. Je productieoverleg staat klaar\./);
    await expect(log(page).getByText(/Wanneer gaat het door|Wie zit er meestal bij/)).toHaveCount(0);
    errors.assertNone();
  });

  test("vertellen zonder onderwerpen: meteen de overgang als concept, één verduidelijkende vraag", async ({ page }) => {
    await page.goto("/probeer");
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
    await say(page, "wekelijks overleg met Tina");
    await expectDocked(page);
    // De naam wordt nooit gevraagd: een generieke naam, aanpasbaar in de titel.
    await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Overleg" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: /^Deelnemers: Tina/ })).toBeVisible();
    await expectAssistant(
      page,
      "Je overleg staat klaar als concept. Waar willen jullie in die meeting vooral vooruitgang op boeken?",
    );
    await say(page, "planning en veiligheid");
    await expect(page.getByRole("region", { name: "Planning komende week" })).toBeVisible();
    await expectAssistant(page, NOTES_TELL);
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
    await expectAssistant(page, TELL_READY);
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
    await expectDocked(page);
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
    // Wanneer en wie worden op het vertelpad niet gevraagd.
    await expect(log(page).getByText("Wie zit er meestal bij?")).toHaveCount(0);
    errors.assertNone();
  });

  test("de herinnering over notities verschijnt één keer, ook na herladen (agendapad)", async ({ page }) => {
    await page.goto("/probeer");
    await connectOutlook(page);
    await assistant(page).getByRole("button", { name: "Dit overleg opvolgen" }).click();
    await expectAssistant(page, REMINDER);
    await expect(log(page).getByText(REMINDER)).toHaveCount(1);
    const stored = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("toodoo-guest") ?? "{}").state?.notesReminderShown);
    await expect.poll(stored).toBe(true);

    await page.reload();
    await expect(log(page).getByText(REMINDER)).toHaveCount(1);
    await assistant(page).getByRole("button", { name: "Ik heb niets openstaan" }).click();
    await expectAssistant(page, /Klaar\. Je productieoverleg staat klaar/);

    // Een tweede overleg: de herinnering komt niet opnieuw (het vertelpad vraagt het op zijn eigen manier).
    await assistant(page).getByRole("button", { name: "Nog een overleg toevoegen" }).click();
    await expectAssistant(page, /blijft staan\. Waarover gaat je volgende overleg\?/);
    await say(page, "teamoverleg elke dinsdag om 9u met Els: planning");
    await assistant(page).getByRole("button", { name: "Klopt" }).click();
    await expectAssistant(page, NOTES_TELL);
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

/** SPEC-LAZY.md §3 (agendapunten, Start overleg) en §4 Stap 0 "Na de overgang (C1f, C1g)". */
test.describe("Variant A · agenda en assistent sluiten", () => {
  const SHORT = "Ons productieoverleg: orders, problemen en planning";
  const ITEM_TYPE = "application/x-too-doo-item";

  async function tellAndDock(page: Page) {
    await page.goto("/probeer");
    await start(page, "Vertel het me");
    await expectAssistant(page, SENTENCE_QUESTION);
    await say(page, SHORT);
    await expectDocked(page);
    await expectAssistant(page, TELL_READY);
  }

  async function addItem(page: Page, theme: string, text: string) {
    const main = page.getByRole("main");
    await main.getByRole("button", { name: `Agendapunt toevoegen aan ${theme}` }).click();
    const field = main.getByLabel(`Agendapunt toevoegen aan ${theme}`);
    await field.fill(text);
    await field.press("Enter");
    await field.press("Escape");
  }

  const items = (page: Page, theme: string) =>
    page.getByRole("main").getByRole("region", { name: theme }).getByRole("listitem");

  test("Start overleg: statuslabel erboven, bovenkant gelijk met de titel, grijs met tooltip tot er een agendapunt is", async ({
    page,
  }) => {
    await tellAndDock(page);
    const main = page.getByRole("main");
    const button = main.getByRole("button", { name: "Start overleg" });
    await expect(button).toBeDisabled();
    // Thema's zonder punten en openstaande acties tellen niet; tooltip op de uitgeschakelde knop.
    await button.locator("xpath=..").hover();
    await expect(page.getByRole("tooltip")).toHaveText("Voeg eerst een agendapunt toe");

    const status = (await main.getByText("Concept", { exact: true }).boundingBox())!;
    const title = (await main.getByRole("heading", { level: 1 }).boundingBox())!;
    const box = (await button.boundingBox())!;
    expect(status.y + status.height).toBeLessThanOrEqual(title.y);
    expect(Math.abs(box.y - title.y)).toBeLessThanOrEqual(6);

    await addItem(page, "Lopende orders", "Order Peeters");
    await expect(button).toBeEnabled();

    // Onder 720 px staat de knop onder de datumregel.
    await page.setViewportSize({ width: 640, height: 900 });
    const line = (await main.getByRole("button", { name: /^Wanneer: / }).boundingBox())!;
    expect((await button.boundingBox())!.y).toBeGreaterThan(line.y);
  });

  test("agendapunten onder elk thema, ook onder voorgestelde en nieuwe thema's; bewaard in de gast-state", async ({
    page,
  }) => {
    await tellAndDock(page);
    await addItem(page, "Lopende orders", "Order Peeters");
    await addItem(page, "Varia", "Bedrijfsfeest");
    const main = page.getByRole("main");
    await main.getByRole("button", { name: "Thema", exact: true }).click();
    await main.getByLabel("Thema toevoegen").fill("Veiligheid");
    await main.getByLabel("Thema toevoegen").press("Enter");
    await addItem(page, "Veiligheid", "Nieuwe brandblussers");
    await expect(items(page, "Lopende orders")).toHaveText([/^Order Peeters/]);
    await expect(items(page, "Varia")).toHaveText([/^Bedrijfsfeest/]);
    await expect(items(page, "Veiligheid")).toHaveText([/^Nieuwe brandblussers/]);

    await page.reload();
    await expect(items(page, "Lopende orders")).toHaveText([/^Order Peeters/]);
    await expect(items(page, "Veiligheid")).toHaveText([/^Nieuwe brandblussers/]);
  });

  test("per thema een presentator en de totale duur; per agendapunt doel, eigenaars, duur en één teller", async ({
    page,
  }) => {
    await page.goto("/probeer");
    await say(page, "Ons productieoverleg elke maandag om 8u met Jan en Sofie: orders, problemen en planning");
    await expectDocked(page);
    await addItem(page, "Lopende orders", "Order Peeters");
    const theme = page.getByRole("main").getByRole("region", { name: "Lopende orders" });
    const row = items(page, "Lopende orders").first();

    // Geen vier kolommen (beslissingen, acties, notities, documenten), wel één icoon met teller.
    await expect(theme.getByText("Beslissingen", { exact: true })).toHaveCount(0);
    await expect(row.getByRole("img", { name: "0 items bij Order Peeters" })).toBeVisible();

    // Doel.
    await row.getByRole("button", { name: "Doel toevoegen" }).click();
    await page.getByRole("checkbox", { name: /Bespreken/ }).check();
    await page.getByRole("button", { name: "Pas 1 doel toe" }).click();
    await expect(row.getByRole("button", { name: "Doel: Bespreken. Wijzigen" })).toBeVisible();
    // Eigenaar.
    await row.getByRole("button", { name: "Eigenaar kiezen" }).click();
    await page.getByLabel("Zoek een collega").fill("jan");
    await page.getByRole("checkbox", { name: /Jan/ }).check();
    await page.getByRole("button", { name: "Wijs 1 eigenaar toe" }).click();
    await expect(row.getByRole("button", { name: "Eigenaar: Jan. Wijzigen" })).toBeVisible();
    // Duur; het thema telt de duur op.
    await row.getByRole("button", { name: "Duur toevoegen" }).click();
    await page.getByRole("button", { name: "20", exact: true }).click();
    await expect(row.getByRole("button", { name: "Duur: 20 minuten. Wijzigen" })).toBeVisible();
    await expect(theme.getByText("20 min", { exact: true }).first()).toBeVisible();
    // Presentator van het thema.
    await theme.getByRole("button", { name: "Presentator kiezen" }).click();
    await page.getByRole("button", { name: /^Sofie/ }).click();
    await expect(theme.getByRole("button", { name: "Presentator: Sofie. Wijzigen" })).toBeVisible();

    // Bewaard in de gast-state.
    await page.reload();
    await expect(row.getByRole("button", { name: "Doel: Bespreken. Wijzigen" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Eigenaar: Jan. Wijzigen" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Duur: 20 minuten. Wijzigen" })).toBeVisible();
    await expect(theme.getByRole("button", { name: "Presentator: Sofie. Wijzigen" })).toBeVisible();
  });

  test("verslepen met het toetsenbord: spatie, pijltjes over themagrenzen, spatie; Escape annuleert; aria-live", async ({
    page,
  }) => {
    await tellAndDock(page);
    await addItem(page, "Lopende orders", "Order Peeters");
    await addItem(page, "Lopende orders", "Order Janssens");
    const live = page.locator("p[aria-live=polite]");

    // Binnen het thema: Order Peeters één plaats omlaag.
    const grip = page.getByRole("button", { name: "Verplaats Order Peeters" });
    await grip.focus();
    await page.keyboard.press("Space");
    await expect(live).toContainText("Order Peeters opgepakt");
    await page.keyboard.press("ArrowDown");
    await expect(live).toHaveText("Order Peeters verplaatst naar Lopende orders, positie 2");
    // Over de themagrens naar het volgende thema.
    await page.keyboard.press("ArrowDown");
    await expect(live).toHaveText("Order Peeters verplaatst naar Knelpunten en beslissingen, positie 1");
    await page.keyboard.press("Space");
    await expect(live).toHaveText("Order Peeters neergezet.");
    await expect(items(page, "Lopende orders")).toHaveText([/^Order Janssens/]);
    await expect(items(page, "Knelpunten en beslissingen")).toHaveText([/^Order Peeters/]);

    // Escape zet terug.
    const grip2 = page.getByRole("button", { name: "Verplaats Order Janssens" });
    await grip2.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await expect(items(page, "Knelpunten en beslissingen")).toHaveText([/^Order Janssens/, /^Order Peeters/]);
    await expect(grip2).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(live).toHaveText("Verplaatsen van Order Janssens geannuleerd.");
    await expect(items(page, "Lopende orders")).toHaveText([/^Order Janssens/]);

    // Bewaard in de gast-state.
    const topics = await page.evaluate(
      () => JSON.parse(localStorage.getItem("toodoo-guest")!).state.meeting.topics as { items?: { text: string }[] }[],
    );
    expect(topics[1].items?.map((i) => i.text)).toEqual(["Order Peeters"]);
  });

  test("thema's verslepen; Openstaande acties blijft bovenaan en heeft geen handvat", async ({ page }) => {
    await tellAndDock(page);
    const main = page.getByRole("main");
    await expect(main.getByRole("button", { name: "Verplaats blok Openstaande acties" })).toHaveCount(0);
    await main.getByRole("button", { name: "Verplaats blok Planning komende week" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    // Hoger dan het eerste thema kan niet: Openstaande acties blijft eerst.
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    const order = await main
      .locator("#proefomgeving section[aria-label]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(order.slice(0, 4)).toEqual([
      "Openstaande acties",
      "Planning komende week",
      "Lopende orders",
      "Knelpunten en beslissingen",
    ]);
  });

  test("verslepen met de muis naar een ander thema; een leeg thema toont een drop-zone", async ({ page }) => {
    await tellAndDock(page);
    await addItem(page, "Lopende orders", "Order Peeters");
    const target = page.getByRole("main").getByRole("region", { name: "Planning komende week" });

    // Tijdens het slepen: het doelthema licht op en toont, leeg, een drop-zone.
    const id = await page.evaluate(
      () => (JSON.parse(localStorage.getItem("toodoo-guest")!).state.meeting.topics[0].items as { id: string }[])[0].id,
    );
    const data = await page.evaluateHandle(
      ([type, value]) => {
        const dt = new DataTransfer();
        dt.setData(type, value);
        return dt;
      },
      [ITEM_TYPE, id],
    );
    await target.dispatchEvent("dragenter", { dataTransfer: data });
    await expect(target).toHaveAttribute("data-item-over", "true");
    await expect(target.getByText("Zet het agendapunt hier neer")).toBeVisible();
    await target.dispatchEvent("dragover", { dataTransfer: data });
    await target.dispatchEvent("drop", { dataTransfer: data });
    await expect(items(page, "Planning komende week")).toHaveText([/^Order Peeters/]);
    await expect(items(page, "Lopende orders")).toHaveCount(0);
    await expect(target).not.toHaveAttribute("data-item-over");
  });

  test("assistent sluiten: ×, ⋯-menu en de chat; zwevende knop rechtsonder, ook na herladen", async ({ page }) => {
    await tellAndDock(page);
    const panel = assistant(page);
    await expect(panel.getByText("1 van 3")).toHaveCount(0);

    // ⋯: voorbeeldagenda en sluiten.
    await panel.getByRole("button", { name: "Meer opties" }).click();
    await expect(page.getByRole("menu", { name: "Meer opties" }).getByRole("menuitem")).toHaveText([
      /^Bekijk een voorbeeldagenda\s*Je eigen overleg blijft bewaard$/,
      /^Assistent sluiten\s*Je werkt zelf verder\. Ik sta rechtsonder\.$/,
    ]);
    await page.getByRole("menuitem", { name: /Assistent sluiten/ }).click();
    const fab = page.getByRole("button", { name: "Assistent openen" });
    await expect(fab).toBeVisible();
    await expect(panel).toHaveCount(0);
    await expect(page.getByText("Ik ben hier als je me nodig hebt. Ons gesprek blijft bewaard.")).toBeVisible();
    const box = (await fab.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(vp.width - (box.x + box.width)).toBeGreaterThanOrEqual(20);
    expect(vp.width - (box.x + box.width)).toBeLessThanOrEqual(30);
    expect(box.height).toBeGreaterThanOrEqual(56);

    // Gesloten blijft gesloten, ook na herladen; openen toont het gesprek waar het was.
    await page.reload();
    await expect(page.getByRole("button", { name: "Assistent openen" })).toBeVisible();
    await page.getByRole("button", { name: "Assistent openen" }).click();
    await expectAssistant(page, TELL_READY);

    // × sluit ook.
    await assistant(page).getByRole("button", { name: "Assistent sluiten" }).click();
    await expect(page.getByRole("button", { name: "Assistent openen" })).toBeVisible();
    await page.getByRole("button", { name: "Assistent openen" }).click();

    // Via de chat.
    await say(page, "ik doe het zelf");
    await expectAssistant(page, "Oké, je werkt zelf verder. Je vindt me rechtsonder.");
    await expect(page.getByRole("button", { name: "Assistent openen" })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("toodoo-guest")!).state.assistantOpen)).toBe(
      false,
    );
  });

  test("een voorbeeldagenda via ⋯ of de chat; terug naar mijn overleg", async ({ page }) => {
    await tellAndDock(page);
    await assistant(page).getByRole("button", { name: "Meer opties" }).click();
    await page.getByRole("menuitem", { name: /Bekijk een voorbeeldagenda/ }).click();
    await expect(page).toHaveURL(/\/voorbeeld\?van=probeer$/);
    await page.getByRole("link", { name: "Terug naar mijn overleg" }).first().click();
    await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Productieoverleg" })).toBeVisible();
    await say(page, "toon een voorbeeld");
    await expect(page).toHaveURL(/\/voorbeeld\?van=probeer$/);
  });
});
