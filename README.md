# too-doo onboarding: klikbaar prototype

Werkend prototype van de nieuwe onboarding van too-doo, van de website-hero tot het eerste overleg met acties.
Functionele specificatie: [`SPEC.md`](SPEC.md) (inclusief §8, de beslissingen tijdens de bouw). Mockups: [`design/`](design/).

Dit is een **prototype met nepdata**: geen echte login, Microsoft Graph, e-mail of backend. Externe stappen worden
gesimuleerd. De uitkomst kies je in de **demo-balk** (knop "Demo" rechtsonder).

## Starten

```bash
npm install
npm run dev            # http://localhost:3000
```

| Script              | Wat                                                                    |
| ------------------- | ---------------------------------------------------------------------- |
| `npm run build`     | productiebuild                                                         |
| `npm run lint`      | ESLint (Next.js-config)                                                |
| `npm run typecheck` | `tsc --noEmit`                                                         |
| `npm run format`    | Prettier                                                               |
| `npm run test:e2e`  | Playwright: alle routes × demo-uitkomsten, links, mobiel en axe (WCAG) |

`test:e2e` start zelf `next start` op poort 3200; draai dus eerst `npm run build`.

## Routes

| Route                  | Scherm                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| `/`                    | Website-hero                                                             |
| `/start`               | 1 · Account (toestand A: kiezen, B: naam en wachtwoord)                  |
| `/start/geblokkeerd`   | 1b · Microsoft-login geblokkeerd                                         |
| `/overleg`             | 2a · Eerste overleg (vóór toestemming, lijst, geen reeksen, geannuleerd) |
| `/overleg/zelf`        | 2b · Overleg zelf invullen                                               |
| `/overleg/goedkeuring` | 2c · Agenda vraagt goedkeuring IT-beheerder                              |
| `/voorbeeld`           | 2d · Rondkijken met voorbeelddata                                        |
| `/acties`              | 3 · Openstaande acties                                                   |
| `/app/overleg/:id`     | 4 · Het overleg, met checklist en de modal "Andere overlegmomenten" (5)  |
| `/app`                 | 4b · Lege toestand (toont het eerste overleg zodra er een bestaat)       |

## Structuur

```
app/                     routes; elk scherm is een client component naast zijn page.tsx
components/
  onboarding/            OnboardingLayout, StepProgress, MeetingPreview, TimeInput, DateInput,
                         ChipSuggestions, ChoiceGroup, DurationPicker, ActionRow, OwnerCombobox,
                         Field, BenefitList, ItEmailForm
  app/                   AppShell (zijbalk), Checklist, AddMeetingsDialog, InviteDialog
  demo/                  DemoBar (alleen prototype)
  ui/                    shadcn/ui-basis (button, input, label, dialog, sonner)
lib/
  mock-data.ts           alle nepdata (gebruiker, reeksen, afspraken, deelnemers)
  store.ts               zustand-store, bewaard in localStorage
  simulate.ts            gesimuleerde login, agendatoestemming en verzending
  time.ts, date.ts, when.ts   uur- en datumparsing ("8u", "0800", "ma 13 okt", "13/10", "ma 08:00")
  meeting.ts             ritmelabels, overlegtype afleiden uit de naam
e2e/                     Playwright-tests
```

## Overname door het ontwikkelteam

- **Componenten** zijn opgebouwd met echte `<button>`, `<a>`, `<label>`, `fieldset`/`legend` en radioknoppen. Het
  uurveld en de eigenaarkeuze volgen het ARIA-combobox-patroon (pijltjes, Enter, Escape). Klikdoelen zijn minstens 44px.
- **Kleurtokens** staan als CSS-variabelen in `app/globals.css` en zijn als Tailwind-kleuren beschikbaar (`bg-brand`,
  `text-ink-2`, `border-line`, …). De shadcn-variabelen (`--primary`, `--border`, …) wijzen naar dezelfde waarden.
- **shadcn/ui**: `components.json` staat klaar. De componenten in `components/ui` zijn met de hand opgezet, omdat de
  registry niet bereikbaar was vanuit de bouwomgeving. Ze volgen de standaard shadcn-opbouw (Radix + cva) en kunnen
  gerust vervangen worden via `npx shadcn add …`.
- **Data** is altijd relatief vanaf vandaag berekend ("volgende: ma 13 okt" klopt dus elke week).
- **Te vervangen bij productie**: `lib/simulate.ts` (echte OAuth/Graph), `lib/mock-data.ts`, `lib/store.ts`
  (localStorage → backend) en `components/demo/`.
