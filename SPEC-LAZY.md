# Too-doo prototype – Variant A · Lazy Registration

Dit document komt bovenop `SPEC.md` en `SPEC-FLOWS.md`. Bij tegenstrijdigheid geldt dit document.

**Kort:** wie op de website op "Probeer Too-doo gratis" klikt, landt meteen in de app zonder account. Een assistent zet samen met hem zijn eerste overleg klaar, met openstaande acties. Het account komt pas wanneer hij iets wil dat een identiteit vraagt (acties mailen naar eigenaars, of bewaren).

Alles wat vandaag gebouwd is, blijft bestaan als **Variant B · Classic Onboarding**.

Mockups: `design/variant-a-lazy/` (C0 t/m C6). Zoals eerder: lees de HTML en inline stijlen voor lay-out, teksten en kleuren, en bouw ze op met echte componenten. Het `<script type="text/x-dc">`-blok is geen productiecode.

| Mockup | Inhoud |
|---|---|
| `C0-Flow.dc.html` | Overzicht van de flow, regels voor het accountmoment, meetpunten (referentie, niet bouwen) |
| `C1-Meteen-in-app.dc.html` | Landen in de app, assistent biedt 3 eenvoudige tekstkeuzes |
| `C1b-Agenda-gekoppeld.dc.html` | Na 'Haal het uit mijn agenda' + koppelen: vaste overleggen kiezen |
| `C1c-Notities-gekozen.dc.html` | Na 'Ik heb notities': pas dan dropzone en plakken |
| `C2-Agent-begrijpt.dc.html` | Eén zin → overleg en agenda verschijnen live; '+'-menu in het chatveld open |
| `C2b-Plakken-herkend.dc.html` | Lange tekst geplakt in de chat → assistent herkent notities |
| `C3-Agent-acties.dc.html` | Notities plakken → acties op de agenda, ontbrekende eigenaar wordt een vraag |
| `C4-Overleg-klaar.dc.html` | Overleg klaar, voorstel om acties te mailen |
| `C5-Bewaren.dc.html` | Account als "bewaren" (modal over de app) |
| `C6-Na-bewaren.dc.html` | Na bewaren: e-mailadressen, mails versturen, Outlook als extra |

---

## 1. Twee varianten naast elkaar

### 1.1 Prototype-knop (rechtsboven, bestaat al) · update 12 okt
- Alleen het lijst-icoon, zonder letter of tekst ernaast (geen "A" of "B · Flow 3" meer). `aria-label="Prototype-menu"`, tooltip "Prototype".
- Klik opent een klein menu (popover, toetsenbord bedienbaar, sluit met Esc). Voorlopig met één item:
  - **Herstart demo** (icoon: draaiende pijl, lucide `RotateCcw`) → wist alle state (gast-state, demo-state, app-store) en opent `/` (de website).
- Bouw het menu als lijst van items, zodat er later makkelijk items bij kunnen.
- De keuze tussen Variant A en Variant B verdwijnt voorlopig uit dit menu. Variant B blijft bereikbaar via de URL `/prototype` (ongewijzigd).
- Positie, stijl en regel "overlapt niets" blijven zoals nu.

### 1.2 Naamgeving
- Variant B = alles wat nu bestaat: routes `/start`, `/overleg*`, `/acties`, `/voorbeeld`, `/b/*`, `/prototype`, en de app-schermen.
- De oude interne naam "variant B" voor de schermen onder `/b/*` verdwijnt uit de UI. Op `/prototype` heet flow 3 voortaan "Flow 3 · Overlegstructuur en acties uit notities". De kop van `/prototype` wordt "Variant B · Classic Onboarding".
- Variant A gebruikt routes onder `/probeer`.

