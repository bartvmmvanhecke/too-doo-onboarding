# Vergadering afronden — v3

Uitgevoerd op `codex/close-meeting`, vanaf de bestaande afrondingscode op
`origin/main`. De genoemde branch/worktree `meeting-wrap-up` bestaat hier niet;
de gebruiker heeft expliciet bevestigd om op `codex/close-meeting` verder te gaan.
Geen nieuwe worktree, branchwissel, PR of merge. De bestaande devserver blijft op
poort 3000 draaien.

## Verandering tegenover de bestaande flow

- Navigatie voltooit of heropent geen punten meer. `runStatus` gebruikt `open` en
  `done`; oude opgeslagen `handled`-waarden worden bij inlezen behouden als `done`.
  Bezoek wordt apart geregistreerd. Alleen expliciet voltooien of de bevestigde
  wizardkeuze voltooit een punt.
- De Voltooi-knop zoekt het volgende open punt, ook wanneer het laatste open punt
  midden in de lijst staat. Alle afrondingsknoppen openen de bevestigingsdialog.
  Start ongedaan maken is beperkt tot vergaderingen zonder vastgelegde inhoud.
- De oude combinatie van overzicht en apart planningsscherm is vervangen door
  `/vergaderingen/[id]/afronden`: drie vrij aanklikbare stappen, bestaande
  agendarijen/tellers/inline bewerking, expliciete open-puntkeuzes, eigenaar en
  datum, optionele planning, Nederlandse opvolging, ontvangerselectie en score.
- Keuzes, samenvatting, ontvangers, planning en feedback worden direct in
  `wrapUpDraft` bewaard. Een latere ingang start bij stap 1 met de bewaarde keuzes.
  Terug naar een pas afgesloten vergadering maakt het einde ongedaan.
- Versturen en opslaan zonder versturen passen de keuzes atomair toe. Overdracht
  is idempotent, blijft in hetzelfde agendablok en bewaart de herkomst. Zonder
  volgende afspraak blijven punten op de bronvergadering bewaard als de lokale
  lijst “Bewaard voor later”; een volgende afspraak krijgt ze automatisch.
- Automatisch afsluiten gebruikt `max(gepland einde, laatste activiteit) + 120 min`
  als jobdeadline en `max(gepland einde, laatste activiteit + 15 min)` als eindtijd.
  Zonder activiteit na de start geldt het geplande einde. Automatisch afsluiten
  verstuurt geen opvolging en past geen agendakeuzes toe.
- De detailpagina heeft een amber statusbanner met eindtijdbevestiging en een
  expliciete wizardingang. Pending links landen op detail. Na afronden volgt een
  groene bevestiging; na opslaan kan de voorzitter alsnog expliciet versturen.
- De lijst en sidebar tellen alleen de eigen, nog geen veertien dagen oude pending
  vergaderingen. Daarna staan ze onder Afgelopen met “Opvolging niet verstuurd”.
  Het dashboard en de volgende vergadering in een reeks kregen een toevoeging.
- De herinneringsmail per vergadering is vervangen door één periodieke
  samenvatting. De instelling staat standaard op Wekelijks; Om de twee weken en
  Uit zijn beschikbaar. De geteste planning gebruikt maandag 08:30 in Brussel,
  inclusief zomer-/wintertijd, deduplicatie en het overslaan van lege mails.
- De KPI gebruikt de gecorrigeerde eindtijd, herstelt historische uitschieters met
  gepland einde als ondergrens en onderscheidt afgerond, automatisch en geen
  activiteit. De bestaande timer behoudt zijn berekening vanaf de echte start.

## Prototype-opties en scenario’s

In Demo-instellingen, beide standaard **uit**:

- **Afronden: knoppen in primaire kleur**: rode afrondingsknoppen worden blauw/wit
  met het bestaande brand-token (`#2747D6`), ook op de lijst en detailpagina.
- **Afronden: compacte detailpagina**: verbergt alleen in de pending staat de
  infokaart, voorbereidingsscore, tabs en timer. Met de optie uit blijven die staan.

De bestaande prototypebalk bevat nu:

- Sprongen 1 → 4 → 2 → 5: alleen 1 en 4 voltooid; 2 bezocht en open, 5 huidig.
- Nog één punt open: 1–5 voltooid, 6 huidig.
- Punt 3 is het laatste open punt: alle andere punten voltooid.
- Gebruiker loopt weg → automatisch afsluiten: gebruikt dezelfde pure jobregel,
  opent direct de detailbanner en verstuurt of verplaatst niets.

## Bestaande schermen en gedeelde bestanden

Toevoegingen aan detail, lijst Vergaderingen, sidebar, dashboard, volgende
vergadering, meldingsinstellingen en KPI. De afrondingsflow zelf is herwerkt.

