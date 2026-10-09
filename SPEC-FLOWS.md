# Too-doo prototype – aanvulling: vier flows, flowkeuze en variant B

Deze aanvulling komt bovenop `SPEC.md`. Bij tegenstrijdigheid geldt dit document.
De map `design/` is vervangen door de laatste versie van alle mockups (variant A én B).

---

## 1. Wat er verandert in variant A (bestaande schermen)

Vergelijk de bestaande routes met de nieuwe mockups en pas aan waar nodig:

- **`/overleg` (Stap2-Overleg-Outlook.dc.html)**: het aparte keuzescherm bestaat niet meer. Drie toestanden in hetzelfde scherm:
  1. vóór toestemming: kaart "Haal je vaste overleggen uit Outlook" + knop; links "Maak handmatig een meeting", "Eerst rondkijken met voorbeelddata", **"Ik doe dit later" → `/app`** (lege toestand).
  2. reeksen gevonden: lijst (zoals voorheen).
  3. geen reeksen: melding + "Vul je overleg zelf in" + losse afspraken komende 2 weken als vertrekpunt (zie `Stap2a-Geen-reeksen`).
- **`/start` (Stap1-Account.dc.html)**: toestand B na "Doorgaan" met e-mail toont voornaam, achternaam en wachtwoord op hetzelfde scherm (zie mockup).
- **`/overleg/zelf` (Stap2b)**: uurveld = typen + knoppen −/+ per kwartier + uitklaplijst 06:00–20:00 (zie mockup).
- **`/app` lege toestand (Product-Leeg.dc.html)**: snel aanmaken met drie velden, "Haal uit Outlook", "Bekijk eerst een voorbeeld", gestippelde preview, checklist 0 van 4.

---

## 2. Flowkeuze (alleen voor het prototype)

Nieuwe route **`/prototype`**: een tussenscherm tussen website en proefperiode, om te kiezen welke flow je doorloopt. Dit scherm hoort niet bij het product; geef het een duidelijk andere, sobere stijl (grijze achtergrond, label "Prototype").

- De knoppen "Probeer gratis" en "Start gratis met Microsoft" op beide websites (`/` en `/b`) gaan naar `/prototype`.
- Per flow een kaart met: nummer, titel, één zin uitleg, de stappen als korte lijst (bv. "Account · Outlook · Lijst · Acties · App"), en een knop **"Start flow"**.
- "Start flow" **reset de demo-state**, zet de demo-uitkomsten van die flow (zie tabel), en navigeert naar het eerste scherm van de flow.
- Onder de vier kaarten een kleiner blok **"Randgevallen"** met directe startknoppen:
  - Microsoft-login geblokkeerd door bedrijf
  - Agenda vraagt goedkeuring IT-beheerder
  - Agenda gekoppeld, geen vaste overleggen
  - Eerst rondkijken met voorbeelddata
- Onderaan links naar: website variant A (`/`), website variant B (`/b`), en de reis van sales tot tweede overleg (`/b/reis`).

### De vier flows

| # | Flow | Demo-uitkomsten | Pad |
|---|---|---|---|
| 1 | **Outlook, overleg kiezen en aanvullen** | Microsoft: slaagt · Agenda: reeksen | `/start` → Microsoft → `/overleg` → toestemming → lijst → kies → `/acties` → `/app/overleg/:id` |
| 2 | **E-mail en wachtwoord, overleg zelf samenstellen** | Agenda: niet gebruikt | `/start` → e-mail → toestand B → `/overleg` → "Maak handmatig een meeting" → `/overleg/zelf` → `/acties` → `/app/overleg/:id` |
| 3 | **Outlook, overlegstructuur en acties uit notities (variant B)** | Microsoft: slaagt · Agenda: reeksen | `/start` → Microsoft → `/b/structuur` → `/b/acties` → `/b/overzicht` |
| 4 | **Inloggen en niets doen** | Microsoft: slaagt | `/start` → Microsoft → `/overleg` → "Ik doe dit later" → `/app` (lege toestand) |

In flow 3 gaat Microsoft-login rechtstreeks naar `/b/structuur`; de toestemming voor de agenda wordt gesimuleerd met een korte melding "Verbinden met Outlook…" (±800 ms) bij het openen van dat scherm. Bewaar de gekozen flow in de state (`flow: 1|2|3|4|null`) zodat de juiste vervolgschermen gekozen worden.

---

## 3. Navigatieknop naar de flowkeuze

Op **elk scherm behalve `/prototype`**:
- een kleine, vaste knop **rechtsboven** met een lijst-icoon (bv. lucide `List`), `aria-label="Terug naar flowkeuze"`, tooltip "Flowkeuze".
- Klikken gaat naar `/prototype` (zonder de state te wissen; resetten gebeurt pas bij "Start flow").
- Visueel duidelijk een prototype-element (donkergrijs, licht transparant, klein), en zo geplaatst dat het **niets overlapt** (taalkeuze op `/start`, knoppen in de app, voorbeeldbalk op `/voorbeeld` en `/b/voorbeeld`). Schuif hem desnoods onder de bovenste balk.
- Toon naast het icoon klein de actieve flow ("Flow 3"), als er een is.
- De bestaande demo-balk rechtsonder blijft voor handmatige overrides.

---

## 4. Variant B – nieuwe schermen