### 1.3 Website
- `/` blijft de website, maar:
  - Hoofdknop "Probeer Too-doo gratis" → **`/probeer`** (Variant A), niet meer `/prototype`.
  - Onder de knop: "Geen account of agenda-koppeling nodig. Start direct in een proefomgeving."
  - Kop en tekst overnemen uit C0: label "Overleggen zonder losse eindjes", kop "Van overleg naar duidelijke acties.", tekst "Maak in enkele minuten je eerste meeting klaar."
- `/b` (website van de oude grip-variant) blijft bereikbaar via Variant B.

---

## 2. Gast-state (proefomgeving)

- Aparte store (zustand, persist in `localStorage` onder `toodoo-guest`): `guestId`, `createdAt`, `step` (1|2|3|done), `meeting` (naam, dag, uur, duur, frequentie, deelnemers, agendapunten), `actions` (tekst, eigenaar, datum, bevestigd), `decisions`, `conversation` (berichten van de assistent en de gebruiker).
- Vervalt na 7 dagen (bij openen ouder dan 7 dagen → leeg starten).
- Terugkeer met bestaande gast-state: de app opent in de laatste toestand, met in de assistent het bericht "Welkom terug. Je productieoverleg staat er nog. Bewaar het wanneer je wilt."
- **Bij bewaren** (sectie 6) wordt alles overgezet naar de bestaande app-store die Variant B gebruikt, zodat dezelfde app-schermen (`/app/overleg/:id`, acties, checklist) werken. Niets opnieuw ingeven.
- "Reset" in de demo-balk wist ook de gast-state.

---

## 3. Layout van de proefomgeving (`/probeer`)

Drie kolommen, zie C1–C4:
1. **Zijbalk**: zoals de app (Dashboard, Vergaderingen, Acties, Beslissingen). Onderaan "Nog niet bewaard · Je werk staat op dit toestel" en vanaf C4 een knop "Bewaar je overleg".
2. **Hoofdvlak**: het echte overleg in opbouw, **in de vorm van het bestaande detailscherm van een overleg** (update 12 okt). Hergebruik de bestaande componenten van het detailscherm; bouw geen apart onboardingscherm.
   - **Zelfde skelet, minder lagen.** Zichtbaar zoals altijd: statuslabel ("Concept", na stap 3 "Gepland"), titel, datumregel met avatars van de deelnemers, knop "Start overleg" rechtsboven (uitgeschakeld tot stap 3), "Agendapunten" als blokkaarten met sleepgreep, en het blok "Openstaande acties" met terugkeer-icoon.
   - **Verborgen tot er inhoud is** (zelfde plek zodra ze verschijnen): het infopaneel (vestiging, type, lokaal, prep score), de tabs (Beslissingen, Notities, Acties, Deelnemers), het tijdsbudget, tellers die op 0 staan, type-labels (Bespreken, Informeren) en "Open acties overslaan". De knoppen "Blok / Item / Pauze toevoegen" worden: per thema een inline regel "+ Agendapunt toevoegen" en onderaan één knop "+ Thema".
   - **Twee niveaus, zoals in het product: thema's (blokken) met agendapunten eronder.** Kop "Agenda". Elk thema (behalve Openstaande acties) eindigt met een lichte inline regel "+ Agendapunt toevoegen" (tekstveld, Enter maakt het punt aan en de focus blijft). Onderaan de agenda één ghost-knop "+ Thema" (maakt een nieuw blok). Geen "Pauze toevoegen" in de onboarding. Geen coachmarks of producttour: de structuur wordt duidelijk door de inhoud. De assistent zet voorgestelde onderwerpen als thema's en plaatst gevonden punten **onder** het juiste thema (bv. "Planning week 42" onder "Knelpunten en beslissingen"). Vrije tekst als "zet X onder Orders" of "maak een thema Veiligheid" werkt ook via de assistent.
   - **Per agendapunt: tellers en "+", zoals in het detailscherm.** Rechts op de rij de tellers voor beslissingen, acties, notities en documenten, **alleen als ze groter zijn dan 0**, zonder kolomkoppen. Klikken op een teller opent een popover met die items. Bij hover of focus verschijnt een "+" die een menu opent: Beslissing / Actie / Notitie / Document (C4). Bij extractie uit notities krijgt een agendapunt de bronregel als notitie (teller "1"), zodat zichtbaar is waar het vandaan komt (C3). Dit is dezelfde component als in het detailscherm, niet nagebouwd.
   - **Openstaande acties** staat bij het eerste overleg **opengeklapt** met de acties als rijen (vinkje, tekst, eigenaar, datum). Later gedraagt het blok zich zoals vandaag (ingeklapt met "N openstaande acties, M te laat").
   - Wat de assistent invult, licht 2 s op **in de titel, de datumregel en de avatars zelf** (blauwe markering); agendapunten die een voorstel zijn, krijgen het label "voorstel" tot de gebruiker bevestigt. Geen apart veldenraster.
   - Lege toestand (C1): titel "Je eerste overleg" en datumregel "Wanneer? · Wie zit erbij?" in gedempte kleur, blokken gestippeld. Alles is rechtstreeks aanpasbaar: klikken op titel, datumregel of avatars maakt ze bewerkbaar.
   - Gebruik overal de bestaande benamingen van het product (Nederlandse versie), bv. altijd "Openstaande acties".
