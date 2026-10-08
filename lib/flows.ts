/**
 * Flows en randgevallen voor /prototype (SPEC-FLOWS.md §2). Alleen voor het prototype.
 */
import type { CalendarOutcome, LoginOutcome } from "@/lib/store";

export type FlowId = 1 | 2 | 3 | 4;

export interface FlowPreset {
  demo: { login?: LoginOutcome; calendar?: CalendarOutcome };
  /** Al ingelogd als de mockgebruiker (voor randgevallen na het account). */
  signedIn?: boolean;
  start: string;
}

export interface Flow extends FlowPreset {
  id: FlowId;
  title: string;
  text: string;
  steps: string[];
  variant: "A" | "B";
}

export const FLOWS: Flow[] = [
  {
    id: 1,
    title: "Outlook, overleg kiezen en aanvullen",
    text: "Inloggen met Microsoft, je vaste overleg kiezen uit Outlook en de openstaande acties aanvullen.",
    steps: ["Account", "Microsoft", "Outlook", "Lijst", "Acties", "App"],
    variant: "A",
    demo: { login: "success", calendar: "series" },
    start: "/start",
  },
  {
    id: 2,
    title: "E-mail en wachtwoord, overleg zelf samenstellen",
    text: "Account met werk-e-mail, geen agendakoppeling: het overleg en de acties vul je zelf in.",
    steps: ["Account", "E-mail", "Zelf invullen", "Acties", "App"],
    variant: "A",
    demo: {},
    start: "/start",
  },
  {
    id: 3,
    title: "Outlook, overlegstructuur en acties uit notities",
    text: "Variant B: too-doo toont je overlegstructuur uit Outlook en haalt de acties uit je notities.",
    steps: ["Account", "Microsoft", "Structuur", "Acties uit notities", "Overzicht"],
    variant: "B",
    demo: { login: "success", calendar: "series" },
    start: "/start",
  },
  {
    id: 4,
    title: "Inloggen en niets doen",
    text: "Inloggen met Microsoft en de onboarding overslaan: je landt in de lege app.",
    steps: ["Account", "Microsoft", "Ik doe dit later", "Lege app"],
    variant: "A",
    demo: { login: "success" },
    start: "/start",
  },
];

export interface EdgeCase extends FlowPreset {
  id: "blocked" | "admin" | "none" | "example";
  title: string;
}

/** Randgevallen starten één klik vóór het randgeval (SPEC.md §8). */
export const EDGE_CASES: EdgeCase[] = [
  { id: "blocked", title: "Microsoft-login geblokkeerd door bedrijf", demo: { login: "blocked" }, start: "/start" },
  {
    id: "admin",
    title: "Agenda vraagt goedkeuring IT-beheerder",
    demo: { calendar: "admin" },
    signedIn: true,
    start: "/overleg",
  },
  {
    id: "none",
    title: "Agenda gekoppeld, geen vaste overleggen",
    demo: { calendar: "none" },
    signedIn: true,
    start: "/overleg",
  },
  { id: "example", title: "Eerst rondkijken met voorbeelddata", demo: {}, start: "/voorbeeld" },
];
