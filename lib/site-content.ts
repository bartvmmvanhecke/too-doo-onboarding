/**
 * Inhoud van de homepage vanaf sectie 2 (too-doo-website-nieuwe-copy). Teksten letterlijk overgenomen.
 * Afbeeldingen komen rechtstreeks van de Webflow-CDN van too-doo.
 */
const CDN = "https://cdn.prod.website-files.com/69f7581e3b6a4ccb165a00ae";

export const IMAGES = {
  meeting: `${CDN}/6a06e722f93329f9d6f05a35_meeting-image.jpg`,
  actions: `${CDN}/6a8daf82e0641067317f183b_actions-image.png`,
  notion: `${CDN}/6a85a31eb2704901e4e87ae6_notion-logo.png`,
  teams: `${CDN}/6a85a428e00cd82c08ef10f0_teams-logo-p-1600.webp`,
  ctaBackground: `${CDN}/69f8c6bfa799564c317ab212_background-nogradient.jpg`,
};

export const FEATURES = [
  {
    icon: `${CDN}/69fdc64830e7ab983f081902_layers-three-01.svg`,
    title: "Breng structuur",
    text: "Geef elk vergadertype een doel, vaste deelnemers en een sjabloon, zodat elke vergadering weet waarvoor ze dient.",
  },
  {
    icon: `${CDN}/69fdc6489e7ac4761bb9724f_RowsPlusBottom.svg`,
    title: "Bereid voor",
    text: "Elk agendapunt krijgt een eigenaar en de beslissing die nodig is. AI versnelt de voorbereiding, zodat mensen klaar zijn om te beslissen.",
  },
  {
    icon: `${CDN}/69fdc648c5246f9eea970a7c_clock-stopwatch.svg`,
    title: "Strakke leiding",
    text: "Tijdsloten houden het kort en gericht op acties. Beslissingen en acties worden meteen vastgelegd, elk met één verantwoordelijke en één einddatum. Niets verlaat de kamer zonder naam erbij.",
  },
  {
    icon: `${CDN}/69fdc648eb145601d0869b1c_refresh-cw-05.svg`,
    title: "Volg op",
    text: "Eén overzicht voor iedereen van alle open acties, over alle vergaderingen heen. Elke vergadering start met de acties van de vorige keer, en herinneringen gaan automatisch uit tot alles afgerond is. Zo komen problemen vroeg boven water, niet pas op de deadline.",
  },
  {
    icon: `${CDN}/69fdc648538339be50ed2b6a_Lightning.svg`,
    title: "Automatiseer triggers",
    text: "Herinneringen en opvolging gaan vanzelf af, wanneer een deadline nadert of een actie stilvalt.",
  },
  {
    icon: `${CDN}/69fdc6482869fbd1975dfcba_trend-up-01.svg`,
    title: "Krijg inzicht",
    text: "Zie wie wat doet en hoe beslissingen echt verlopen: waar acties zich opstapelen, hoe het werk over het team verdeeld is en welke onderwerpen blijven terugkomen.",
  },
];

/** "ok" = ja, "no" = nee, anders een korte tekst ("Beperkt", "Te bouwen"). */
export type CompareCell = "ok" | "no" | string;

export const COMPARE_LABELS = [
  "Vergaderflow (structuur + voorbereiding - runnen - opvolgen)",
  "Vergaderstructuur opbouwen",
  "Vergaderinzichten",
  "Centraal actieregister van alle acties uit alle vergaderingen",
  "Readiness score per vergadering",
  "Teamevaluatie per vergadering",
  "Meldingen die gebruikers helpen doen wat nodig is voor en na een vergadering (voorbereiding / opvolging)",
];

export const COMPARE_TABS: {
  id: string;
  label: string;
  logo?: string;
  head: string[];
  rows: CompareCell[][];
  firstLabel?: string;
}[] = [
  {
    id: "notetaker",
    label: "Jouw notetaker & task manager",
    head: ["Notetaker", "Task manager"],
    rows: [
      ["no", "no"],
      ["no", "no"],
      ["no", "no"],
      ["no", "Beperkt"],
      ["no", "no"],
      ["no", "no"],
      ["no", "Beperkt"],
    ],
  },
  {
    id: "notion",
    label: "Notion",
    logo: IMAGES.notion,
    head: ["Notion"],
    rows: [["no"], ["Te bouwen"], ["Te bouwen"], ["Te bouwen"], ["no"], ["no"], ["Te bouwen"]],
  },
  {
    id: "teams",
    label: "Teams",
    logo: IMAGES.teams,
    head: ["Teams"],
    rows: [["no"], ["no"], ["Te bouwen"], ["Te bouwen"], ["no"], ["no"], ["Te bouwen"]],
    firstLabel: "Notities vastleggen",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "“Het echte goud in dit systeem zijn de registraties van acties die volgen uit beslissingen. Wat voorheen vaak onder de mat verdween (wie doet wat tegen wanneer), staat nu geregistreerd. Geen vergeten taken, geen verrassingen.”",
    initials: "[ ]",
    name: "[Naam], HR manager",
    company: "[Bedrijf]",
    color: { bg: "#EDE4FD", fg: "#7B2FEF" },
    wide: true,
  },
  {
    quote:
      "“too-doo helpt ons op een gestructureerde en gedisciplineerde manier vergaderingen en actiepunten op te volgen.”",
    initials: "KD",
    name: "Kristof Defruyt",
    company: "Vandenbussche NV",
    color: { bg: "#DCE7FB", fg: "#1A56DB" },
  },
  {
    quote:
      "“too-doo geeft mij inzicht en overzicht van de afgesproken acties tijdens de verschillende vergaderingen en projectmeetings in onze organisatie.”",
    initials: "BD",
    name: "Bart De Bie",
    company: "Liberoo",
    color: { bg: "#DDF3EC", fg: "#046C4E" },
  },
];

