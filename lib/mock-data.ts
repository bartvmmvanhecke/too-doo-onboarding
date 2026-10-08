/**
 * Alle nepdata van het prototype (SPEC.md §4). Data worden relatief vanaf
 * vandaag berekend, daarom zijn reeksen en afspraken functies.
 */
import { addDays, nextNthWeekdayOfMonth, nextWeekday, toISO, WEEKDAY, type ISODate } from "@/lib/date";
import type { MeetingSchedule, Recurrence } from "@/lib/meeting";
import type { Minutes } from "@/lib/time";

export interface Person {
  id: string;
  name: string;
  email?: string;
  initials: string;
  /** Achtergrond- en tekstkleur van de avatar. */
  color: { bg: string; fg: string };
}

export const AVATAR_COLORS = [
  { bg: "#F2C9A8", fg: "#6A3412" },
  { bg: "#C9DDF6", fg: "#0F3B7A" },
  { bg: "#D6EDD9", fg: "#1E5A2E" },
  { bg: "#E7DDF6", fg: "#4B2A7A" },
  { bg: "#FBE3B5", fg: "#6A4512" },
  { bg: "#D3EEF0", fg: "#0E5560" },
  { bg: "#F6D6E3", fg: "#7A1F45" },
  { bg: "#E3E8F1", fg: "#2E3850" },
] as const;

export const MOCK_USER = {
  firstName: "Jan",
  lastName: "Peeters",
  email: "jan.peeters@metaalwerken.be",
  company: "Metaalwerken",
};

export const PEOPLE: Person[] = [
  { id: "jp", name: "Jan Peeters", email: "jan.peeters@metaalwerken.be", initials: "JP", color: AVATAR_COLORS[0] },
  { id: "sd", name: "Sofie De Smet", email: "sofie.desmet@metaalwerken.be", initials: "SD", color: AVATAR_COLORS[1] },
  {
    id: "pv",
    name: "Pieter Vermeulen",
    email: "pieter.vermeulen@metaalwerken.be",
    initials: "PV",
    color: AVATAR_COLORS[2],
  },
  { id: "lm", name: "Lotte Maes", email: "lotte.maes@metaalwerken.be", initials: "LM", color: AVATAR_COLORS[3] },
  { id: "kw", name: "Koen Wouters", email: "koen.wouters@metaalwerken.be", initials: "KW", color: AVATAR_COLORS[4] },
  { id: "ej", name: "Els Janssens", email: "els.janssens@metaalwerken.be", initials: "EJ", color: AVATAR_COLORS[5] },
  { id: "bd", name: "Bram Dewulf", email: "bram.dewulf@metaalwerken.be", initials: "BD", color: AVATAR_COLORS[6] },
  { id: "ne", name: "Nora El Amrani", email: "nora.elamrani@metaalwerken.be", initials: "NE", color: AVATAR_COLORS[7] },
  { id: "wh", name: "Wim Hermans", email: "wim.hermans@metaalwerken.be", initials: "WH", color: AVATAR_COLORS[0] },
  { id: "ig", name: "Ines Goossens", email: "ines.goossens@metaalwerken.be", initials: "IG", color: AVATAR_COLORS[1] },
  { id: "kd", name: "Karen Dhondt", email: "karen.dhondt@metaalwerken.be", initials: "KD", color: AVATAR_COLORS[0] },
  { id: "tc", name: "Tom Claes", email: "tom.claes@metaalwerken.be", initials: "TC", color: AVATAR_COLORS[2] },
];

/** De gebruiker zelf in de mockdata. */
export const USER_PERSON_ID = "jp";

type SeriesRule = { kind: "weekly" | "biweekly"; weekday: number } | { kind: "monthly"; nth: number; weekday: number };

export interface Series {
  id: string;
  name: string;
  /** Korte naam voor het weekraster in variant B. */
  short: string;
  /** Organiseert de gebruiker dit overleg (variant B: "Jij organiseert" / "Deelnemer")? */
  organizer: boolean;
  rule: SeriesRule;
  time: Minutes;
  duration: Minutes;
  participants: string[];
  /** Standaard aangevinkt in de modal "Andere overlegmomenten". */
  suggested: boolean;
}

