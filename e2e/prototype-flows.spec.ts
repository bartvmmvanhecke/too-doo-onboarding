import { expect, test, type Page } from "@playwright/test";
import { expectToast, overlapsWithNav, trackErrors } from "./helpers";

/** Schermafdruk per stap in screenshots/<naam>/NN-stap.png (niet in git). */
function shooter(page: Page, name: string) {
  let n = 0;
  return async (step: string) => {
    n += 1;
    await page.waitForTimeout(250);
    await page.screenshot({ path: `screenshots/${name}/${String(n).padStart(2, "0")}-${step}.png`, fullPage: true });
    // Op elk scherm behalve /prototype: de lijst-knop overlapt niets.
    if (!page.url().endsWith("/prototype")) {
      expect(await overlapsWithNav(page), `overlap op ${page.url()}`).toEqual([]);
    }
  };
}

async function startFlow(page: Page, label: RegExp) {
  await page.goto("/prototype");
  await page.getByRole("button", { name: label }).click();
}

test.describe("Vier flows vanaf /prototype", () => {
  test("flow 1: Outlook, overleg kiezen en aanvullen", async ({ page }) => {
    const errors = trackErrors(page);
    const shot = shooter(page, "flow-1");
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "Probeer gratis" }).last().click();
    await expect(page).toHaveURL(/\/prototype$/);
    await shot("prototype");
    await page.getByRole("button", { name: /Start flow 1:/ }).click();
    await expect(page).toHaveURL(/\/start$/);
    await expect(page.getByRole("link", { name: "Terug naar flowkeuze (flow 1)" })).toBeVisible();
    await shot("account");
    await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    await expect(page).toHaveURL(/\/overleg$/);
    await shot("overleg");
    await page.getByRole("button", { name: "Connecteer Outlook en kies een meeting" }).click();
    await expect(page.getByRole("group", { name: "Terugkerend in je Outlook-agenda" })).toBeVisible();
    await expect(page.getByText("Kwaliteitsoverleg", { exact: true })).toBeVisible();
    await shot("lijst");
    await page.getByRole("link", { name: "Volgende" }).click();
    await expect(page).toHaveURL(/\/acties$/);
    await page.getByLabel("Actie 1", { exact: true }).fill("Offerte nieuwe plooibank opvragen");
    await shot("acties");
    await page.getByRole("button", { name: "Toon mijn overleg" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/productieoverleg$/);
    await expect(page.getByRole("checkbox", { name: "Offerte nieuwe plooibank opvragen afvinken" })).toBeVisible();
    await shot("app");
    errors.assertNone();
  });

  test("flow 2: e-mail en wachtwoord, overleg zelf samenstellen", async ({ page }) => {
    const errors = trackErrors(page);
    const shot = shooter(page, "flow-2");
    await startFlow(page, /Start flow 2:/);
    await expect(page).toHaveURL(/\/start$/);
    await page.getByLabel("Werk-e-mail").fill("an.claes@bouwbedrijf-claes.be");
    await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
    await page.getByLabel("Wachtwoord", { exact: true }).fill("veilig-genoeg");
    await shot("account-b");
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await expect(page).toHaveURL(/\/overleg$/);
    await page.getByRole("link", { name: "Maak handmatig een meeting" }).click();
    await expect(page).toHaveURL(/\/overleg\/zelf$/);
    await page.getByRole("button", { name: "Teamoverleg" }).click();
    await shot("zelf-invullen");
    await page.getByRole("button", { name: "Volgende" }).click();
    await expect(page).toHaveURL(/\/acties$/);
    await page.getByLabel("Actie 1", { exact: true }).fill("Planning werf Gent afstemmen");
    await shot("acties");
    await page.getByRole("button", { name: "Toon mijn overleg" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/teamoverleg$/);
    await expect(page.getByRole("heading", { level: 1, name: "Teamoverleg" })).toBeVisible();
    await shot("app");
    errors.assertNone();
  });

  test("flow 3: Outlook, overlegstructuur en acties uit notities (variant B)", async ({ page }) => {
    const errors = trackErrors(page);
    const shot = shooter(page, "flow-3");
    await page.goto("/b");
    await page.getByRole("link", { name: "Start gratis met Microsoft" }).click();
    await expect(page).toHaveURL(/\/prototype$/);
    await page.getByRole("button", { name: /Start flow 3:/ }).click();
    await expect(page).toHaveURL(/\/start$/);
    await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    // waitForURL reageert op de navigatie zelf; de melding staat er maar ±900 ms.
    await page.waitForURL(/\/b\/structuur$/);
    await expect(page.getByText("Verbinden met Outlook…")).toBeVisible();
    await expect(
      page.getByText("We vonden 5 vaste overleggen in je agenda, met 11 collega's, samen ongeveer 14 uur per maand."),
    ).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Productieoverleg/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Managementoverleg/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Veiligheidsoverleg/ })).not.toBeChecked();
    await expect(page.getByText("aanbevolen start")).toBeVisible();
    await expect(page.getByRole("button", { name: "Volg deze 2 overleggen op" })).toBeVisible();
    await shot("structuur");
    await page.getByRole("button", { name: "Volg deze 2 overleggen op" }).click();

    await expect(page).toHaveURL(/\/b\/acties$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Wat staat er nog open sinds het vorige productieoverleg?",
    );
    await page.getByRole("button", { name: "Haal de acties eruit" }).click();
    await expect(page.getByRole("heading", { name: "4 voorstellen uit je notities" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Tekst voorstel 1" })).toHaveValue(
      "Nieuwe offerte plooibank opvragen",
    );
    await expect(page.getByRole("button", { name: "Eigenaar: Jan Peeters. Wijzig" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Datum voorstel 1" })).toHaveValue(/^vr \d+ \w+$/);
    await expect(page.getByRole("button", { name: "Eigenaar: Sofie De Smet. Wijzig" })).toBeVisible();
    await expect(page.getByText("agendapunt")).toBeVisible();
    await expect(page.getByText("Jan en Sofie krijgen hun acties per mail,")).toBeVisible();
    await shot("voorstellen");
    await page.getByRole("button", { name: "Bekijk wat zij ontvangen" }).click();
    const mail = page.getByRole("dialog", { name: "Wat een eigenaar per mail ontvangt" });
    await expect(mail.getByText("Dag Sofie,")).toBeVisible();
    await expect(mail.getByText("Instructie heftruck aanpassen na incident")).toBeVisible();
    await shot("mail-modal");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Bevestig 4 punten" }).click();

    await expect(page).toHaveURL(/\/b\/overzicht$/);
    await expect(page.getByRole("heading", { name: "Dit volgt too-doo nu voor je op" })).toBeVisible();
    await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Wijs iemand aan voor Leverancier staal opnieuw bellen" }),
    ).toBeVisible();
    await expect(page.getByText(/beslissen op ma \d+ \w+/)).toBeVisible();
    await expect(page.getByText("mail verstuurd")).toBeVisible();
    await expect(page.getByText("Jan en Sofie hebben hun actie per mail gekregen.")).toBeVisible();
    await shot("overzicht");
    await page.getByRole("button", { name: "Wijs iemand aan voor Leverancier staal opnieuw bellen" }).click();
    await page.getByRole("button", { name: /Pieter Vermeulen/ }).click();
    await expect(page.getByRole("button", { name: /Wijs iemand aan/ })).toHaveCount(0);
    await expect(page.getByText("Jan, Sofie en Pieter hebben hun actie per mail gekregen.")).toBeVisible();
    const menu = page.getByRole("navigation", { name: "Hoofdmenu" });
    await expect(menu.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "Bekijk de agenda" }).click();
    await expect(page).toHaveURL(/\/app\/overleg\/productieoverleg$/);
    // Next houdt vorige pagina's verborgen gemonteerd; tel enkel wat zichtbaar is.
    await expect(page.getByText("Planning week 42").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Beslissen", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await shot("agenda");
    await menu.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/b\/overzicht$/);
    errors.assertNone();
  });

  test("flow 4: inloggen en niets doen", async ({ page }) => {
    const errors = trackErrors(page);
    const shot = shooter(page, "flow-4");
    await startFlow(page, /Start flow 4:/);
    await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    await expect(page).toHaveURL(/\/overleg$/);
    await shot("overleg");
    await page.getByRole("link", { name: "Ik doe dit later" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Zet je eerste vaste overleg klaar" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /0 van 4/ })).toBeVisible();
    await shot("lege-app");
    errors.assertNone();
  });

  test("Start flow wist de vorige state", async ({ page }) => {
    await page.goto("/app");
    await page.getByLabel("Naam", { exact: true }).fill("Teamoverleg");
    await page.getByRole("button", { name: "Maak overleg aan" }).click();
    await expect(page).toHaveURL(/teamoverleg$/);
    await page.getByRole("link", { name: /Terug naar flowkeuze/ }).click();
    await page.getByRole("button", { name: /Start flow 4:/ }).click();
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Zet je eerste vaste overleg klaar" })).toBeVisible();
  });
});

test.describe("Vier randgevallen vanaf /prototype", () => {
  test("Microsoft-login geblokkeerd door bedrijf", async ({ page }) => {
    const shot = shooter(page, "rand-geblokkeerd");
    await startFlow(page, /Microsoft-login geblokkeerd door bedrijf/);
    await expect(page).toHaveURL(/\/start$/);
    await page.getByRole("button", { name: "Doorgaan met Microsoft" }).click();
    await expect(page).toHaveURL(/\/start\/geblokkeerd$/);
    await shot("geblokkeerd");
  });

  test("Agenda vraagt goedkeuring IT-beheerder", async ({ page }) => {
    const shot = shooter(page, "rand-it");
    await startFlow(page, /Agenda vraagt goedkeuring IT-beheerder/);
    await expect(page).toHaveURL(/\/overleg$/);
    await page.getByRole("button", { name: "Connecteer Outlook en kies een meeting" }).click();
    await expect(page).toHaveURL(/\/overleg\/goedkeuring$/);
    await expect(page.getByText("Bedankt, Jan")).toBeVisible();
    await shot("goedkeuring");
  });

  test("Agenda gekoppeld, geen vaste overleggen", async ({ page }) => {
    const shot = shooter(page, "rand-geen-reeksen");
    await startFlow(page, /Agenda gekoppeld, geen vaste overleggen/);
    await expect(page).toHaveURL(/\/overleg$/);
    await page.getByRole("button", { name: "Connecteer Outlook en kies een meeting" }).click();
    await expect(page.getByText("Je agenda is gekoppeld, maar we vonden geen vaste overleggen")).toBeVisible();
    await shot("geen-reeksen");
  });

  test("Eerst rondkijken met voorbeelddata", async ({ page }) => {
    const shot = shooter(page, "rand-voorbeeld");
    await startFlow(page, /Eerst rondkijken met voorbeelddata/);
    await expect(page).toHaveURL(/\/voorbeeld$/);
    await expect(page.getByRole("dialog", { name: "Rondleiding" })).toBeVisible();
    await shot("voorbeeld");
  });
});

test.describe("Variant B in detail", () => {
  test("/b/structuur: minstens één overleg, knoptekst volgt het aantal", async ({ page }) => {
    await startFlow(page, /Start flow 3:/);
    await page.goto("/b/structuur");
    await page.getByRole("checkbox", { name: /Veiligheidsoverleg/ }).check();
    await expect(page.getByRole("button", { name: "Volg deze 3 overleggen op" })).toBeVisible();
    for (const name of [/Productieoverleg/, /Managementoverleg/, /Veiligheidsoverleg/]) {
      await page.getByRole("checkbox", { name }).uncheck();
    }
    await page.getByRole("button", { name: "Volg deze overleggen op" }).click();
    await expect(page.getByText("Kies minstens één overleg om op te volgen.")).toBeVisible();
    await expect(page).toHaveURL(/\/b\/structuur$/);
    await page.getByRole("checkbox", { name: /Kwaliteitsoverleg/ }).check();
    await page.getByRole("button", { name: "Volg dit overleg op" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Wat staat er nog open sinds het vorige kwaliteitsoverleg?",
    );
  });

  test("/b/structuur: 'Mis je een overleg?' via 2b en terug naar /b/acties", async ({ page }) => {
    await startFlow(page, /Start flow 3:/);
    await page.goto("/b/structuur");
    await page.getByRole("link", { name: "Mis je een overleg? Voeg het toe" }).click();
    await expect(page).toHaveURL(/\/overleg\/zelf$/);
    await expect(page.getByRole("link", { name: "Toch kiezen uit je Outlook-agenda" })).toHaveAttribute(
      "href",
      "/b/structuur",
    );
    await page.getByLabel("Naam van het overleg").fill("Werfoverleg");
    await page.getByRole("button", { name: "Volgende" }).click();
    await expect(page).toHaveURL(/\/b\/acties$/);
    await page.goto("/b/overzicht");
    await expect(page.getByText("3", { exact: true }).first()).toBeVisible(); // 3 overleggen opgevolgd
    await page.goto("/app");
    await expect(page.getByRole("main").getByRole("link", { name: /Werfoverleg/ })).toBeVisible();
  });

  test("/b/acties: extractie werkt op zelf geplakte tekst", async ({ page }) => {
    await startFlow(page, /Start flow 3:/);
    await page.goto("/b/structuur");
    await page.getByRole("button", { name: "Volg deze 2 overleggen op" }).click();
    await page
      .getByLabel("Notities, verslag of mail van het vorige overleg")
      .fill(
        "Pieter belt morgen de klant terug\nKoffiemachine herstellen volgende week\nBudget 2027: volgende keer beslissen",
      );
    await page.getByRole("button", { name: "Haal de acties eruit" }).click();
    await expect(page.getByRole("heading", { name: "3 voorstellen uit je notities" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Eigenaar: Pieter Vermeulen. Wijzig" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Datum voorstel 1" })).not.toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Datum voorstel 2" })).toHaveValue(/^ma \d+ \w+$/);
    await expect(page.getByRole("button", { name: /Eigenaar kiezen voor Koffiemachine herstellen/ })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Tekst voorstel 3" })).toHaveValue("Budget 2027");
    // Inline aanpassen en een eigenaar kiezen
    await page.getByRole("textbox", { name: "Tekst voorstel 2" }).fill("Koffiemachine laten herstellen");
    await page.getByRole("button", { name: /Eigenaar kiezen voor Koffiemachine/ }).click();
    await page.getByRole("button", { name: /Lotte Maes/ }).click();
    await page.getByRole("checkbox", { name: "Budget 2027 bevestigen" }).uncheck();
    await expect(page.getByRole("button", { name: "Bevestig 2 punten" })).toBeVisible();
    await page.getByRole("button", { name: "Bevestig 2 punten" }).click();
    await expect(page).toHaveURL(/\/b\/overzicht$/);
    await expect(page.getByText("Koffiemachine laten herstellen")).toBeVisible();
    await expect(page.getByText("Budget 2027")).toHaveCount(0);
  });

  test("/b/acties: inspreken en zelf typen", async ({ page }) => {
    await startFlow(page, /Start flow 3:/);
    await page.goto("/b/structuur");
    await page.getByRole("button", { name: "Volg deze 2 overleggen op" }).click();
    await page.getByRole("tab", { name: "Inspreken" }).click();
    await page.getByRole("button", { name: "Start met inspreken" }).click();
    await expect(page.getByText("Aan het luisteren…")).toBeVisible();
    await expect(page.getByRole("heading", { name: "4 voorstellen uit je notities" })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole("tab", { name: "Plak notities" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Notities, verslag of mail van het vorige overleg")).toHaveValue(
      /Jan vraagt een nieuwe offerte/,
    );
    // Pijltjestoetsen tussen tabbladen
    await page.getByRole("tab", { name: "Plak notities" }).press("ArrowLeft");
    await expect(page.getByRole("tab", { name: "Zelf typen" })).toBeFocused();
    await page.getByLabel("Actie 1", { exact: true }).fill("Rekken magazijn herschikken");
    await expect(page.getByText("zelf getypt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bevestig 5 punten" })).toBeVisible();
  });

  test("/b/acties: overslaan gaat naar het overzicht zonder acties", async ({ page }) => {
    await startFlow(page, /Start flow 3:/);
    await page.goto("/b/structuur");
    await page.getByRole("button", { name: "Volg deze 2 overleggen op" }).click();
    await page.getByRole("button", { name: "Overslaan, doe ik tijdens het overleg" }).click();
    await expect(page).toHaveURL(/\/b\/overzicht$/);
    await expect(page.getByText("Nog geen acties met een eigenaar.")).toBeVisible();
    await page.getByRole("button", { name: "Volg ook je andere overleggen op" }).click();
    await expect(page.getByRole("dialog", { name: "Je andere vaste overlegmomenten" })).toBeVisible();
  });

  test("/b/mail, /b/voorbeeld en /b: knoppen en inhoud", async ({ page }) => {
    await page.goto("/b/mail");
    await expect(page.getByText("Dag Sofie,")).toBeVisible();
    await page.getByRole("button", { name: "Markeer als klaar" }).click();
    await expectToast(page, "In het prototype niet actief");

    await page.goto("/b");
    await page.getByRole("link", { name: "Bekijk een voorbeeldbedrijf" }).click();
    await expect(page).toHaveURL(/\/b\/voorbeeld$/);
    await expect(page.getByText("Zo ziet een maand opvolging eruit bij Metaalwerken.", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "Zet het op voor jouw bedrijf" }).click();
    await expect(page).toHaveURL(/\/prototype$/);
    await page.getByRole("link", { name: "De reis van sales tot tweede overleg" }).click();
    await expect(
      page.getByRole("heading", { name: "Eén belofte, van eerste contact tot het tweede overleg" }),
    ).toBeVisible();
  });

  test("/b/voorbeeld gebruikt de bedrijfsnaam uit de state", async ({ page }) => {
    await startFlow(page, /Start flow 2:/);
    await page.getByLabel("Werk-e-mail").fill("an@bouwbedrijf-claes.be");
    await page.getByRole("button", { name: "Doorgaan", exact: true }).click();
    await page.getByLabel("Voornaam").fill("An");
    await page.getByLabel("Wachtwoord", { exact: true }).fill("veilig-genoeg");
    await page.getByRole("button", { name: "Account aanmaken" }).click();
    await page.goto("/b/voorbeeld");
    await expect(page.getByRole("heading", { name: "Na een maand too-doo bij Bouwbedrijf Claes" })).toBeVisible();
  });
});
