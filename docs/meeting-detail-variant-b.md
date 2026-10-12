# Meeting detail — variant B

Branch: `meeting-detail-variant-b`, gebaseerd op main. De bestaande detailcomponenten in `components/meeting/` zijn ongewijzigd. De drie macOS-referentiebeelden van A zijn op een tijdelijke kopie van main gegenereerd; de stilstaande detailbeelden zijn pixel voor pixel gelijk aan deze branch. Voor de lopende vergadering staat de klok vóór starten stil en loopt vervolgens exact vijf seconden.

De variantkeuze staat uitsluitend in het prototypemenu op `/app/overleg/[id]` zolang er geen vergaderingmodus actief is. `?variant=b` kiest de documenteditor; ontbrekende of andere waarden kiezen A. `window.history.pushState` integreert met Next `useSearchParams`, behoudt de vergadering en herlaadt niet. Starten gebruikt dezelfde bestaande vergaderingmodus.

B gebruikt rechtstreeks de bestaande persistente Zustand-store. Blokken en punten blijven agenda-objecten; notities, beslissingen en documenten zijn entries. Checkboxacties en bevestigde actievoorstellen gaan door `addEntry`, dat ook de bestaande openstaande actie maakt. De bestaande `endRun` bewaart onafgewerkte acties. Er zijn geen backend-wijzigingen.

De editor heeft toetsenbordinvoer, metadata-popovers en shadcn Command, verplaatsen van punten en blokken, pauzes, lege voorbeeldtekst, lijstplakken, Web Speech-dicteren in `nl-BE`, vier sjablonen en bevestigbare voorstellen. Shift+Enter gebruikt meerdere gewone inputvelden voor één titel; het opgeslagen object bevat echte regeleinden. Voorstellen leven alleen in de editor. Een vingerafdruk van afgehandelde tekst wordt in sessionStorage bewaard, zodat dezelfde voorstellen na refresh niet terugkomen; de voorstellen zelf worden niet opgeslagen.

## TODO(api)

- `lib/meeting-suggestions.ts`: `suggestFromLine` is een regelgebaseerde mock, later te vervangen door een LLM-endpoint. Eigenaars worden uitsluitend aan bestaande deelnemers gekoppeld; termijnen worden alleen bij expliciete tekst voorgesteld.
- `lib/meeting-document.ts`: `documentTemplate` heeft geen historisch agenda-endpoint. Het zoekt een andere vergadering met dezelfde naam; ontbreekt die, dan vult het een voorbeeld in en toont de UI daarover een melding.

## Build en controles

De geïnstalleerde Next 16.4.0/Turbopack-combinatie faalt bij de bestaande Rubik-fontimport, ook zonder de Tailwind-loader. Development en productiebuild gebruiken daarom webpack en de standaard Tailwind PostCSS-integratie. Fonts, tokens en variant A zijn niet gewijzigd. `cmdk` is toegevoegd als primitive voor de gevraagde shadcn Command-component.

Controles: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` en `npm run test:e2e`. In deze lokale omgeving zijn de Playwright-browsers in `/tmp/meeting-b-browsers` geïnstalleerd; de testruns gebruiken `PLAYWRIGHT_BROWSERS_PATH=/tmp/meeting-b-browsers`.

De bestaande toegankelijkheidstest wacht nu tot het welkomstscherm verdwenen is. De bestaande A-sleeptest wacht tot de verplaatste grip opnieuw focus heeft. Deze wachttijden veranderen geen productgedrag en vermijden controles midden in een scherm- of focusovergang.
