# Vergadering afronden

Uitgevoerd in `/Users/bartvanhecke/Developer/too-doo-onboarding`, op
`codex/close-meeting-unattended`, vanaf de huidige HEAD zoals de aangeleverde
opdracht voorschrijft. Geen nieuwe worktree, PR of merge.

## Gebouwd

- Status per agendapunt, heropenen, volgend open punt en voortgang op status.
- Amber timer, overtime met 15 minuten uitstel, minimaliseerprompt, zwevende pill en live-indicator.
- Afzonderlijke eindtijd en opvolgstatus, afrondingsscherm, eigenaarselectie,
  inline aanvulling bij lege opvolging, bevestiging en terugkeren met focusherstel.
- Idempotent doorschuiven naar de eerstvolgende **ingeplande** vergadering met
  dezelfde seriesId. Metadata en herkomst blijven bewaard. Laten vallen verwijdert
  ook een al automatisch doorgeschoven kopie.
- Activiteitregistratie bij schrijven/navigeren en maximaal eenmaal per 30 seconden
  bij typen. Alleen openstaan telt niet.
- Pure herinnerings- en afsluitregels, lokale synchronisatie bij terugkomst,
  herinneringsmailpreview en deeplink naar de afrondingsstap.
- Eindtijd bevestigen/aanpassen na automatisch afsluiten en voorrang in de lijst.
- Nieuw KPI-scherm (het bestond niet op deze basisbranch), met effectieve duur,
  uitschieterfilter, automatische afsluitingen en ruwe openstandduur.

## API-aansluitingen en grenzen

Dit is een localStorage-prototype zonder serverjobs of mailprovider.

- `components/meeting/unattended-sync.tsx`: TODO(api) voor een serverjob, echte
  reminderbezorging en atomair één herinnering per vergadering. Lokaal wordt alleen
  de herinneringsintentie geregistreerd. Met gesloten tab draait er geen job;
  synchronisatie herstelt de toestand bij de volgende terugkeer.
- `components/meeting/meeting-wrap-up.tsx`: TODO(api) voor echte opvolgmails per
  deelnemer. De lokale bevestiging simuleert verzenden; er vertrekken geen mails.
- `components/b/meeting-reminder-preview.tsx`: TODO(api) voor meldingsvoorkeuren
  en bezorging uitsluitend aan voorzitter/startende gebruiker.
- `lib/meeting-wrap-up.ts`: TODO(api) voor het ophalen van ontbrekende historische
  updatedAt-records. Beschikbare actie-, agendapunt- en entrytimestamps worden al gebruikt; ontbrekende
  historie boven 3× gepland telt niet mee in Werkelijk.
- `lib/meeting-wrap-up.ts`: TODO(api) voor een zelfstandige lijst Bewaren voor later.
  Zonder ingeplande volgende vergadering blijven de punten in het originele verslag
  bewaard. Er wordt geen volgende serieafspraak verzonnen.

## Schermen

- Vergaderingen: http://localhost:3000/app
- KPI: http://localhost:3000/app/vergaderingen-kpi
- Vergadering: `/app/overleg/{id}`
- Mailpreview: `/app/overleg/{id}?herinnering=1`
- Deeplink afronden: `/app/overleg/{id}?afronden=1`

De bestaande devserver op poort 3000 wordt hergebruikt.

## Gedeelde bestanden en verwijderingen

`app/globals.css` kreeg uitsluitend zes kleurvariabelen. De bestaande
`app/app/overleg/[id]/meeting-screen.tsx` koppelt de nieuwe toestanden en
queryparameters. De route `app/app/vergaderingen-kpi/page.tsx` is toegevoegd.
De app-shell kreeg de live-indicator, pill en lokale synchronisatie.
Geen dependencies, wijzigingen aan packagebestanden of prototypemenu.
Geen bestanden verwijderd. De oude beëindigingsdialoog is uit de UI gehaald.

## Validatie

- Alle 70 unit tests slagen, inclusief agendasprongen, heropenen, wrap-around,
  effectieve eindtijden, herinneringsdeduplicatie, activiteit na gepland einde,
  doorschuiven, laten vallen na automatische overdracht en historische uitschieters.
- Build, typecheck en lint slagen. Lint meldt één al bestaande waarschuwing in
  `components/probeer/microsoft-authorization.tsx`.
- Alle zes gerichte Playwright-scenario's slagen. Ze dekken vastlegging, afronding, focusherstel,
  de sprong 1 → 4 → 2 → 5, snooze, minimaliseren/pill, automatische terugkeer,
  tijdcorrectie, maildeeplink, KPI, laatste open punt midden in de agenda,
  ontbrekende eigenaar, mobiel en WCAG A/AA.
- De brede bestaande browsersuite is gestopt na 22 geslaagde tests en 5 failures
  in oude onboardingselectoren en screenshots; 2 tests waren onderbroken.
  Voorbeelden: `Naam` op de lege app en `Je andere vaste vergaderingen toevoegen`
  op het detail. Die tests zijn buiten scope niet aangepast. De volledige
  browsersuite is dus niet groen.
- Desktop- en mobiele schermafbeeldingen zijn visueel gecontroleerd.

## Vervolg: prototypebediening

