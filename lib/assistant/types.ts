/**
 * In- en uitvoer van de assistent in Variant A (SPEC-LAZY.md §4). De assistent is regelgebaseerd;
 * deze types blijven dezelfde als hij later een echte LLM-aanroep wordt.
 */
import type { ISODate } from "@/lib/date";
import type { Recurrence } from "@/lib/meeting";
import type { Person } from "@/lib/mock-data";
import type { Minutes } from "@/lib/time";

/** Een deelnemer zoals de gebruiker hem noemde (enkel voornaam). */
export type GuestPerson = Pick<Person, "id" | "name" | "initials" | "color">;

/** Eigenaar van een actie: een deelnemer, de gebruiker zelf ("me") of nog niemand. */
export const ME = "me";

export interface GuestTopic {
  id: string;
  text: string;
}

/** Het overleg in opbouw. Null = (nog) niet gezegd. */
export interface GuestMeeting {
  name: string | null;
  recurrence: Recurrence | null;
  /** 1 = maandag … 5 = vrijdag */
  weekday: number | null;
  time: Minutes | null;
  duration: Minutes;
  /** Duur niet genoemd: 60 min als voorstel. */
  durationProposed: boolean;
  participants: GuestPerson[];
  /** "Later" op de vraag naar deelnemers. */
  participantsSkipped: boolean;
  /** Agendapunten in "Lopende zaken"; leeg = standaardblokken. */
  topics: GuestTopic[];
  /** Nog niet bevestigd met "Klopt". */
  proposed: boolean;
  /** Uit de agenda overgenomen (label "uit Outlook"). */
  source?: CalendarProvider | null;
}

export type CalendarProvider = "outlook" | "google";

/** Een vast overleg of een losse afspraak uit de agenda, zoals de assistent ze toont (C1b). */
export interface CalendarOption {
  id: string;
  name: string;
  recurrence: Recurrence | null;
  weekday: number | null;
  time: Minutes;
  duration: Minutes;
  participants: GuestPerson[];
  /** "jij organiseert" */
  organizer: boolean;
  /** Agendapunten uit de uitnodiging. */
  topics: string[];
  /** "Elke maandag 08:00 · 6 deelnemers" */
  line: string;
}

/** Uitkomst van "Uit mijn agenda" (demo-uitkomsten voor login en agendatoestemming). */
export type CalendarResult =
  | { kind: "series"; options: CalendarOption[] }
  | { kind: "none"; options: CalendarOption[] }
  | { kind: "admin" }
  | { kind: "cancelled" }
  | { kind: "blocked" };

export interface GuestAction {
  id: string;
  text: string;
  ownerId: string | null;
  deadline: ISODate | null;
  /** Aangevinkt: klopt. */
  confirmed: boolean;
  /** "Later beslissen" op de vraag "Wie …?". */
  ownerLater: boolean;
  /** Afgevinkt in het overleg in opbouw (na stap 3). */
  done?: boolean;
}

export interface GuestDecision {
  id: string;
  text: string;
  confirmed: boolean;
}

export type GuestStep = 1 | 2 | 3 | "done";

export type EntryChoice = "meeting" | "notes" | "calendar" | "example";

/** De drie startkeuzes (C1), als eenvoudige tekstregels. */
export type StartChoice = "calendar" | "notes" | "meeting";

/** Velden die "Uit agenda halen" en "Deelnemers uit agenda" invullen (C1). */
export type CalendarField = "when" | "participants";

/** Wat de assistent nu vraagt; bepaalt de knoppen onder het laatste bericht. */
export type Pending =
  /** De startkeuzes; na een mislukte agendakoppeling enkel de twee andere. */
  | { kind: "entry"; choices?: StartChoice[] }
  | { kind: "sentence" }
  | { kind: "name" }
  | { kind: "day" }
  | { kind: "time" }
  | { kind: "recurrence" }
  | { kind: "participants" }
  | { kind: "confirm-meeting" }
  /**
   * "Outlook of Google?". `fields`: enkel die velden invullen (null = het hele overleg); `resume`: wat
   * openstond vóór het agendapad, daar gaat de assistent daarna mee verder.
   */
  | { kind: "provider"; fields: CalendarField[] | null; resume: Pending }
  | {
      kind: "pick-meeting";
      provider: CalendarProvider;
      options: CalendarOption[];
      fields: CalendarField[] | null;
      resume: Pending;
    }
  | { kind: "notes" }
  | { kind: "owner"; actionId: string }
  | { kind: "place-actions" }
  | { kind: "proposal" }
  /** "Dit lijken notities van een vorig overleg…" (C2b): de geplakte tekst wacht op Ja of Nee. */
  | { kind: "paste"; text: string; resume: Pending }
  | { kind: "idle" };

export interface Message {
  id: string;
  from: "assistant" | "user";
  /** **vet** wordt vet getoond. */
  text: string;
  /** Kaart onder het bericht, berekend uit de huidige state. */
  card?: "summary" | "mail" | "dropzone";
}

/** Een overleg dat al klaarstaat ("Nog een overleg toevoegen"). */
export interface GuestBundle {
  meeting: GuestMeeting;
  actions: GuestAction[];
  decisions: GuestDecision[];
}

/** De state waarop de assistent werkt. */
export interface AssistantState extends GuestBundle {
  step: GuestStep;
  entry: EntryChoice | null;
  pending: Pending;
  others: GuestBundle[];
  /** De herinnering "Heb je notities van de vorige keer?" kwam al (één keer, ook na herladen). */
  notesReminderShown: boolean;
}

export type AssistantInput =
  /** Een startkeuze, het "+"-menu of een zin als "koppel mijn agenda". */
  | { type: "entry"; entry: StartChoice }
  /** "Uit agenda halen" / "Deelnemers uit agenda" in de datumregel. */
  | { type: "calendar-field"; field: CalendarField }
  | { type: "calendar"; provider: CalendarProvider; result: CalendarResult }
  | { type: "pick-meeting"; id: string }
  | { type: "notes-file"; name: string; text: string; sample: boolean; image: boolean }
  | { type: "text"; text: string }
  | { type: "chip"; value: string }
  | { type: "confirm-meeting" }
  | { type: "adjust" }
  /** De gebruiker paste velden zelf aan in het hoofdvlak. */
  | { type: "edited" }
  | { type: "no-actions" }
  | { type: "place-actions" }
  | { type: "dismiss-proposal" }
  | { type: "another-meeting" }
  /** Antwoord op "Dit lijken notities…": verwerken of als gewoon bericht behandelen. */
  | { type: "paste"; process: boolean };

export type AssistantEvent = [
  name: "meeting_parsed" | "meeting_confirmed" | "actions_extracted" | "first_action_with_owner" | "meeting_ready",
  props: Record<string, string | number | boolean | string[] | null>,
];

export interface AssistantReply {
  state: AssistantState;
  messages: Omit<Message, "id">[];
  /** Velden die net ingevuld werden (2 s blauwe markering). */
  flash: string[];
  events: AssistantEvent[];
  /** Iets aanpassen: zet de velden in het hoofdvlak in bewerkmodus. */
  edit?: boolean;
}