export const CLIENT_NAMES = [
  "NORM",
  "Clear Channel Belgium",
  "GIS International",
  "MAAAT",
  "SCE",
  "BM Engineering",
  "van Hoorebeke Timber",
  "Conhexa",
];

export const PLAN_FEATURES: { text: string; bold?: string }[] = [
  { text: "Eén abonnement, ", bold: "alles inbegrepen" },
  { text: "AI-gegenereerde acties, eigenaars en deadlines" },
  { text: "Execution Intelligence-dashboard" },
  { text: "Vroege waarschuwingssignalen bij vertraging of afwijking" },
  { text: "Chat- en e-mailondersteuning" },
];

/** [naam, toelichting, binnenkort] */
export const FEATURE_GROUPS: [string, [string, string, boolean?][]][] = [
  [
    "Structure",
    [
      ["Vergadertypes aanmaken & benoemen", "Basis voor alle overleggen in de organisatie."],
      ["Doel en Tijdsduur koppelen per type", "Vaste parameters instellen voor focus."],
      ["Vaste agenda-templates", "Opgebouwd uit thema's en vaste agendapunten."],
      ["Vaste deelnemers & Rollen definiëren", "Wijs standaard voorzitters en notuleerders toe."],
      ["Frequentie instellen (soon)", "Automatiseer de cadans van de vergadering.", true],
      ["Mapping van vergaderingen (soon)", "Visualiseer de hiërarchie tussen alle meetings.", true],
    ],
  ],
  [
    "Preparation",
    [
      ["Vergadering inplannen & Agenda opbouw", "Creëer het overleg en voeg flexibele punten toe."],
      ["Doel & Eigenaar per agendapunt", "Label als info/discussie/besluit/actie."],
      ["Tijdslot instellen per agendapunt", "Bewaak de timing op agendapunt-niveau."],
      ["Automatische voorbereidingsreminder", "Systeem mailt deelnemers x-dagen vooraf."],
      ["MS Outlook & Teams Integratie", "Automatisch inplannen en kalender-sync.", true],
      ["AI Voorbereidings-agent", "Laat AI externe documenten scannen op milestones.", true],
    ],
  ],
  [
    "Run your meeting",
    [
      ["Vaste Opstartflow", "Automatisch overlopen acties uit de vorige meeting."],
      ["Aanwezigheid & Rollen registreren", "Leg vast wie er was en in welke rol."],
      ["Beslissingen, Notities & Acties", "Leg vast, wijs actiehouders aan en zet deadlines."],
      ["Agendaitem doorschuiven", "Neem onbehandelde punten mee naar het volgende overleg."],
      ["Duo-Timekeeper", "Timer op vergader- en agendapuntniveau.", true],
      ["AI Samenvatting & Extract", "Real-time AI notulist voor besluiten en taken."],
      ["Meetingbeoordeling (soon)", "Directe feedback op de nuttigheid van het overleg.", true],
      ["Transcript import", "Verwerking van transcripten in vergaderingen", true],
    ],
  ],
  [
    "Follow-up",
    [
      ["Global Action Backlog", "Overzicht van alle openstaande acties per vergadering."],
      ["Acties opvolgen herhaalvergadering", "Acties beheren met statussen: to do, in progress, done, etc."],
      ["PDF Rapport van vergadering", "Direct een strak export-document aan het einde."],
      ["Automatische herinneringen actiepunten", "Systeem mailt actie-eigenaren over deadlines."],
    ],
  ],
  [
    "Insights & triggers",
    [
      ["Totale vergadertijd (per periode/type/medewerker)", "Ontdek waar de organisatie de meeste tijd spendeert."],
      ["Actie Naliving per vergadering", "Verdeling en concentratie van acties over het team."],
      ["Action Responsibility per medewerker", "Verdeling en concentratie van acties over het team."],
      ["Meeting Readiness Score (MRS)", "Samengestelde score op agenda, eigenaar en tijdigheid.", true],
      ["Vergaderactiviteit per uur", "Acties en beslissingen afgezet tegen vergadertijd.", true],
      ["Participatie vs. Actie-ratio", "Detectie van meeting-toeristen (aanwezigheid vs output).", true],
      ["Overleg Efficiency Index", "Ratio tussen timing, beslissingsratio en actiefixatie.", true],
      ["Slippage Monitor (Deadline Shift & Delay)", "Verborgen uitstelgedrag en gemiddelde vertraging per actie."],
      ["Sentiment Alignment", "Spreiding in nuttigheidsscore als signaal voor spanningsvelden.", true],
    ],
  ],
  [
    "Ecosystem & integration",
    [
      ["Basis integraties", "Microsoft 365, Teams, Google Workspace & Slack."],
      ["CRM & Projectmanagement", ""],
      ["AI-integratie", "", true],
    ],
  ],
];

