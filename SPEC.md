# Too-doo onboarding – functionele specificatie (prototype)

Doel: een klikbaar, werkend prototype van de nieuwe onboarding van too-doo, van website-hero tot het eerste overleg met acties. Dit is een **prototype met nepdata**: geen echte login, geen echte Microsoft-koppeling, geen backend. Alle externe stappen worden gesimuleerd, met een schakelaar om elke uitkomst te kunnen tonen.

De mockups staan in `design/`: één `.dc.html`-bestand per scherm, de bronbestanden van het designcanvas. Ze openen niet los in een browser (ze verwachten de runtime van het canvas), maar de HTML en inline stijlen zijn gewoon leesbaar: lees ze voor lay-out, teksten, kleuren en volgorde. Volg ze, maar bouw ze opnieuw op met echte componenten. Het blok `<script type="text/x-dc">` onderaan bevat de demologica (toestanden), geen productiecode.

Taal van de interface: **Nederlands** (België). Alle teksten letterlijk uit de mockups halen.

---

## 1. Doelgroep en principes

- Zaakvoerder of COO van een KMO (±50 medewerkers, maakindustrie), werkt in Outlook, weinig tijd.
- Kernwaarde: wat in een vergadering wordt afgesproken, wordt opgevolgd. Acties met eigenaar komen vanzelf terug op het volgende overleg.
- Principes:
  1. Van configureren naar gebruiken: de onboarding eindigt in een echt overleg met eigen acties, nooit op een lege lijst.
  2. Agenda koppelen is een versneller, nooit een voorwaarde. Zelf invullen is altijd een volwaardige weg.
  3. Login met Microsoft en agendatoegang zijn twee aparte toestemmingen.
  4. Geen meetingtypes vragen; het type volgt uit de naam van het overleg.
  5. Niets verplicht: elke stap heeft een uitweg.

---

## 2. Routes en schermen

| Route | Mockup | Scherm |
| --- | --- | --- |
| `/` | `Main.dc.html` | Website-hero |
| `/start` | `Stap1-Account.dc.html` | 1 · Account (twee toestanden, zie 3.1) |
| `/start/geblokkeerd` | `Stap1b-Login-geblokkeerd.dc.html` | 1b · Microsoft-login geblokkeerd door bedrijf |
| `/overleg` | `Stap2-Overleg-Outlook.dc.html` | 2a · Eerste overleg (drie toestanden, zie 3.2) |
| `/overleg/zelf` | `Stap2b-Overleg-Manueel.dc.html` | 2b · Overleg zelf invullen |
| `/overleg/goedkeuring` | `Stap2c-Beheerder.dc.html` | 2c · Agenda vraagt goedkeuring IT-beheerder |
| `/voorbeeld` | `Stap2d-Voorbeelddata.dc.html` | 2d · Rondkijken met voorbeelddata |
| `/acties` | `Stap3-Acties.dc.html` | 3 · Openstaande acties |
| `/app/overleg/:id` | `Product-Overleg.dc.html` | 4 · Landen in het overleg |
| `/app` (leeg) | `Product-Leeg.dc.html` | 4b · Lege toestand (alles overgeslagen) |
| modal in `/app` | `Snel-toevoegen.dc.html` | 5 · Andere overlegmomenten toevoegen |

Referentie, niet bouwen: `Flow-Agenda.dc.html` (overzicht van alle routes), `Stap1c-…`, `Stap2a-Lijst…`, `Stap2a-Geen-reeksen…` (momentopnames van toestanden).

---

## 3. Gedrag per scherm

### 3.1 Account (`/start`)
- Toestand A: knoppen "Doorgaan met Microsoft", "Doorgaan met Google", en werk-e-mail met "Doorgaan".
- "Doorgaan" met e-mail → **zelfde scherm, toestand B**: SSO-knoppen verdwijnen, e-mail blijft staan met "Wijzig" (terug naar A), velden voornaam, achternaam, wachtwoord (min. 8 tekens, één zichtbare regel). Titel, voortgang en rechterpaneel blijven ongewijzigd.
- Bedrijfsnaam afleiden uit het e-maildomein (`metaalwerken.be` → "Metaalwerken").
- Geen verplichte e-mailverificatie: melding "bevestigingsmail volgt" onder de knop.
- Microsoft (gesimuleerd) → slaagt → `/overleg`, of faalt (bedrijf blokkeert) → `/start/geblokkeerd`.
- Google en "Account aanmaken" → `/overleg`.