3. **Assistentpaneel** rechts (380–440 px): kop "Assistent · stelt voor, jij beslist", voortgang "1 van 3" / "2 van 3" / "3 van 3", berichten, invoer onderaan met tekstvak, microfoonknop en verzendknop. Inklapbaar (knop `>`); ingeklapt blijft een smalle knop "Assistent" zichtbaar.

Bovenaan het hoofdvlak een **neutrale** balk (geen geel): "Proefomgeving: geen account nodig. Je werk blijft 7 dagen op dit toestel staan; bewaren kan op elk moment." met link "Ik heb al een account" (opent het bewaar-modal in login-modus).

Op smalle schermen (<1024 px): assistentpaneel wordt een onderblad dat half opent; zijbalk wordt een menuknop.

---

## 4. De assistent (gesimuleerd, geen echte AI)

Alles regelgebaseerd en deterministisch, in één module (`lib/assistant/`), zodat het later vervangen kan worden door een echte LLM-aanroep met dezelfde in- en uitvoer.

**Principe: de assistent vult alleen in wat de gebruiker zei. Wat ontbreekt, wordt gevraagd. Nooit verzinnen.** Elk voorstel is zichtbaar als voorstel (blauwe rand, label "voorstel") tot de gebruiker bevestigt.

Typ-indicator (3 puntjes, 600–900 ms) voor elk antwoord. Velden die net ingevuld werden, krijgen 2 s een blauwe markering (C2).

### Stap 1 · Waarmee wil je starten? (C1, C1b, C1c) · update 12 okt (vereenvoudigd)
Eén bericht: "Je eerste overleg staat in twee minuten klaar. **Waarmee wil je starten?**"

Daaronder **drie eenvoudige keuzes als tekstregels** (icoon, korte tekst, chevron; één regel hoog, ≥ 48 px). **Geen knoppen, dropzones of uitleg in de keuzes zelf.** De details verschijnen pas na de keuze, als volgend bericht van de assistent:

