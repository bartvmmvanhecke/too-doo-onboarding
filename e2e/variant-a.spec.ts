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

const startChoices = (page: Page) => assistant(page).getByRole("group", { name: "Startopties" });

/** Een van de drie startkeuzes (C1). */
async function start(
  page: Page,
  name: "Haal het uit mijn agenda" | "Ik heb notities van de vorige keer" | "Ik vertel het je",
) {
  await startChoices(page).getByRole("button", { name }).click();
}

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
  await start(page, "Ik vertel het je");
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
    await start(page, "Ik heb notities van de vorige keer");
    await expectAssistant(page, "Top. Sleep ze hierheen of plak de tekst. Ik haal de acties en eigenaars eruit.");
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
    await expect(old.getByRole("heading", { level: 1, name: "Je eerste overleg" })).toBeVisible();
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
    await assistant(page).getByRole("link", { name: "Of bekijk eerst een voorbeeld" }).click();
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
    await expect(page.getByRole("region", { name: "Proefomgeving" })).toBeVisible();
    await expect(startChoices(page).getByRole("button")).toHaveText([
      "Ik heb notities van de vorige keer",
      "Ik vertel het je",
    ]);
    await start(page, "Ik vertel het je");
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
    await start(page, "Ik heb notities van de vorige keer");
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
    await start(page, "Ik heb notities van de vorige keer");
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
    const zone = page.getByRole("region", { name: "Openstaande acties" });
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
    await expect(startChoices(page).getByRole("button")).toHaveCount(3);

    // Snel dubbelklikken levert één antwoord op.
    await startChoices(page).getByRole("button", { name: "Ik vertel het je" }).dblclick();
    await expectAssistant(page, "Waarover gaat je volgende overleg? Eén zin is genoeg.");

    // Weg en terug terwijl een antwoord onderweg is (Activity verbergt de pagina): het antwoord komt één keer.
    await say(page, "elke maandag om 9u met Els");
    await page
      .getByRole("navigation", { name: "Hoofdmenu" })
      .getByRole("link", { name: /naar de startpagina/ })
      .click();
    await page.getByRole("main").getByRole("link", { name: "Probeer Too-doo gratis" }).click();
    await expectAssistant(page, "Hoe heet dit overleg? Bijvoorbeeld Productieoverleg.");

    // Twee keer zelf iets aanpassen in de datumregel: de open vraag komt niet opnieuw.
    await page.getByRole("button", { name: /^Wanneer: / }).click();
    await page.getByLabel("Duur").selectOption("30");
    await page.getByLabel("Duur").selectOption("90");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1200);

    const said = await log(page).innerText();
    const count = (q: string) => said.split(q).length - 1;
    expect(count("Waarmee wil je starten?")).toBe(1);
    expect(count("Waarover gaat je volgende overleg?")).toBe(1);
    expect(count("Hoe heet dit overleg?")).toBe(1);
    expect(count("Welkom terug")).toBe(0);
    await expect(assistant(page).getByRole("status", { name: "De assistent typt" })).toHaveCount(0);
  });

  test("hoofdvlak in de vorm van het detailscherm: verborgen lagen, + Agendapunt, oplichten", async ({ page }) => {
    await page.goto("/probeer");
    const main = page.getByRole("main");
    // Lege toestand (C1).
    await expect(main.getByText("Concept", { exact: true })).toBeVisible();
    await expect(main.getByRole("heading", { level: 1, name: "Je eerste overleg" })).toBeVisible();
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
    // "Openstaande acties" staat open, met de uitleg en "kies een bestand".
    await expect(main.getByRole("button", { name: "Openstaande acties inklappen" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(main.getByRole("region", { name: "Openstaande acties" })).toContainText("kies een bestand");

    // Eén inline regel "+ Agendapunt".
    await expect(main.getByRole("button", { name: "Agendapunt", exact: true })).toHaveCount(1);
    await main.getByRole("button", { name: "Agendapunt", exact: true }).click();
    await main.getByLabel("Agendapunt toevoegen").fill("Budget 2027");
    await main.getByLabel("Agendapunt toevoegen").press("Enter");
    await expect(main.getByRole("region", { name: "Budget 2027" })).toBeVisible();

    // Wat de assistent invult, licht op in de titel, de datumregel en de avatars.
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

/** SPEC-LAZY.md §4: "Stap 1 · Waarmee wil je starten?" en "Ingangen blijven bereikbaar, ook na stap 1". */
test.describe("Variant A · startkeuzes en ingangen", () => {
  const LONG_SENTENCE =
    "Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim. We bespreken de lopende orders, de stilstanden van vorige week, de planning voor de komende weken, de nieuwe machine en alles wat er nog op de werkvloer speelt.";

  test("drie eenvoudige tekstregels; elke keuze toont pas daarna zijn details", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/probeer");
    await expect(log(page)).toHaveText("Je eerste overleg staat in twee minuten klaar. Waarmee wil je starten?");
    await expect(startChoices(page).getByRole("button")).toHaveText([
      "Haal het uit mijn agenda",
      "Ik heb notities van de vorige keer",
      "Ik vertel het je",
    ]);
    await expect(assistant(page).getByRole("link", { name: "Of bekijk eerst een voorbeeld" })).toBeVisible();
    // Geen knoppen of dropzone in de keuzes zelf.
    await expect(assistant(page).getByRole("button", { name: "Outlook" })).toHaveCount(0);
    await expect(assistant(page).getByRole("button", { name: "Kies bestand" })).toHaveCount(0);
    await expect(assistant(page).locator("[data-dropzone]")).toHaveCount(0);

    // Agenda: "Outlook of Google?", daarna het agendapad.
    await start(page, "Haal het uit mijn agenda");
    await expect(log(page).getByText("Haal het uit mijn agenda")).toBeVisible();
    await expectAssistant(page, "Outlook of Google?");
    const providers = assistant(page).getByRole("group", { name: "Agenda kiezen" });
    await expect(providers.getByRole("button")).toHaveText(["Outlook", /Google$/]);
    await expect(startChoices(page)).toHaveCount(0);

    // Notities (C1c): dropzone, "Kies bestand", tip om te plakken, placeholder van het chatveld.
    await page.evaluate(() => localStorage.removeItem("toodoo-guest"));
    await page.reload();
    await start(page, "Ik heb notities van de vorige keer");
    await expectAssistant(page, "Top. Sleep ze hierheen of plak de tekst. Ik haal de acties en eigenaars eruit.");
    await expect(assistant(page).locator("[data-dropzone]")).toContainText("Sleep een bestand hierheen");
    await expect(assistant(page).getByRole("button", { name: "Kies bestand" })).toBeVisible();
    await expect(assistant(page).getByText("Of plak de tekst hieronder in het chatveld.")).toBeVisible();
    await expect(assistant(page).getByRole("textbox")).toHaveAttribute("placeholder", "Plak je notities hier");

    // Vertellen (C2): de vraag, en focus op het chatveld.
    await page.evaluate(() => localStorage.removeItem("toodoo-guest"));
    await page.reload();
    await start(page, "Ik vertel het je");
    await expectAssistant(page, "Waarover gaat je volgende overleg? Eén zin is genoeg.");
    await expect(assistant(page).getByRole("textbox")).toBeFocused();
    errors.assertNone();
  });

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
    // Enkel dat veld: geen naam en geen deelnemers verzonnen.
    await expect(page.getByRole("heading", { level: 1, name: "Je eerste overleg" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Uit agenda halen" })).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Deelnemers uit agenda" })).toBeVisible();
    // De assistent gaat verder met wat ontbreekt.
    await expectAssistant(page, "Hoe heet dit overleg? Bijvoorbeeld Productieoverleg.");
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
    // Opnieuw via het menu en de link in de datumregel, terwijl de vraag al openstaat.
    const plus = assistant(page).getByRole("button", { name: "Toevoegen: notities, bestand of agenda" });
    await plus.click();
    await page.getByRole("menuitem", { name: /Agenda koppelen/ }).click();
    await page.getByRole("main").getByRole("button", { name: "Uit agenda halen" }).click();
    await page.waitForTimeout(1000);
    // Notities kiezen, twee keer, en ook getypt.
    await plus.click();
    await page.getByRole("menuitem", { name: "Notities plakken" }).click();
    await plus.click();
    await page.getByRole("menuitem", { name: "Notities plakken" }).click();
    await say(page, "ik heb notities");
    await page.waitForTimeout(1000);
    await say(page, NOTES);
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