Gedeeld aangepast: `lib/store.ts` (velden, activiteit en compatibel inlezen),
`lib/agenda.ts` (status/bezoek), `lib/meeting-clock.ts` (bestaande timer behouden
terwijl de job het geplande einde gebruikt), de app-shell en de bestaande
route-ingang `app/app/overleg/[id]/meeting-screen.tsx`. Nieuwe routes voor wizard,
meldingen en samenvattingspreview. Demo-instellingen en de prototypebalk zijn
uitgebreid; het prototypemenu zelf bleef ongewijzigd.

Geen wijzigingen aan tokens, `globals.css`, `package.json` of `package-lock.json`.
Geen nieuwe dependencies.

## TODO(api) en grenzen

Het project is een localStorage-prototype zonder backendjobs of mailprovider.
De pure functies en lokale opslag zijn echt geïmplementeerd en getest; UI-status
“verstuurd” simuleert bezorging, er vertrekken geen e-mails.

- **Jobs:** `unattended()` moet in een serverworker atomair worden uitgevoerd.
  Lokaal synchroniseert de app bij openen, focus en iedere 30 seconden. Een
  gesloten browser voert geen achtergrondjob uit.
- **Mail:** de expliciete verzendklik moet de opgeslagen samenvatting,
  ontvangers, acties, beslissingen, verplaatste punten en optionele scorevraag via
  de mailprovider bezorgen. De preview gebruikt dezelfde inhoudsfunctie.
- **Periodieke samenvatting:** `runDigestJob()` levert alleen op de ingestelde
  maandag om 08:30 een niet-lege lokale outbox op, maximaal eenmaal per periode.
  Een serverplanner, bezorging, atomair outboxbeheer en serveropslag van de
  meldingsvoorkeur ontbreken. De lokale simulatie vereist een geopende app op dat
  tijdstip; er is geen inhaalmail bij automatisch afsluiten later op de dag.
- **Samenvatting:** zonder AI-service wordt een feitelijke tekst van drie zinnen
  uit de vastgelegde inhoud opgebouwd. Een gegronde AI-generator is een API-taak;
  de gebruiker kan de tekst nu al volledig aanpassen.
- **Bewaard voor later:** lokaal blijven de gekozen punten persistent op de
  bronvergadering en worden ze bij een volgende afspraak gekoppeld. Een aparte
  backendcollectie voor deze lijst ontbreekt.
- **Historie:** beschikbare item-/entry-/actietimestamps worden gebruikt;
  ontbrekende historische records moeten later via de API worden opgehaald.

Alle mock-data voor de samenvattingspreview staat achter `digestPreviewData()`.

## Validatie

- Build, typecheck en lint slagen. Lint heeft één al bestaande waarschuwing in
  `components/probeer/microsoft-authorization.tsx` (ref in effect-cleanup).
- Alle **93 unit tests** slagen, inclusief afsluitgrenzen, geen activiteit,
  navigatie zonder voltooien, laatste open punt midden in de agenda, concepten,
  eigenaarfallback, idempotente overdracht, backlog, KPI en samenvattingsplanning.
- **13 gerichte browsertests** slagen: negen v3-tests, de bestaande live-captureflow
  en drie prototypeflowtests. Ze controleren desktop/mobiel, herladen, bewaren en
  alsnog versturen, native tijdcorrectie, automatisch afsluiten zonder mail,
  laatste open punt 3 en beide standaard uitgeschakelde prototype-opties.
- WCAG A/AA-controles van de mobiele agenda- en opvolgingsstap slagen; geen
  horizontale overflow. Desktop- en mobiele schermafbeeldingen zijn bekeken.
- De volledige bestaande browsersuite is **niet groen verklaard**. De twee
  bestaande audiotests in `e2e/prototype-wrap-up.spec.ts` falen doordat ze een
  geluidsknop in de vergadermodus verwachten die ook op `origin/main` niet
  gerenderd wordt. Die knop ontbreekt daar al: de component en tests bestaan, maar
  `LiveMeeting` importeert/renderde hem niet. Het toevoegen van audiobediening
  valt buiten deze v3-opdracht. De tests blijven behouden; ze zijn niet uitgezet
  in de configuratie. De overige brede onboardingsuite is niet opnieuw gedraaid.

## Verwijderingen (aparte laatste commit)

Deze drie bestanden hebben geen gebruikers meer na de nieuwe wizard en digest:

- `components/meeting/next-meeting-screen.tsx`
- `components/b/meeting-reminder-preview.tsx`
- `components/prototype/reminder-mail-modal.tsx`

Geen andere bestanden verwijderd. De oude `?herinnering=1`-previewingang blijft
compatibel en toont de periodieke samenvatting; er is geen herinnering per
vergadering meer.

## Lokale schermen