### 3.2 Eerste overleg (`/overleg`) – drie toestanden
1. **Vóór toestemming**: kaart "Haal je vaste overleggen uit Outlook", knop "Toon mijn overleggen uit Outlook". Links: "Liever niet koppelen? Vul het zelf in" → `/overleg/zelf`; "Eerst rondkijken met voorbeelddata" → `/voorbeeld`; "Ik doe dit later" → `/app` (lege toestand).
2. **Toestemming gesimuleerd** → uitkomsten:
   - reeksen gevonden → **lijst** (radio, één keuze) met terugkerende vergaderingen; "Staat er niet tussen? Vul het zelf in" → `/overleg/zelf`; "Volgende" → `/acties`.
   - geen reeksen → **melding** + knop "Vul je overleg zelf in" + losse afspraken komende 2 weken; kiezen van een afspraak opent `/overleg/zelf` met naam, uur, duur en deelnemers voorgevuld.
   - goedkeuring IT nodig → `/overleg/goedkeuring`.
   - geannuleerd of fout → blijft in toestand 1, rustige melding "Geen probleem, vul het zelf in".
- Wie al toestemming gaf, ziet meteen de lijst.
- Rechterpaneel: live voorbeeld van het gekozen overleg (naam, ritme, deelnemers, startagenda: Openstaande acties / Lopende zaken / Varia).

### 3.3 Zelf invullen (`/overleg/zelf`)
- Start leeg (hint "Bijv. Productieoverleg"), tenzij voorgevuld vanuit 3.2.
- Naam met suggestiechips (Productieoverleg, Managementoverleg, Veiligheidsoverleg, Kwaliteitsoverleg, Teamoverleg); klikken vult het veld, typen deselecteert.
- Volgende keer (datum, typbaar).
- **Uur**: typbaar ("8u", "0800", "8:30", "8.30" → 08:00/08:30), knoppen − en + per 15 min, en uitklaplijst 06:00–20:00 per kwartier. Ongeldige invoer zet de vorige waarde terug.
- Duur als knoppen: 15 min, 30 min, 1 uur, 1u30, Anders.
- Herhaling: Eenmalig, Elke week, Om de 2 weken, Maandelijks.
- Overlegtype afleiden uit de naam (achter de schermen, niet tonen als keuze).
- "Toch kiezen uit je Outlook-agenda" → `/overleg`. "Volgende" → `/acties`.
- Rechterpaneel volgt live de invoer.

### 3.4 Goedkeuring nodig (`/overleg/goedkeuring`)
- Uitleg in gewone taal, hoofdknop "Vul je overleg zelf in" → `/overleg/zelf`.
- Optioneel e-mailadres IT + "Stuur uitleg" (gesimuleerd, bevestigingsmelding). Rechts voorbeeldbericht.

### 3.5 Login geblokkeerd (`/start/geblokkeerd`)
- Melding "Je bedrijf laat inloggen met Microsoft voor nieuwe apps niet toe". E-mail voorgevuld, naam, wachtwoord, "Account aanmaken" → `/overleg/zelf` (Outlook-optie niet meer aanbieden).
- Uitklapbaar: bericht/handleiding voor IT.

### 3.6 Voorbeelddata (`/voorbeeld`)
- Gevuld voorbeeldbedrijf, donkere balk "Voorbeeld" bovenaan met knop "Voeg je eigen overleg toe" → `/overleg`. Rondleiding van 3 stappen rechts (Volgende/Sluiten).
- Niets wordt bewaard.