export const SERIES: Series[] = [
  {
    id: "productie",
    short: "Productie",
    organizer: true,
    name: "Productieoverleg",
    rule: { kind: "weekly", weekday: WEEKDAY.ma },
    time: 8 * 60,
    duration: 60,
    participants: ["jp", "sd", "pv", "lm", "kw", "ej"],
    suggested: true,
  },
  {
    id: "management",
    short: "MT",
    organizer: true,
    name: "Managementoverleg",
    rule: { kind: "biweekly", weekday: WEEKDAY.di },
    time: 14 * 60,
    duration: 90,
    participants: ["lm", "kd", "jp", "sd"],
    suggested: true,
  },
  {
    id: "veiligheid",
    short: "Veiligheid",
    organizer: false,
    name: "Veiligheidsoverleg",
    rule: { kind: "monthly", nth: 1, weekday: WEEKDAY.do },
    time: 10 * 60,
    duration: 60,
    participants: ["jp", "pv", "kw", "ej", "bd", "ne", "wh", "ig"],
    suggested: true,
  },
  {
    id: "sales",
    short: "Sales",
    organizer: true,
    name: "Weekstart sales",
    rule: { kind: "weekly", weekday: WEEKDAY.ma },
    time: 9 * 60 + 30,
    duration: 30,
    participants: ["jp", "wh", "ig"],
    suggested: false,
  },
  {
    id: "kwaliteit",
    short: "Kwaliteit",
    organizer: false,
    name: "Kwaliteitsoverleg",
    rule: { kind: "biweekly", weekday: WEEKDAY.wo },
    time: 11 * 60,
    duration: 90,
    participants: ["tc", "jp", "pv", "sd", "kd"],
    suggested: false,
  },
];

export function seriesNextDate(s: Series): ISODate {
  const r = s.rule;
  return toISO(r.kind === "monthly" ? nextNthWeekdayOfMonth(r.nth, r.weekday) : nextWeekday(r.weekday));
}

const RULE_RECURRENCE: Record<SeriesRule["kind"], Recurrence> = {
  weekly: "weekly",
  biweekly: "biweekly",
  monthly: "monthly",
};

export function seriesSchedule(s: Series): MeetingSchedule {
  return {
    name: s.name,
    recurrence: RULE_RECURRENCE[s.rule.kind],
    date: seriesNextDate(s),
    time: s.time,
    duration: s.duration,
  };
}

export interface Appointment {
  id: string;
  name: string;
  date: ISODate;
  time: Minutes;
  duration: Minutes;
  participants: string[];
}

/** Losse afspraken in de komende 2 weken (toestand "geen reeksen"). */
export function getAppointments(): Appointment[] {
  const monday = nextWeekday(WEEKDAY.ma);
  return [
    {
      id: "afspraak-productie",
      name: "Overleg productie",
      date: toISO(monday),
      time: 8 * 60,
      duration: 60,
      participants: ["jp", "sd", "pv", "lm", "kw", "ej"],
    },
    {
      id: "afspraak-mt",
      name: "MT-vergadering",
      date: toISO(addDays(monday, 1)),
      time: 14 * 60,
      duration: 90,
      participants: ["jp", "sd", "lm", "kw"],
    },
  ];
}

/** Voorbeeldbedrijf voor /voorbeeld en de hero (niets wordt bewaard). */
export const EXAMPLE_ACTIONS = [
  {
    what: "Offerte nieuwe plooibank opvragen",
    initials: "KM",
    color: AVATAR_COLORS[0],
    due: "2 dagen te laat",
    late: true,
  },
  { what: "Instructie heftruck bijwerken", initials: "LD", color: AVATAR_COLORS[1], due: "vrijdag", late: false },
  {
    what: "Leverancier staal opnieuw contacteren",
    initials: "PV",
    color: AVATAR_COLORS[2],
    due: "volgende week",
    late: false,
  },
];

export const IT_MESSAGE = (firstName: string) => [
  "Hallo,",
  "Ik test too-doo om de opvolging van onze vaste overleggen te verbeteren. Om mijn terugkerende vergaderingen uit Outlook op te halen, heeft too-doo leesrechten op mijn agenda nodig.",
  "Kun je too-doo goedkeuren in Microsoft Entra? De stappen staan hier: [LINK NAAR HANDLEIDING]",
  `Bedankt, ${firstName}`,
];

/** Domeinen waaruit we geen bedrijfsnaam afleiden. */
export const GENERIC_EMAIL_DOMAINS = [
  "gmail",
  "googlemail",
  "hotmail",
  "outlook",
  "live",
  "icloud",
  "yahoo",
  "telenet",
  "skynet",
  "proximus",
  "scarlet",
  "msn",
];