export const FAQ = [
  {
    q: "Wat is too-doo en hoe zorgt het dat afspraken ook uitgevoerd worden?",
    a: "too-doo is een platform dat vergaderingen structureert en ervoor zorgt dat beslissingen ook uitgevoerd worden. Vooraf krijgt elk agendapunt een duidelijk verwacht resultaat, dankzij herbruikbare vergadertypes. Tijdens de vergadering leg je beslissingen en acties meteen vast, elk met één verantwoordelijke en één deadline. Daarna volgt too-doo op: herinneringen gaan automatisch uit, openstaande punten van terugkerende vergaderingen worden meegenomen naar de volgende en dubbele of overlappende vergaderingen worden gemarkeerd. Het resultaat: minder tijdverlies bij het voorbereiden en afronden, meer grip op beslissingen en een team dat zijn afspraken nakomt.",
  },
  {
    q: "Waarin verschilt too-doo van Microsoft Teams en Notion?",
    a: "Teams en Notion zijn beide uitstekende tools, maar geen van beide is gebouwd om afspraken uit vergaderingen ook echt uitgevoerd te krijgen. Microsoft Teams is bedoeld voor communicatie: videogesprekken, chat en het delen van bestanden; het is de plek waar het gesprek plaatsvindt. too-doo gaat verder waar dat gesprek ophoudt en maakt van vergaderingen gestructureerde vergadertypen met automatische voorbereiding, live tracking van beslissingen en acties, en opvolging waarbij onafgewerkte punten automatisch worden meegenomen naar de volgende vergadering. Notion is een flexibele werkruimte waar je bijna alles kunt bouwen, inclusief een vergadersysteem, maar je moet het zelf ontwerpen, koppelen en onderhouden. too-doo biedt je die best practices voor vergaderingen direct uit de doos, inclusief gereedheidsscores, geautomatiseerde opvolgingscycli en gedragsinzichten die zijn gebaseerd op historische gegevens die Notion standaard niet bijhoudt. too-doo vervangt Teams of Notion niet, maar vult de leemte die zij laten op het gebied van vergaderstructuur, opvolging en meetbare vergadercultuur. Bekijk ons vergelijkingsgedeelte voor het volledige overzicht.",
  },
  {
    q: "Welke soorten vergaderingen kan ik met too-doo houden?",
    a: "too-doo werkt met twee categorieën vergaderingen: vaste vergadertypen, dit zijn terugkerende, gestructureerde vergaderingen met een vast format, agenda en deelnemers, en ad-hocvergaderingen (vrije vergaderingen), die naar behoefte worden opgezet zonder een vaste, terugkerende structuur. Binnen deze categorieën kun je elk soort vergadering houden: Excom, bestuursvergaderingen, managementvergaderingen, kwaliteitsvergaderingen, 1-op-1-gesprekken en meer.",
  },
  {
    q: "Hoe lang duurt het om too-doo voor onze organisatie in te stellen?",
    a: "De installatie gaat snel, het is geen project. Met een paar muisklikken definieer je je vergadertypes, nodig je deelnemers uit en stel je de agenda op. Er is geen langdurige implementatie- of configuratiefase nodig; teams kunnen nog dezelfde dag hun eerste gestructureerde vergadering houden.",
  },
  {
    q: "Waar worden onze vergadergegevens opgeslagen?",
    a: "Je vergadergegevens worden gehost bij Level27, in Hasselt, België.",
  },
  {
    q: "Is too-doo gebouwd voor een specifieke sector, of voor elke kmo?",
    a: "too-doo is niet gebouwd voor één sector. Het is gemaakt voor elke organisatie, profit of non-profit, klein of groot, waarvan de teams beter willen samenwerken en op één lijn willen blijven.",
  },
];