1. **Haal het uit mijn agenda** → antwoord van de gebruiker verschijnt als bubbel, assistent vraagt "Outlook of Google?" met twee knoppen.
   - Gesimuleerd met de bestaande demo-uitkomsten voor agendatoestemming (reeksen gevonden / geen reeksen / IT-goedkeuring nodig / geannuleerd) en Microsoft-login (slaagt / bedrijf blokkeert).
   - Koppelen = inloggen. Bij succes: gebruiker wordt aangemaakt (Tom Claes uit de mock-data), gast-state gaat over naar de app-store, banner "Verbonden met Outlook als … Je werk wordt vanaf nu automatisch bewaard.", zijbalk toont naam + "Proefperiode · nog 30 dagen". Het bewaar-modal (sectie 6) wordt daarna niet meer getoond; "Ja, stuur ze" in stap 3 gaat meteen naar de e-mailadressen (sectie 7).
   - **C1b**: radiolijst met vaste overleggen (dat wat de gebruiker organiseert met de meeste deelnemers bovenaan, label "jij organiseert"), knop "Dit overleg opvolgen", tekst "Staat het er niet tussen? Vertel het me." Het overleg vult titel, datumregel, avatars en een agendapunt uit de uitnodiging in als voorstel. Daarna stap 2.
   - Geen reeksen → "Ik vond geen vaste overleggen in je agenda." + losse afspraken komende 2 weken, of "Vertel het me".
   - IT-goedkeuring nodig, geannuleerd of login geblokkeerd → rustige melding in de assistent ("Je bedrijf moet dit eerst goedkeuren. Geen probleem: vertel het me of gebruik notities.") en de twee andere keuzes worden opnieuw aangeboden als tekstregels. Geen foutpagina.
2. **Ik heb notities van de vorige keer** → **C1c**: assistent "Top. Sleep ze hierheen of plak de tekst. Ik haal de acties en eigenaars eruit." met een dropzone (Sleep een bestand hierheen · Word, PDF, e-mail of foto · knop Kies bestand) en "Of plak de tekst hieronder in het chatveld." De placeholder van het chatveld wordt "Plak je notities hier".
   - Ondersteun .txt, .md, .docx, .pdf, .eml en afbeeldingen. .txt/.md/.eml echt inlezen; .docx via mammoth en .pdf via pdfjs-dist, anders de vaste voorbeeldtekst. Afbeeldingen: bestandsnaam tonen en de voorbeeldtekst gebruiken (geen OCR). Toon altijd welk bestand verwerkt wordt.
   - Daarna stap 2 met de extractie. Naam van het overleg wordt gevraagd als die niet uit de notities blijkt.
3. **Ik vertel het je** → assistent "Waarover gaat je volgende overleg? Eén zin is genoeg." en focus op het chatveld (C2).

Onder de keuzes de tekstlink **Of bekijk eerst een voorbeeld** → bestaande `/voorbeeld` (Stap2d), met de knop in de voorbeeldbalk terug naar `/probeer`.
Vrije tekst in het chatveld werkt meteen, zonder eerst te kiezen (zie "Ingangen blijven bereikbaar").

Het blok "Openstaande acties" in het overleg toont in de lege toestand de regel "Sleep notities van je vorig overleg op deze plek, of kies een bestand." en accepteert slepen.

**Elke vraag van de assistent verschijnt precies één keer.** Een keuze maken of tekst sturen voegt één antwoord toe; dubbel renderen (bv. door React Strict Mode of een effect dat twee keer loopt) mag niet voorkomen.

### Ingangen blijven bereikbaar, ook na stap 1 (C1, C2, C2b, C3) · update 12 okt
De drie startopties worden **niet** permanent opnieuw als chips getoond. Ze blijven bereikbaar op vier manieren:

1. **"+"-knop links in het chatveld** (op elk scherm met de assistent, ook na bewaren). `aria-label="Toevoegen: notities, bestand of agenda"`, opent een menu (shadcn DropdownMenu) met:
   - Notities plakken → opent een tekstvak in de chat;
   - Bestand kiezen (Word, PDF, foto) → bestandskiezer, zelfde verwerking als de dropzone;
   - Agenda koppelen (Outlook, Google) → zelfde pad als "Uit mijn agenda" (C1b).