| Route | Mockup | Scherm |
|---|---|---|
| `/b` | `B0-Hero.dc.html` | Website variant B: "Zie wat blijft hangen. Voor het te laat is." |
| `/b/structuur` | `B2-Overlegstructuur.dc.html` | Zo stuur jij Metaalwerken aan (stap 2 van 3) |
| `/b/acties` | `B3-Acties-plakken.dc.html` | Acties uit notities: plakken, inspreken of typen (stap 3 van 3) |
| `/b/mail` | `B3b-Mail-eigenaar.dc.html` | Wat een eigenaar per mail ontvangt (voorbeeld) |
| `/b/overzicht` | `B4-Grip.dc.html` | Landen in het overzicht: dit volgt too-doo voor je op |
| `/b/voorbeeld` | `B5-Voorbeeld.dc.html` | Voorbeeld rond frustraties: "Herken je dit?" |
| `/b/reis` | `B6-Reis.dc.html` | Overzicht van de reis (referentiescherm, statisch) |

Stap 1 (account) is dezelfde als in variant A (`/start`).

### Gedrag

**`/b/structuur`**
- Lijst van de 5 reeksen uit de mock-data (voeg Kwaliteitsoverleg toe: om de 2 weken wo 11:00, 5 personen, deelnemer) met frequentie, rol (organisator/deelnemer) en deelnemers.
- Samenvattende zin bovenaan berekend uit de data (aantal overleggen, unieke collega's, uren per maand).
- Aanbevolen start = de reeks die de gebruiker organiseert met de meeste deelnemers (badge "aanbevolen start"); standaard aangevinkt samen met andere reeksen die hij organiseert en ≥ 4 deelnemers heeft.
- Knoptekst volgt het aantal aangevinkte overleggen ("Volg deze 2 overleggen op"); minstens één verplicht.
- "Mis je een overleg? Voeg het toe" → `/overleg/zelf` (keert daarna terug naar `/b/acties`).
- Rechterpaneel "Jouw overlegritme": weekraster met de aangevinkte reeksen in de primaire kleur, de rest grijs.
- De aangevinkte reeksen worden overleggen in de state.

**`/b/acties`**
- Kop noemt het aanbevolen overleg ("…sinds het vorige productieoverleg?").
- Drie tabbladen: **Plak notities** (standaard), **Inspreken**, **Zelf typen**.
  - Plak notities: tekstvak, voorgevuld met de voorbeeldtekst uit de mockup; knop "Haal de acties eruit".
  - Inspreken: grote opnameknop; simuleer 2 s "luisteren", daarna verschijnt een transcript (vaste voorbeeldtekst) in het tekstvak en volgt dezelfde verwerking.
  - Zelf typen: de rijen Wat / Wie / Tegen uit `/acties` (variant A).
- **Gesimuleerde extractie** (geen echte AI): na ±1 s laden, elke niet-lege regel wordt een voorstel. Herken eigenaars door voornamen uit de deelnemerslijst in de regel te zoeken; herken eenvoudige datumwoorden ("vrijdag", "volgende week", "voor vrijdag") en zet ze om naar een datum relatief aan vandaag. Een regel met "beslissen" of "beslissing" wordt een **agendapunt** in plaats van een actie. Geen eigenaar gevonden → oranje markering met knop "+ Wie?" (opent een keuzelijst met deelnemers).
- Elk voorstel heeft een vinkje (standaard aan); tekst, eigenaar en datum zijn inline aanpasbaar.
- Vaste melding: "[namen] krijgen hun acties per mail, met een herinnering voor de deadline. Pas na jouw bevestiging versturen we iets." met link **"Bekijk wat zij ontvangen"** → `/b/mail` (in een nieuw tabblad of als modal).
- "Bevestig N punten" → slaat acties en agendapunten op bij het overleg → `/b/overzicht`. "Overslaan" → `/b/overzicht` zonder acties.

**`/b/mail`**: statische weergave van de mail, ingevuld met de eerste actie met eigenaar uit de state (anders de voorbeelddata). Knoppen tonen alleen een melding "In het prototype niet actief".

**`/b/overzicht`**
- Tegels berekend uit de state: open acties, zonder eigenaar, beslissingen nodig, aantal opgevolgde overleggen.
- "Vraagt je aandacht": acties zonder eigenaar (knop "Wijs iemand aan" opent keuzelijst) en agendapunten die een beslissing vragen.
- "Wie doet wat": acties met eigenaar, datum of "mail verstuurd".
- "Volgend overleg": eerstvolgende datum van het aanbevolen overleg + aantal klaarstaande punten → `/app/overleg/:id`.
- Rechts "Wat er nu gebeurt" (statische tekst) en link "Volg ook je andere overleggen op" → modal 5.
- Zijbalk: item "Overzicht" (actief) bovenaan; "Vergaderingen" → `/app/overleg/:id`.

**`/b/voorbeeld`**: statisch, met balk "Voorbeeld" en knop "Zet het op voor jouw bedrijf" → `/prototype`. Gebruik de bedrijfsnaam uit de state als die er is, anders "Metaalwerken".

**`/b`**: website variant B; tweede knop "Bekijk een voorbeeldbedrijf" → `/b/voorbeeld`.

---

## 5. Klaar als

- `/prototype` toont de vier flows en de randgevallen; elke "Start flow" reset de state en doorloopt het juiste pad tot het eindscherm.
- De lijst-knop staat op elk scherm behalve `/prototype`, overlapt niets en brengt je terug.
- Alle schermen uit sectie 4 zijn bereikbaar en werken zoals beschreven; de extractie in `/b/acties` werkt ook op zelf geplakte tekst.
- Variant A is bijgewerkt volgens sectie 1.
- Build, lint en typecheck zijn schoon; het Playwright-script doorloopt de vier flows en de vier randgevallen.