De donkere prototypebalk staat boven de bovenbalk in de gestarte vergadermodus.
Hij verdwijnt bij minimaliseren, afronden en op detail/lijst/mail. De instelling
`demo.wrapUpToolbar` gebruikt de bestaande localStorage-store en staat standaard aan.

- `lib/prototype/wrapUpScenarios.ts` bevat alle lokale fixtures en mutations voor
  sprongen, laatste open punt, +5 minuten en spoor B. De fixture maakt ook een
  lokale volgende vergadering, zodat doorschuiven direct zichtbaar is.
- `Meeting.demoTimeOffsetMs` bewaart de tijdsverschuiving per vergadering;
  `lib/meeting-clock.ts` past hem via `meetingNow()` toe. Timer, schrijfacties,
  synchronisatie, pill en handmatig afsluiten gebruiken dezelfde klok.
- Een scenariorevisie herstart alleen de inhoud van de vergadermodus, waardoor
  lokale prompts, snooze, invoer en minimaliseermelding worden gereset en het
  huidige agendapunt focus krijgt. De balk bewaart de aria-live-aankondiging.
- Spoor B beëindigt in deze demonstratie de bespreking van het huidige punt en
  draagt de onbehandelde punten 3 en 6 over. Er worden geen mails of API-aanroepen gedaan.
- De mailpreview heeft een demo-link naar het detail na automatisch afsluiten.
- Er was geen bestaande omgevingscheck voor het prototypemenu. De gedeelde check
  `lib/demo-environment.ts` beschermt nu menu, instellingen, balk, fixtures en klok.
  Development/test is demo; een afzonderlijke demodeployment kan expliciet
  `NEXT_PUBLIC_APP_ENV=demo` gebruiken. Een gewone productiebuild toont geen
  prototypebediening en negeert opgeslagen demo-offsets.

Gedeeld aangepast: uitsluitend vijf toegevoegde kleurtokens in `app/globals.css`,
plus de omgevingscheck in het bestaande prototypemenu. Geen dependencies of bestanden
verwijderd. De verouderde menutest verwacht nu ook het al bestaande menu-item
“Overzicht met vergaderingen”. Verder is gewerkt op de bestaande branch
`codex/close-meeting-unattended`, zonder branchwissel, PR of merge.

Validatie vervolg: 74 unit tests, build, lint en typecheck slagen. De zes bestaande
gerichte vergaderbrowsertests en de drie nieuwe prototypebrowsertests slagen.

## Vervolg: secondentimer en optionele chime

De timer toont mm:ss, vanaf meer dan een uur h:mm:ss, en in de laatste minuut
“nog N s”. Op precies één uur staat 60:00, zoals in de demo. De pill gebruikt
dezelfde klok. `Meeting.overtimeUntil` bewaart +15 minuten voor timer, pill en audio;
de gedeelde planning blijft intact. De UI-ticks zijn uitgelijnd op dit eindmoment.

`lib/audio/chime.ts` synthetiseert twee zachte sinustonen met Web Audio (880 en
1318,5 Hz, 120 ms uit elkaar, gain 0,2). `chime-state.ts` beheert één AudioContext,
het ontgrendelen via klikken en de opt-in per e-mailadres in localStorage.
TODO(api): de voorkeur later in de gebruikersinstellingen bewaren.

`components/meeting/chime-scheduler.tsx` leeft in de app-shell en blijft daarom
actief bij minimaliseren en navigeren binnen de app. Binnen tien minuten vóór het
einde plant hij de chime met `ctx.currentTime + resterendeSeconden`. Een minuutinterval
wacht alleen op dat venster; het geluid zelf wordt niet door JS-timers getriggerd.
Bij aan/uit, uitstel, demo-offset, scenario-revisie en visibilitychange wordt de
vorige planning geannuleerd en zo nodig vervangen. Voorbije eindmomenten worden
niet ingehaald. Afronden of afsluiten verwijdert de planner en annuleert de tonen.

“Laatste 5 seconden” gebruikt de bestaande lokale scenariofunctie. De knop zet de
offset exact vijf seconden vóór het actuele eindmoment, activeert geluid zonder
voorbeeldchime, kondigt dit aan en reset via een revisie de planningsstatus.
De gewone geluidsknop speelt bij aanzetten wél één voorbeeld; bij een geblokkeerde
context activeert de eerste klik uitsluitend de bestaande ingeschakelde voorkeur.

Nieuwe bestanden: `lib/audio/chime.ts`, `lib/audio/chime-state.ts`,
`lib/audio/chime.test.ts`, `lib/meeting-clock.test.ts`,
`components/meeting/chime-control.tsx`, `components/meeting/chime-scheduler.tsx`.
Aangepast: klok/context, store, constanten, vergadermodus, start-gate, pill,
app-shell, prototypebalk/scenariofunctie en bijbehorende tests. Geen dependencies,
nieuwe kleurtokens, gewijzigde routes of verwijderde bestanden.

Validatie: 78 unit tests; build, lint en typecheck; elf gerichte browsertests.
De browsercontrole inspecteert de echte Web Audio-scheduling, voorbeeldgedrag,
herplanning, annulering, de timer/pill en refresh na het einde. Audio wordt niet
als enig signaal gebruikt. De bestaande lintwaarschuwing buiten deze opdracht blijft.