2. **De assistent herkent de intentie, op elk moment:**
   - **Plakken:** een geplakte tekst van ≥ 3 regels of ≥ 200 tekens die niet als antwoord op een vraag om notities komt → bericht "Dit lijken notities van een vorig overleg. Zal ik er de openstaande acties en agendapunten uit halen?" met **Ja, verwerk** (extractie, stap 2) en **Nee, gewoon bericht** (verwerk als gewone zin) (C2b).
   - **Typen:** zinnen als "koppel mijn agenda", "haal uit outlook/google", "ik heb notities", "notities uploaden" voeren die actie meteen uit (zelfde als het menu). Vrije tekst moet altijd werken.
   - **Slepen:** een bestand slepen werkt op **het hele assistentpaneel** (overlay "Laat los om je notities te verwerken") én op het blok "Openstaande acties" in het hoofdvlak.
3. **Contextueel in het overleg:** zolang wanneer of deelnemers leeg zijn, staan in de datumregel subtiele links **"Uit agenda halen"** (vult dag, uur en herhaling) en **"Deelnemers uit agenda"** (C1). Beide starten het agendapad; na koppelen kiest de gebruiker de reeks en worden alleen die velden ingevuld. De links verdwijnen zodra het veld gevuld is.
4. **Eén proactieve herinnering:** zodra naam, wanneer en deelnemers ingevuld zijn en er nog geen openstaande acties zijn, zegt de assistent **één keer**: "Heb je notities van de vorige keer? Plak ze hier, dan staan de openstaande acties meteen klaar." (C3). Nooit herhalen, ook niet na herladen (bewaar `notesReminderShown` in de gast-state). Wordt het genegeerd, dan blijft de "+"-knop de weg.

### Zin begrijpen (C2)
Parser op de zin van de gebruiker (Nederlands, hoofdletterongevoelig):
- **Naam**: bekende types (productie-, management-, veiligheids-, kwaliteits-, team-, directie-, sales-overleg, weekstart, MT, directiecomité). Anders: het eerste zinsdeel tot de eerste komma, dubbele punt of "met", met hoofdletter.
- **Frequentie**: "elke week/wekelijks/elke maandag" → wekelijks; "om de 2 weken/tweewekelijks" → om de 2 weken; "maandelijks/elke maand" → maandelijks.
- **Dag**: maandag t/m vrijdag (ook ma, di, …).
- **Uur**: "8u", "8u30", "8:30", "om 9", "09.00" → HH:MM.
- **Duur**: "een uurtje/1u/uur" → 60, "half uur/30 min" → 30, "anderhalf uur/1u30" → 90. Niet genoemd → 60, als voorstel gemarkeerd.
- **Deelnemers**: namen na "met", gesplitst op komma's en "en".
- **Agenda**: onderwerpen na ":" of "over", gesplitst op komma's en "en". Herkenbare woorden omzetten: orders → "Lopende orders", problemen/knelpunten → "Knelpunten en beslissingen", planning → "Planning komende week", veiligheid/incidenten → "Veiligheid en incidenten", kwaliteit → "Kwaliteit en klachten"; anders het onderwerp met hoofdletter. Geen onderwerpen → standaard "Lopende zaken" en "Varia".
- **Openstaande acties** staat altijd als eerste agendablok.

Antwoord: "Begrepen. Links staat een voorstel van agenda, met een plek voor openstaande acties bovenaan. Klopt dit?" + samenvattingskaart (Overleg, Wanneer, Deelnemers) + knoppen **Klopt** en **Iets aanpassen**.
- Ontbreekt dag/uur → eerst vragen "Wanneer gaat het door?" met chips (ma–vr) en daarna uur-chips (08:00, 09:00, 10:00, 14:00) + vrij veld.
- Ontbreken deelnemers → "Wie zit er meestal bij? Voornamen volstaan." (overslaan mag: "Later").
- **Iets aanpassen** → zet de velden in het hoofdvlak in bewerkmodus, focus op het eerste veld.
- **Klopt** → stap 2.

