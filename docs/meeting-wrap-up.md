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
