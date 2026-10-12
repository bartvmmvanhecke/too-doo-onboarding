# Too-doo prototype – Variant A · Lazy Registration

Dit document komt bovenop `SPEC.md` en `SPEC-FLOWS.md`. Bij tegenstrijdigheid geldt dit document.

**Kort:** wie op de website op "Probeer Too-doo gratis" klikt, landt meteen in de app zonder account. Een assistent zet samen met hem zijn eerste overleg klaar, met openstaande acties. Het account komt pas wanneer hij iets wil dat een identiteit vraagt (acties mailen naar eigenaars, of bewaren).

Alles wat vandaag gebouwd is, blijft bestaan als **Variant B · Classic Onboarding**.

Mockups: `design/variant-a-lazy/` (C0 t/m C6). Zoals eerder: lees de HTML en inline stijlen voor lay-out, teksten en kleuren, en bouw ze op met echte componenten. Het `<script type="text/x-dc">`-blok is geen productiecode.

| Mockup | Inhoud |
|---|---|
| `C0-Flow.dc.html` | Overzicht van de flow, regels voor het accountmoment, meetpunten (referentie, niet bouwen) |
| `C0f-Split-welkom.dc.html` | Welkom: illustratie links, assistent rechts met de drie keuzes |
| `C0g-Split-vertellen.dc.html` | Keuze gemaakt: gesprek loopt verder in hetzelfde paneel |
| `C0h-Aandokken.dc.html` | Tijdens de overgang: illustratie wordt de vergadering |
| `C0i-Overgang.dc.html` | Demo-lus van de overgang (timing en richting, geen bouwklare animatie) |
| `C1-Meteen-in-app.dc.html` | In de app na 'Ik vertel het': titel en agenda ingevuld, één vraag |
| `C1d-Leeg.dc.html` | 'Begin met een lege vergadering': standaardagenda, assistent ingeklapt |
| `C1b-Agenda-gekoppeld.dc.html` | In de app na koppelen: vaste vergaderingen kiezen |
| `C2-Agent-begrijpt.dc.html` | Eén zin → overleg en agenda verschijnen live; '+'-menu in het chatveld open |
| `C2b-Plakken-herkend.dc.html` | Lange tekst geplakt in de chat → assistent herkent notities |
| `C3-Agent-acties.dc.html` | Notities plakken → acties op de agenda, ontbrekende eigenaar wordt een vraag |
| `C4-Overleg-klaar.dc.html` | Overleg klaar, voorstel om acties te mailen |
| `C4s-Smal.dc.html` | Zelfde scherm onder 720 px: eigenschappen onder de titel |
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
   - **Knop "Start overleg" (update 12 okt):** rechts in de kop, **top-aligned met de titel** van het overleg (niet met het statuslabel erboven en niet onderaan uitgelijnd): statuslabel staat boven de rij; de rij is `titel+datumregel | knop` met `align-items: start`. Op < 720 px schuift de knop onder de datumregel. De knop is **uitgeschakeld (grijs, `disabled`)** zolang er geen enkel agendapunt is; thema's zonder punten en openstaande acties tellen niet. Tooltip op de uitgeschakelde knop: "Voeg eerst een agendapunt toe" (wikkel de knop in een span zodat de tooltip ook bij disabled werkt). Zodra er één agendapunt is, wordt hij primair (blauw), zonder animatie.
   - **Agendapunten aanmaken en verslepen (update 12 okt):** onder **elk** thema kan je agendapunten aanmaken met de inline regel "+ Agendapunt toevoegen", ook onder thema's die de assistent voorstelde en onder een nieuw "+ Thema". Agendapunten zijn versleepbaar via het grip-handvat: binnen een thema (volgorde) én naar een ander thema. Thema's zelf zijn ook versleepbaar; "Openstaande acties" blijft altijd bovenaan en is geen doel voor agendapunten. Tijdens het slepen een duidelijke invoeglijn en een licht opgelicht doelthema; een leeg thema toont een drop-zone. Hergebruik de bestaande drag-and-drop van de vergaderdetailpagina als die er is; anders `@dnd-kit` (sortable, met toetsenbordsensor). Toegankelijk: het handvat is een knop (`aria-label` "Verplaats [titel]"), met spatie oppakken, pijltjes verplaatsen (ook over themagrenzen), spatie neerzetten, Escape annuleert, met een aria-live melding ("[titel] verplaatst naar [thema], positie 2"). Elke wijziging wordt meteen in de gast-state bewaard.
   - **Per agendapunt: tellers en "+", zoals in het detailscherm.** Rechts op de rij de tellers voor beslissingen, acties, notities en documenten, **alleen als ze groter zijn dan 0**, zonder kolomkoppen. Klikken op een teller opent een popover met die items. Bij hover of focus verschijnt een "+" die een menu opent: Beslissing / Actie / Notitie / Document (C4). Bij extractie uit notities krijgt een agendapunt de bronregel als notitie (teller "1"), zodat zichtbaar is waar het vandaan komt (C3). Dit is dezelfde component als in het detailscherm, niet nagebouwd.
   - **Rij-opbouw: één regel, eigenschappen in een vaste kolom (update 12 okt).**
     - Agendapunt (CSS grid): `[grip 14px] [titel 1fr, afkappen met …, volledige titel bij hover] [doel 96px] [eigenaar 32px] [duur 64px] [tellers 64px] [+ 32px]`. Doel, eigenaar en duur staan zo bij elk punt op dezelfde x-positie, links uitgelijnd binnen hun kolom. Lege waarden houden hun plek (eigenaar zonder waarde = gestippelde cirkel met "+", "Eigenaar kiezen"; doel en duur blijven leeg). Doel = Bespreken / Informeren / Beslissen, alleen als gekozen of herkend.
     - Openstaande actie: `[vinkje 22px] [titel 1fr] [eigenaar + naam 150px] [datum-chip 104px]`.
     - Rechts enkel tellers (> 0) en "+". Het "+" verschijnt bij hover en `:focus-within`; op touch altijd zichtbaar.
     - **Onder 720 px** schuiven doel, eigenaar en duur (resp. eigenaar en datum) op een tweede regel onder de titel; tellers en "+" blijven op de eerste regel (zie `C4s-Smal`).
   - Een punt dat uit notities als beslissing herkend wordt, krijgt het **doel "Beslissen"** (chip), geen apart label "beslissing nodig".
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