### Stap 2 · Openstaande acties (C3)
Vraag: "Wat werd er vorige keer afgesproken dat nog niet af is? Plak je notities of een mail, spreek het in, of typ het gewoon." + knop "Ik heb niets openstaan" (gaat naar stap 3 met lege actielijst).
- **Hergebruik de bestaande extractie uit `/b/acties`** (eigenaars uit deelnemerslijst, datumwoorden, "beslissen/beslissing" → agendapunt).
- Microfoon: zelfde simulatie als in `/b/acties` (2 s luisteren, vaste transcriptie).
- Resultaat verschijnt **op de agenda in het hoofdvlak**, niet in de chat: blok "Openstaande acties" met blauwe rand en label "N voorstellen · vink aan wat klopt", rijen met vinkje, tekst, eigenaar, datum (inline aanpasbaar). Beslissingen komen onder het eerste agendapunt met label "beslissing nodig".
- Antwoord in de chat: "Ik vond N acties en M beslissing(en). Ze staan links op de agenda; vink uit wat niet klopt."
- Per actie zonder eigenaar: vraag "Wie [actie]?" met chips van de deelnemers + "Ikzelf" + "Later beslissen". In het hoofdvlak oranje rij met "+ Wie?".
- Een vrije zin als "Karim belt, tegen woensdag" vult eigenaar en datum van de open vraag in.
- Knop **Zet ze op de agenda** → stap 3.

### Stap 3 · Overleg klaar (C4)
- Hoofdvlak: succesbalk "Je [overleg] van [dag] staat klaar. N acties komen vanzelf aan bod tot ze af zijn.", label "Concept" verdwijnt, knoppen "+ Actie" en "Start overleg" (zoals in de app).
- Assistent: korte bevestiging, daarna het voorstel: "**Zal ik [namen] hun actie nu al mailen?** Met een herinnering voor de deadline." + voorbeeldkaart van de mail voor de eerste eigenaar (onderwerp, actie, datum, knoppen "Afgewerkt" en "Andere datum", "[naam] heeft geen account nodig").
- Knoppen: **Ja, stuur ze** (bewaar-modal, intent `send`), **Alleen bewaren** (bewaar-modal, intent `save`), **Nog even rondkijken** (sluit voorstel; de knop "Bewaar je overleg" blijft in de zijbalk).
- Chips eronder: "Toon hoe het overleg verloopt" (opent bestaande overlegmodus), "Nog een overleg toevoegen" (herstart stap 1 voor een tweede overleg).
- Geen acties? Dan biedt de assistent "Alleen bewaren" aan en "Nodig deelnemers uit" als reden.

---

## 5. Wanneer het account gevraagd wordt
Alleen bij een handeling die een identiteit vraagt, nooit op een timer of bij het openen:
- Acties mailen naar eigenaars (hoofdmoment)
- Een collega uitnodigen
- "Start overleg" en daarna het verslag versturen
- Agenda koppelen
- Zelf op "Bewaar" klikken (zijbalk, of "Ik heb al een account")

Alle wegen openen hetzelfde bewaar-modal met de juiste `intent` (bepaalt de kop en wat er na het bewaren gebeurt).

---

## 6. Bewaar-modal (C5)
- Modal over de gedimde app, focus-trap, sluiten met kruis, Esc of "Nog niet, ik kijk verder rond" (niets gaat verloren).
- Kop: "Bewaar je overleg. Het blijft precies zoals het is." Tekst hangt af van `intent` (send: "Dan versturen we de mails in jouw naam…").
- **Doorgaan met Microsoft** (gesimuleerd met de bestaande demo-uitkomsten: slaagt → bewaard; bedrijf blokkeert → melding in het modal "Inloggen met Microsoft lukt niet bij je bedrijf. Gebruik je werk-e-mail." en focus op het e-mailveld). Alleen login, nog geen agendatoestemming.
- **Doorgaan met Google** (slaagt altijd).
- **Werk-e-mail** + "Stuur me een code" → zelfde modal toont 6 invoervakjes voor de code (plakken van 6 cijfers werkt, elke code van 6 cijfers is geldig in het prototype), link "Code opnieuw sturen". Geen wachtwoord, geen magische link.
- Rechterpaneel: "Dit bewaren we voor je" met naam, ritme, aantal acties met eigenaar, beslissingen, deelnemers (berekend uit de gast-state), en bij intent `send`: "Daarna meteen verstuurd".
- Na succes: gast-state → app-store (sectie 2), gebruiker heet zoals bij Microsoft/Google of afgeleid uit het e-mailadres (`tom.claes@…` → Tom Claes), bedrijf uit het domein. Navigeer naar `/app/overleg/:id?welkom=1`.

