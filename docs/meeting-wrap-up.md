# Vergadering afronden — v2

## Werkplek

Uitgevoerd op `codex/stop=meeting-unattended-2` in
`/Users/bartvanhecke/Developer/too-doo-onboarding`, volgens de expliciete correctie
van de gebruiker. Geen branchwissel, nieuwe worktree, nieuwe PR of merge.

## Verschillen met v1

- Agendapunten hebben alleen `open`/`done`, plus `doneAt` en een onzichtbaar
  `visitedAt`. Migratie van opgeslagen v4-state naar v5 behoudt data en zet
  `handled` om naar `done`. Navigatie voltooit of heropent niets.
- Voltooi gaat naar het volgende open punt. Ook punt 3 kan het laatste open punt
  zijn. Op dat punt staat de cue en `Voltooi & rond af →`.
- Afronden opent rechtstreeks `/vergaderingen/:id/afronden`; geen tussenmodal of
  apart planningsscherm. De bestaande `/app/overleg/:id`-links blijven werken.
- Open punten krijgen een voorstel en een keuze done/next/drop. De afrondpagina
  heeft eigenaarselectie alleen waar een eigenaar ontbreekt, inline datum/uur,
  Geen volgende vergadering, en een volledig opvolgvoorbeeld.
- Versturen past keuzes atomair toe, maakt de voorzitter eigenaar van onverdeelde
  acties, bewaart metadata bij doorschuiven en landt op het afgeronde detail.
  De optionele directe verzending heeft een terugdraaivenster van 10 seconden.
- Alle late ingangen gaan naar het gewone detail met een standaard open,
  inklapbaar statusblok. Bestaande tabs, infokaart, voorbereiding en agenda-acties
  blijven standaard staan. Hervatten vraagt bevestiging en kan alleen dezelfde dag.
- Niets vastgelegd/niet gestart toont eerst de doorgegaan-vraag. Achteraf invullen
  ondersteunt duur, geplakte notities en tekstbestanden; bij nooit gestart blijven
  alle puntkeuzes verplicht. Niet doorgegaan telt niet mee in de KPI.
- Herinnering: volgende agenda-afspraak (minimaal 30 minuten na gepland einde),
  2 uur na einde of 17:30; na 16:00 de volgende werkdag 08:30.
  Automatisch afsluiten: 22:00 of 8 uur na einde, wat later komt. Nooit automatisch
  versturen. Zonder activiteit is de werkelijke duur onbekend.
- Lijst: voorzitterfilter, 7-dagenregel, contextregels, juiste status en zijbalkteller.
  De volgende vergadering kan vorige opvolging openen of ongeregistreerde punten
  selectief overnemen. De KPI telt onbekende duur/niet gestart apart en sluit
  historische uitschieters en niet doorgegane vergaderingen uit.
- Nieuwe scenario's: sprongen met 1 en 4 voltooid en 2 open, en punt 3 als laatste.
- Het Default-overzicht gebruikt Directieoverleg met dezelfde zes punten als het
  startscenario. Titelklik vanuit een lopende vergadering herstelt in de demo
  het Default-overzicht. Localhost:3000 is op verzoek opnieuw gestart.

## Prototype-opties (standaard uit)

Alle opties staan bij Demo-instellingen en blijven bewaard bij Herstart demo.

| Optie                                              | Aan                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Afronden: compacte detailpagina                    | Verbergt infokaart, tabs en timer; agenda-bewerkacties naar ⋯.                                             |
| Afronden: knoppen in primaire kleur                | Blauwe laatste-voltooi/afrondknop, witte bovenbalkknop.                                                    |
| Afronden: één verschuif-actie                      | Eén Verplaats-ingang, met thema en volgende vergadering als keuzes.                                        |
| Afronden: overslaan als er niets te beslissen valt | Direct versturen bij alles voltooid, alle eigenaars en bekende volgende datum; 10 seconden Ongedaan maken. |

## Gedeelde bestanden en bestaande schermen

Toevoegingen op de vergadermodus, detailagenda, lijst, app-shell/sidebar, KPI,
Demo-instellingen en het prototypemenu. `app/globals.css` kreeg uitsluitend extra
CSS-variabelen, aandachtsmarkering en reduced-motion-regels. Routes zijn toegevoegd,
bestaande routes blijven aanwezig. Geen dependencies, packagebestanden of
bestaande tokens hernoemd/verwijderd.

## API-grenzen en afwijkingen

Er is geen backend, mailprovider of verbonden agenda in deze repository.
Daarom zijn verzending, notificaties en taken lokale simulaties met pure functies
en tests. De volgende `TODO(api)`-aansluitingen blijven bewust open:

- Agenda-afspraken van de voorzitter: één mockgrens `chairCalendar()`.
- Serverjob/outbox voor startmelding, herinnering en automatisch afsluiten bij een
  gesloten tab; deduplicatie en het bundelen van meerdere vergaderingen.
- Werkelijke opvolgmails per deelnemer en intrekken binnen het undo-venster.
- Wijziging van volgende datum/uur doorzetten naar Outlook.
- Acties/beslissingen extraheren uit notities; PDF/Word-extractie. Nu tekst plakken
  of een `.txt` uploaden, vervolgens zelf per punt aanvullen.
- Historische timestamps ophalen en een serverlijst Bewaard voor later. Lokaal
  blijven deze punten in het originele verslag beschikbaar.

PDF delen gebruikt de print-/PDF-functie van de browser; mail delen opent een
mailconcept. Er wordt niets automatisch verzonden. De bestaande timerweergave
blijft behouden, vanwege de expliciete eis bestaande timers niet te herstylen.
De footer behoudt ook Terug naar vergadering naast Voorbeeld en de primaire knop.

## Validatie

- 91 unit-tests slagen; build en typecheck slagen.
- Lint: geen fouten; bestaande waarschuwing in microsoft-authorization.tsx.
- Alle 15 gerichte browsercontroles slagen (14 samen en de laatste invoerflow apart).
- Gerichte browsercontroles dekken expliciete voltooiing, punt 3 als laatste,
  undo, terugkeren, default/compact detail, achteraf invullen, inline planning,
  opslag, mailmodal, audio, mobiel en axe WCAG A/AA.
- De volledige legacy-suite is niet groen. De brede run is afgebroken met
  52 geslaagd, 29 mislukt, 3 onderbroken en 130 niet uitgevoerd. Onder meer
  onboarding-/variant-B-/hero-tests verwachten oude labels of schermen.
  Deze buiten-scope tests/schermen zijn niet herbouwd. Gewijzigde vergader- en
  prototypetests worden apart op de definitieve code uitgevoerd.

## Opschoning

`components/meeting/next-meeting-screen.tsx` is eerst uit de UI gehaald en daarna
in de aparte laatste opschoningscommit verwijderd. Het is vervangen door inline
planning op de afrondpagina. De ongebruikte bevestigingsmodal is uit live-meeting
verwijderd; alle afrondingangen gebruiken nu de afrondpagina. Geen andere bestanden verwijderd.

## Bekijken

- Overzicht: http://localhost:3000/app
- Detail: http://localhost:3000/vergaderingen/overview-demo-pending
- Afronden: http://localhost:3000/vergaderingen/overview-demo-pending/afronden

Laad eerst Nog af te ronden op de overzicht-prototypebalk om die voorbeeld-id te maken.