### Stap 0 · Welkom als gesplitst scherm dat aandokt (C0f–C0h) · update 12 okt
"Probeer Too-doo gratis" opent `/probeer`. Zolang de gast nog niet gestart is, toont `/probeer` een **gesplitst welkomstscherm**:

- **Links (alles behalve de assistent):** logo + zin, illustratie en slottekst vormen één verticaal gecentreerd blok (± 44 px tussenruimte), alle tekst gecentreerd; donkerblauw verloop met groot logo (± 40 px) en "Van losse punten in je overleg naar duidelijke opvolging." bovenaan, en een **geanimeerde illustratie** (loop van 12 s, pure CSS, zie C0f): (1) agendakaart "Productieoverleg · maandag / Lopende orders", het punt "Staal-leverancier blijft te laat leveren" licht op; (2) een lijn tekent naar een **actie** "Staal-leverancier opnieuw bellen · Sofie · vr 16 okt"; (3) een tweede lijn naar een **beslissing** "We werken met een andere leverancier" (chip Beslissen); (4) de actie wordt afgevinkt ("Afgevinkt door Sofie, via mail", doorgestreept); (5) de beslissing wordt bevestigd ("Bevestigd in het overleg"); (6) het agendapunt wordt doorgestreept en eronder verschijnt een nieuw agendapunt "Nieuwe staal-leverancier bevestigen" (label "nieuw"); (7) reset en herbegin. Onderaan: **"Wat je afspreekt, gebeurt ook."** + "Uit elk agendapunt komen acties en beslissingen. Wat af is, verdwijnt. Wat volgt, staat al klaar." Bij `prefers-reduced-motion`: de eindtoestand statisch. Illustratie `aria-hidden`, teksten leesbaar. Bouw de illustratie als één zelfstandige component (`components/onboarding/MeetingToActionIllustration.tsx`), zodat ze ook op de website herbruikbaar is.
- **Rechts: het assistentpaneel zelf, op exact dezelfde breedte en plek als in de app (400 px)**, zodat het bij de overgang niet beweegt. Zelfde component: logo + "Inloggen" bovenaan, label "Assistent", kop **"Welkom bij Too-doo. Laten we je eerste overleg klaarzetten."** (twee regels), subtekst **"Kies wat je al bij de hand hebt. Je kunt alles later aanpassen."**, drie keuzes in deze volgorde:
  1. **Vertel het me** · Beschrijf je overleg in één zin — de hoofdroute.
  2. **Gebruik notities van een vorig overleg** · Plak tekst, upload een bestand of spreek in.
  3. **Haal het uit mijn agenda** · Outlook of Google, optioneel.
  
  Daaronder, gescheiden door een lijn, twee secundaire links: **Start met een lege meeting** (→ C1d) en **Bekijk eerst een voorbeeld** (→ `/voorbeeld`). Onderaan het gewone chatveld met "+"-knop; vrije tekst werkt meteen als "Vertel het me".