- Vergaderingen: http://localhost:3000/app
- Wizard: http://localhost:3000/vergaderingen/{id}/afronden
- Detail: http://localhost:3000/app/overleg/{id}
- Meldingen: http://localhost:3000/app/meldingen
- Samenvattingsmailpreview: http://localhost:3000/app/samenvatting-preview
- KPI: http://localhost:3000/app/vergaderingen-kpi

## Afwijkingen van de spec

De werkbranch is met toestemming `codex/close-meeting`. Serverfuncties en mails
gebruiken de toegestane pure-functie/lokale fallback vanwege ontbrekende
infrastructuur. De samenvatting gebruikt dezelfde toegestane feitelijke fallback
in plaats van een externe AI-aanroep. Samenhangende implementatiestappen zijn in
gezamenlijke commits vastgelegd; elk gecontroleerd met build, lint en typecheck.
De bovengenoemde bestaande audiofailures blijven buiten scope.

## Visuele uitwerking volgens too-doo-referentie

De drie wizardstappen gebruiken nu de aangeleverde vertrouwde too-doo-stijl:
blauwe verloopachtergrond, wit logo en vergadernaam in de bovenbalk, een licht
werkvlak met afgeronde linkerbovenhoek, verbonden stapindicatoren en een vaste
footer. De inhoud kan zelfstandig scrollen; de navigatie blijft beschikbaar.

Stap 2 toont de bestaande kalendercomponent permanent op volle inhoudsbreedte,
met zes weken, Nederlandse weekdagen, maand- en jaarkeuze en starttijd/duur.
Ook bij een vooringevulde volgende afspraak blijft de kalender zichtbaar. Een
gekozen datum wordt meteen in het bestaande concept bewaard.

Alle nieuwe kleuren zijn lokale CSS-variabelen in
`components/meeting/meeting-wrap-up.module.css`. Geen wijzigingen aan gedeelde
tokens, globale CSS, routes of dependencies. De bestaande functionaliteit blijft
behouden. Een extra browsertest controleert de zichtbare kalender, datumselectie,
42 dagcellen, mobiele overflow en WCAG A/AA.

## Direct voorbeeld: automatische eindtijd bevestigen

Op http://localhost:3000/app staat in de prototypebalk de snelkoppeling
**Automatisch afgesloten · eindtijd bevestigen**. Die opent meteen de detailpagina
van een herhaalbaar voorbeeld: gepland 09:00–10:00, laatste activiteit 09:50,
voorgestelde eindtijd 10:05. De banner toont **Klopt** en **Aanpassen**.

De fixture gebruikt de echte pure afsluitregels en behoudt de overige
vergaderingen. Opnieuw klikken zet alleen dit voorbeeld terug in de onbevestigde
staat. Een browsertest controleert de directe navigatie, tijdstippen, zichtbare
knoppen, behoud van andere data en het bevestigen van de eindtijd.

## Verbeteringen na de Loom-analyse

De drie stappen blijven behouden. Stap 2 heeft weer een zichtbare H1:
**Plan de volgende vergadering** zonder bestaande afspraak, of **Bevestig de
volgende vergadering** wanneer die al bestaat. De volledige kalender blijft open
in de planningsstand. De naam is vooraf ingevuld en bewerkbaar, net als de duur
(in minuten). Zonder volgende afspraak is expliciet kiezen om niets te plannen
mogelijk; er wordt dan geen nieuwe afspraak aangemaakt.

De kaart bij een bestaande afspraak toont de werkelijk opgeslagen datum. De
formuliervelden zijn een concept: naam, datum, starttijd en duur worden pas bij
het definitieve afronden op dezelfde afspraak toegepast. Zonder bestaande
volgende afspraak wordt één nieuwe afspraak gemaakt. Ongeldige naam, starttijd
of duur krijgen uitleg; ook de laatste verzend-/opslagklik controleert die velden.

De optionele gezamenlijke vergaderscore staat vóór de eindacties. De score kan
worden overgeslagen of gewist. De aanvullende deelnemersvraag blijft een keuze
en gaat mee in de opvolgingsmail; er wordt geen afzonderlijke scoremail verstuurd.
De laatste vaste footer bevat **Opslaan zonder versturen** en **Verstuur opvolging**.
**Later afronden** bewaart alleen het concept; terugkeren naar een pas gestopte
vergadering hervat de vergadermodus. De uitleg onder de knoppen benoemt dat verschil.

Gedeeld gewijzigd: uitsluitend twee toegevoegde velden in `WrapUpDraft` in
`lib/store.ts`. Geen globale stijlen, routes, dependencies of bestanden verwijderd.
Validatie: 96 unit tests en 16 gerichte browserscenario’s; build, lint en typecheck.
De bestaande lintwaarschuwing en de eerder beschreven audiotests blijven buiten
scope. De vergadertijd en automatische afsluitregels zijn niet gewijzigd.