---

## 7. Na bewaren (C6)
In `/app/overleg/:id?welkom=1`, met hetzelfde assistentpaneel rechts (blijft daarna beschikbaar en inklapbaar):
- Succesbalk "Bewaard, [voornaam]. Je [overleg] staat in je account." Zijbalk onderaan: naam + "Proefperiode · nog 30 dagen".
- Bij intent `send`: de assistent vraagt de e-mailadressen van de eigenaars, met het domein van de gebruiker vooraf ingevuld (`jan@metaalwerken.be`, aanpasbaar). Ontbrekende adressen blokkeren niet: knop "Verstuur N mails" (N = aantal ingevulde) + "[naam] later". Na versturen: toast + badge "mail verstuurd" bij de actie, ontbrekende krijgen "e-mailadres ontbreekt".
- Daarna: "Wil je ook je andere vaste overleggen opvolgen? Ik kan ze uit je Outlook-agenda halen, of je zegt ze me gewoon." → **Haal uit Outlook** opent het bestaande modal "Andere overlegmomenten" (met de demo-uitkomsten voor agendatoestemming, inclusief IT-goedkeuring nodig), **Ik zeg ze zelf** → assistent vraagt een zin (zelfde parser), **Later**.
- Checklist "Aan de slag" 2 van 4: eerste overleg met acties ✓, acties gemaild ✓ (bij `send`), andere overleggen toevoegen, maandag het overleg houden.

---

## 8. Meetpunten (voorbereiden, nog niet koppelen)
Maak een kleine `track(event, props)` helper die nu naar de console logt (en later naar PostHog kan). Events:
`cta_clicked` (variant, locatie) · `trial_app_opened` · `assistant_entry_chosen` (meeting/notes/example) · `assistant_message_sent` · `meeting_parsed` (welke velden gevonden) · `meeting_confirmed` · `actions_extracted` (aantal, zonder eigenaar) · `first_action_with_owner` · `meeting_ready` · `save_prompt_shown` (intent, trigger) · `signup_method_selected` · `sso_result` (success/blocked) · `signup_completed` · `owner_mails_sent` (aantal) · `guest_returned`.

---

## 9. Klaar als
- De Flowkeuze-knop toont beide varianten met de exacte namen uit 1.1 en elke keuze start de juiste flow; Variant B werkt exact zoals vandaag.
- Website-CTA leidt naar `/probeer`; zonder account kan je een overleg met agenda en acties afwerken tot C4.
- De parser uit sectie 4 werkt op minstens deze zinnen (zet ze in unit tests):
  - "Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim: lopende orders, problemen en planning."
  - "managementoverleg om de 2 weken op dinsdag 14u30, anderhalf uur"
  - "teamoverleg met Els en Bram" (moet naar dag en uur vragen)
  - "Veiligheidsoverleg maandelijks" (moet naar dag, uur en deelnemers vragen)
- Niets wordt ingevuld dat niet in de invoer stond, behalve duur 60 min (als voorstel gemarkeerd) en de standaard agendablokken.
- Herladen of later terugkomen op hetzelfde toestel behoudt de gast-state; ouder dan 7 dagen start leeg.
- Bewaren via elke methode zet alles over naar de app zonder verlies; Microsoft "geblokkeerd" valt terug op e-mail met code.
- `npm run build`, lint en typecheck zijn schoon; Playwright doorloopt: Variant A volledig (ingang overleg), Variant A via notities, Variant A met Microsoft geblokkeerd, en de 4 flows van Variant B.