- **Na een keuze loopt het gesprek verder in hetzelfde paneel** (C0g): de keuze verschijnt als antwoordbubbel, de assistent stelt de vervolgvraag:
  - *Vertel het me* → "Waarover gaat je volgende overleg? Eén zin is genoeg. Wie en wanneer mag erbij, hoeft niet." Focus op het chatveld.
  - *Notities* → bericht met dropzone (Sleep een bestand hierheen · Word, PDF, e-mail, foto of geluidsopname · Kies bestand), knop **Inspreken** en "Of plak de tekst in het chatveld". Verwerking zoals eerder (.txt/.md/.eml inlezen, .docx mammoth, .pdf pdfjs-dist, anders/afbeelding/opname de vaste voorbeeldtekst, opname toont eerst "Opname wordt uitgeschreven…").
  - *Agenda* → bericht met knoppen Outlook en Google + "We lezen alleen je vaste vergaderingen. Je logt meteen in, zodat je werk bewaard blijft." Koppelen = inloggen (demo-uitkomsten). Mislukt het: rustige melding in het gesprek en de twee andere keuzes opnieuw aangeboden.
- **Wisselen zonder terug te moeten (C0g):** onderaan elk vervolgbericht van de assistent staat, gescheiden door een dunne lijn, één kleine grijze regel met twee tekstlinks naar de andere keuzes: na *Vertel het me* "Liever anders? **Gebruik notities** · **Haal uit agenda**"; na *Notities* "Liever anders? **Vertel het me** · **Haal uit agenda**"; na *Agenda* "Liever anders? **Vertel het me** · **Gebruik notities**". Een link start dat pad meteen (de keuze verschijnt als nieuwe antwoordbubbel). De regel verdwijnt zodra de gebruiker begint te typen, een bestand toevoegt of een antwoord stuurt; daarna blijven de "+"-knop en de eenmalige herinnering over notities de weg. Geen chips of kaarten opnieuw tonen.
- **Lege meeting en voorbeeld blijven bereikbaar, maar niet in de chat (C0f–C0h):**
  - In de kop van het assistentpaneel staat een knop **"⋯" (Meer opties)**, met een menu (shadcn DropdownMenu):
    - **Bekijk een voorbeeld** · "Je eigen werk blijft bewaard" → `/voorbeeld`; de voorbeeldbalk krijgt dan de knop **"Terug naar mijn overleg"** die terugkeert naar de laatste toestand van `/probeer`.
    - **Zelf verder zonder assistent** · "Start met een lege meeting" → C1d. Alleen getoond zolang er nog geen overleg is aangemaakt.
  - **Na de overgang (C1f, C1g) · update 12 okt:** de assistentkop heeft **"⋯"** en een sluitknop **×** (`aria-label` "Assistent sluiten", tooltip "Sluiten · je vindt me rechtsonder"). De badge "1 van 3" vervalt. Het ⋯-menu bevat dan:
    - **Bekijk een voorbeeldagenda** · "Je eigen overleg blijft bewaard" → `/voorbeeld` (met "Terug naar mijn overleg").
    - **Assistent sluiten** · "Je werkt zelf verder. Ik sta rechtsonder." (zelfde als ×).
  - **Ook via de chat:** zinnen als "ik doe het zelf", "sluit maar", "laat maar", "toon een voorbeeld" voeren dezelfde actie uit. Bij sluiten antwoordt de assistent eerst kort "Oké, je werkt zelf verder. Je vindt me rechtsonder." en sluit na ± 800 ms.
  - **Gesloten = zwevende knop rechtsonder (C1g):** het paneel verdwijnt, het hoofdvlak neemt de volle breedte, en rechtsonder (24–28 px van de rand) staat een pil-knop **"Assistent"** (min. 56 px hoog, `aria-label` "Assistent openen"). Het paneel schuift naar die knop toe bij sluiten en eruit bij openen (± 250 ms; reduced motion: geen beweging). De eerste keer verschijnt boven de knop één tooltip "Ik ben hier als je me nodig hebt. Ons gesprek blijft bewaard." die na 4 s of bij de eerste klik verdwijnt. Openen toont het gesprek waar het was; de assistent stelt geen openstaande vraag opnieuw en vraagt niets proactiefs zolang hij gesloten is. Bewaar `assistantOpen` in de gast-state.
  - De gebruiker werkt gewoon verder op hetzelfde overleg; er is geen aparte "zelf aanmaken"-modus.
  - Dit vervangt de smalle strook "Assistent openen" overal, ook in C1d (lege meeting start met de zwevende knop).
  - De prototypeknop "Demo" mag niet onder de zwevende knop liggen: verplaats hem naar linksonder.
  - In de lege toestand van de app blijft "Bekijk eerst een voorbeeld" staan zoals vandaag.