### 3.7 Openstaande acties (`/acties`)
- Tot 3 rijen: Wat (tekst), Wie (naam of e-mail, met suggesties uit deelnemers + "Iemand anders toevoegen"), Tegen (optioneel).
- Rechts: acties verschijnen live op de agenda van het volgende overleg + uitleg dat ze terugkomen tot ze afgevinkt zijn.
- Geen uitnodigingen versturen zonder bevestiging.
- "Toon mijn overleg" en "Sla over" → `/app/overleg/:id`.

### 3.8 In de app
- `/app/overleg/:id`: succesmelding, overleg met agenda (Openstaande acties met afvinkbare acties, Lopende zaken met inline agendapunt toevoegen via Enter, Varia), knoppen "+ Actie" (altijd zichtbaar) en "Start overleg", checklist "Aan de slag" (1 van 4).
- `/app` zonder overleg: lege toestand 4b met snel aanmaken (naam, wanneer, hoe vaak), "Haal uit Outlook", "Bekijk eerst een voorbeeld", gestippelde preview-blokken, checklist 0 van 4.
- Modal "Andere overlegmomenten": opent alleen via het checklist-item of een knop "+ Overleggen toevoegen", nooit automatisch. Reeksen uit Outlook als aanvinkbare lijst + vrije rijen (Enter = nieuwe rij), geen maximum.

---

## 4. Simulatie van externe stappen

Een kleine **demo-balk** (alleen in prototype, inklapbaar, rechtsonder) om de uitkomst van gesimuleerde stappen te kiezen:
- Microsoft-login: slaagt / bedrijf blokkeert
- Agendatoestemming: reeksen gevonden / geen reeksen / IT-goedkeuring nodig / geannuleerd
- Knop "Reset demo" (alle state wissen)

Nepdata in één bestand (`lib/mock-data.ts`): gebruiker Jan Peeters, Metaalwerken; reeksen Productieoverleg (elke maandag 08:00–09:00, 6 deelnemers), Managementoverleg (om de 2 weken di 14:00–15:30, 4), Veiligheidsoverleg (eerste do van de maand 10:00–11:00, 8), Weekstart sales (elke maandag 09:30–10:00, 3); losse afspraken; deelnemers met initialen.

State: client-side (React context of zustand), bewaard in `localStorage` zodat herladen de flow niet breekt.

---

## 5. Stack en stijl

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui (zelfde basis als het too-doo-ontwikkelteam).
- Lettertype Nunito. Kleuren als CSS-variabelen/Tailwind-tokens:
  - primair `#0B5FD8` (hover `#08449C`), tekst `#16213A`, secundaire tekst `#3E4860` / `#5B6478`, randen `#C9D3E3` / `#E3E8F1`, achtergrond app `#F4F7FB`, succes `#1E7A4C` op `#E2F4EA`, waarschuwing `#8A4A06` op `#FFF4E5`.
  - rechterpaneel onboarding: verloop `#E3F2FD` → `#B9E3FA`, radius 24px.
- Componenten herbruikbaar opbouwen (OnboardingLayout, StepProgress, MeetingPreview, TimeInput, ChipSuggestions, ActionRow, Checklist), zodat ze later in de echte codebase kunnen.
- Toegankelijk: echte `<button>`/`<a>`/`<label>`, toetsenbordbediening, klikdoelen ≥ 44px, contrast AA.
- Responsief: op smalle schermen valt het rechterpaneel onder het formulier.

---

## 6. Buiten scope

Echte authenticatie, Microsoft Graph/Google API, e-mails versturen, backend of database, betalingen, meertaligheid (alleen NL).

---

## 7. Klaar als

- Elke route uit sectie 2 is bereikbaar en elke link/knop uit de mockups werkt.
- Alle uitkomsten uit sectie 4 zijn te tonen via de demo-balk.
- Elke route eindigt in `/app/overleg/:id` of `/app` (lege toestand); nergens een doodlopend scherm.
- Gegevens die in 2b/3 ingevuld worden, verschijnen in scherm 4.
- `npm run build` slaagt zonder fouten; lint en typecheck zijn schoon.