- **Overgang na bevestiging (C0h, demo-lus C0i):** start pas wanneer de inhoud klaar is (titel+agenda uit de zin, acties uit de notities, of de reekslijst uit de agenda). Duurt verwerken > 600 ms, toon eerst in de assistent "Ik zet je overleg klaar…" met een stille indicator. De assistent **beweegt niet** (vaste 400 px rechts). Totaal ± 700 ms, drie overlappende lagen (easing `cubic-bezier(.65,0,.35,1)`):
  1. **0–220 ms** – actie- en beslissingskaart van de illustratie schuiven terug naar het agendapunt en vervagen; slogans vervagen.
  2. **150–550 ms** – het blauwe paneel krimpt naar links tot de zijbalk (220 px); het logo krimpt van ± 40 px naar het zijbalklogo en landt op de plek ervan (shared element); de menu-items verschijnen gespreid (40 ms na elkaar, kort van links).
  3. **300–700 ms** – de agendakaart van de illustratie vliegt naar het hoofdvlak en wordt de titel van de eigen vergadering (shared element, blauwe markering); statuslabel, datumregel en agendablokken komen er gespreid onder (60 ms na elkaar, 10 px van onder).
  4. **Afsluiter** – één keer een groen "✓ Klaar" naast de titel (schaal 0.6 → 1.12 → 1, ± 300 ms), daarna verdwijnt het; de assistent stelt zijn eerste vraag (vertelpad: "Je productieoverleg staat klaar. Ik zette drie thema's klaar. Klopt dit ongeveer? Vul er gerust agendapunten onder aan.", zie Stap 1). Bij het notitiepad loopt in plaats daarvan de teller "N openstaande acties" op.
  - Bouw met **Framer Motion** (`motion` + `layoutId` voor logo, agendakaart→titel en het blauwe paneel→zijbalk; `AnimatePresence` voor de kaarten). Welkomst- en app-layout renderen in **dezelfde route** (`/probeer`), zodat de shared elements kunnen overgaan.
  - `prefers-reduced-motion`: geen beweging, crossfade van 200 ms.
  - Speelt **één keer** per gast (`transitionPlayed` in de gast-state); bij herladen meteen de app.
- Daarna verder op het juiste punt: vertellen → C1, notities → C3, agenda → C1b, lege meeting → C1d (paneel klapt in tot strook).
- **Mobiel (< 900 px):** geen illustratie; het gesprek staat op volledig scherm en zakt na aandokken naar een half onderblad.
- `startPath: tell | notes | agenda | empty` in de gast-state; wie terugkomt, ziet het welkomstscherm niet opnieuw.

### Lege vergadering (C1d) · update 12 okt
"Start met een lege meeting" op het welkomstscherm opent de app met:
- titel "Nieuwe vergadering" meteen in bewerkmodus (geselecteerd, cursor erin);
- de standaardagenda: Openstaande acties (leeg: "Nog niets open. Acties die je tijdens de vergadering noteert, komen hier vanzelf terug tot ze af zijn." + sleep-hint), Lopende zaken, Varia; per thema "+ Agendapunt toevoegen", onderaan "+ Thema";
- datumregel met "Uit agenda halen" en "Deelnemers uit agenda";
- het assistentpaneel **gesloten**, met de zwevende knop "Assistent" rechtsonder (zie C1g). Openen toont één bericht: "Zeg het als ik iets kan invullen." De "+"-knop, slepen en intentieherkenning werken zoals overal.
- **Geen** proactieve herinnering over notities op dit pad (`startPath: empty`).
Dit is hetzelfde scherm als "nieuwe vergadering" voor bestaande gebruikers.

### Stap 1 · Eerste scherm in de app (C1, C1b) · update 12 okt
**Geen startmenu meer in de assistent.** Het eerste scherm gaat verder met het gekozen pad en de assistent stelt **één gerichte vraag**:
- Na **Vertel het me (C1) · update 12 okt:** de gebruiker krijgt **één vraag** ("Waarover gaat je volgende overleg?"). Op het eerste antwoord volgt **meteen** de overgang; er komt vóór de overgang geen enkele vervolgvraag (geen naam, geen dag, geen deelnemers). Titel, agenda en wat er verder uit de zin te halen valt (dag, uur, deelnemers) staan ingevuld met blauwe markering. **De naam wordt nooit gevraagd:** afgeleid uit de zin, aanpasbaar in de titel. Daarna precies twee berichten, na elkaar:
  1. "Je [naam] staat klaar. Ik zette [N] thema's klaar. **Klopt dit ongeveer?** Vul er gerust agendapunten onder aan." met knoppen **Klopt** en **Iets aanpassen** (zet de agenda in het hoofdvlak in bewerkmodus, focus op het eerste agendapunt; daarna gaat de assistent toch door naar bericht 2). N is het echte aantal voorgestelde thema's. Zeg "thema's", niet "agendapunten": het zijn blokken zonder punten eronder. Een vrij antwoord telt als bevestiging.
     - **Te vaag antwoord** (geen onderwerpen herkend, bv. "een meeting met mijn team"): de overgang speelt **toch meteen**, met een voorlopig concept: naam uit de zin of anders een generieke naam ("Teamoverleg", "Overleg") en de standaardagenda (Openstaande acties, Lopende zaken, Varia). Bericht 1 wordt dan de enige verduidelijkende vraag: "Je teamoverleg staat klaar als concept. **Waar willen jullie in die meeting vooral vooruitgang op boeken?**" Het antwoord wordt omgezet in agendapunten (zelfde regels als "Zin begrijpen"), die met blauwe markering in het hoofdvlak verschijnen; daarna meteen bericht 2. Link "Laat zo" slaat over. Nooit meer dan deze ene verduidelijkende vraag, en de gebruiker wacht nooit in de chat op een concept.
  2. "**Heb je open punten of notities van de vorige keer?** Dan maak ik er acties van." met **Kies bestand**, **Inspreken**, hulptekst "Of plak of typ ze hieronder." en link **Ik heb niets openstaan**. Dit vervangt de eenmalige proactieve herinnering op dit pad (`notesReminderShown = true`).
  - **Wanneer en wie worden niet gevraagd** in de onboarding. Ze blijven leeg met de links "Uit agenda halen" en "Deelnemers uit agenda" in de datumregel, en worden pas gevraagd op het moment dat ze nodig zijn (bv. bij "Start overleg" of acties mailen).
  - Nooit beweren dat iets "links staat" voordat het effectief zichtbaar is.
- Na **agenda (C1b):** radiolijst met vaste vergaderingen (de vergadering die de gebruiker organiseert met de meeste deelnemers bovenaan, label "jij organiseert"), knop "Deze vergadering opvolgen", tekst "Staat ze er niet tussen? Vertel het me." Titel, datumregel, avatars en een agendapunt uit de uitnodiging worden als voorstel ingevuld. Daarna stap 2.
- Na **notities:** meteen stap 2 (C3).

**Elke vraag van de assistent verschijnt precies één keer.** Dubbel renderen (React Strict Mode, effect dat twee keer loopt) mag niet voorkomen.

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

De parser vult alleen in; hij stelt geen vragen. **Vervallen (12 okt):** het bericht "Begrepen. Links staat een voorstel…" met samenvattingskaart en de vervolgvragen "Hoe heet dit overleg?", "Wanneer gaat het door?" (dag/uur-chips) en "Wie zit er meestal bij?". Het gesprek na de zin staat in Stap 1.

### Stap 2 · Openstaande acties (C3)
Vraag: "Heb je open punten of notities van de vorige keer? Dan maak ik er acties van." + Kies bestand, Inspreken, "Of plak of typ ze hieronder." + link "Ik heb niets openstaan" (gaat naar stap 3 met lege actielijst).
- **Hergebruik de bestaande extractie uit `/b/acties`** (eigenaars uit deelnemerslijst, datumwoorden, "beslissen/beslissing" → agendapunt).
- Microfoon: zelfde simulatie als in `/b/acties` (2 s luisteren, vaste transcriptie).
- Resultaat verschijnt **op de agenda in het hoofdvlak**, niet in de chat: blok "Openstaande acties" met blauwe rand en label "N voorstellen · vink aan wat klopt", rijen met vinkje, tekst, eigenaar, datum (inline aanpasbaar). Beslissingen worden een agendapunt met doel "Beslissen" onder het passende thema (anders onder het eerste thema).
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
