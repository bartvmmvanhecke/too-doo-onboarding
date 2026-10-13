/**
 * In- en uitvoer van de assistent in Variant A (SPEC-LAZY.md §4). De assistent is regelgebaseerd;
 * deze types blijven dezelfde als hij later een echte LLM-aanroep wordt.
 */
import type { Purpose, Entry, BlockKind } from "@/lib/agenda";
import type { MeetingGoal } from "@/lib/assistant/goals";
import type { ISODate } from "@/lib/date";
import type { Recurrence } from "@/lib/meeting";
import type { Person } from "@/lib/mock-data";
import type { Minutes } from "@/lib/time";

/** Een deelnemer zoals de gebruiker hem noemde (enkel voornaam). */
export type GuestPerson = Pick<Person, "id" | "name" | "initials" | "color">;

/** Eigenaar van een actie: een deelnemer, de gebruiker zelf ("me") of nog niemand. */
export const ME = "me";

/** Doel, eigenaars en duur van een agendapunt, zoals in het detailscherm. */
export interface GuestItemMeta {
  entries?: Entry[];
  purposes?: Purpose[];
  ownerIds?: string[];
  duration?: Minutes | null;
}

/** Een agendapunt onder een thema. */
export interface GuestItem extends GuestItemMeta {
  id: string;
  text: string;
}

/** Een thema (blok) van de agenda, met de agendapunten eronder. */
export interface GuestTopic {
  kind?: BlockKind;
  duration?: Minutes | null;
  id: string;
  text: string;
  items?: GuestItem[];
  /** Wie het thema brengt. */
  presenterId?: string | null;
  /** Doel van een thema zonder agendapunten ("Korter en gerichter", C0k). */
  purposes?: Purpose[];
  /** Korte uitleg onder de titel (C0l, C0m); **vet** wordt vet getoond. */
  subtitle?: string;
  /** Label "nieuw": door een doel toegevoegd (C0l). */
  isNew?: boolean;
  /** "Rondje per persoon": elke deelnemer wordt er een punt in; leeg = gestippelde plekken (C0l). */
  round?: boolean;
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
  /** Thema's van de agenda; leeg = standaardblokken (Lopende zaken). */
  topics: GuestTopic[];
  /** Agendapunten onder het vaste thema "Varia" (altijd laatste). */
  variaItems?: GuestItem[];
  /** Presentator van "Varia". */
  variaPresenterId?: string | null;
  /** Nog niet bevestigd met "Klopt". */
  proposed: boolean;
  /** Doelen uit de doelvraag (C0j–C0m), in de volgorde waarin ze gekozen werden. */
  goals?: MeetingGoal[];
  /** Tijd voor "Openstaande acties" ("Korter en gerichter", C0k). */
  actionsDuration?: Minutes | null;
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

export interface GuestDecision extends GuestItemMeta {
  id: string;
  text: string;
  confirmed: boolean;
  /** Versleept naar dit thema; anders het thema over knelpunten of beslissingen, of het eerste. */
  topicId?: string | null;
}

export type GuestStep = 1 | 2 | 3 | "done";

export type EntryChoice = "meeting" | "notes" | "calendar" | "example" | "empty";

/** De drie startkeuzes (C1), als eenvoudige tekstregels. */
export type StartChoice = "calendar" | "notes" | "meeting";

/** Velden die "Uit agenda halen" en "Deelnemers uit agenda" invullen (C1). */
export type CalendarField = "when" | "participants";

/** Wat de assistent nu vraagt; bepaalt de knoppen onder het laatste bericht. */
export type Pending =
  /** De startkeuzes; na een mislukte agendakoppeling enkel de twee andere. */
  | { kind: "entry"; choices?: StartChoice[] }
  | { kind: "sentence" }
  /** Na de zin (C1): "Wanneer gaat het door en wie zit erbij?" in één vraag. */
  | { kind: "when-who" }
  /** Te vage zin (C1): "Waar willen jullie in die meeting vooral vooruitgang op boeken?" (vervallen) */
  | { kind: "topics" }
  /**
   * Te vage zin (C0j–C0m): de vrijblijvende doelvraag met vier doelen. `followUp`: de vervolgvraag van het
   * laatst gekozen doel, waarop het volgende antwoord slaat.
   */
  | { kind: "goal"; followUp: MeetingGoal | null }
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
  card?: "summary" | "mail" | "dropzone" | "goals";
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
  /** De vier doelchips staan onder de doelvraag; weg zodra de gebruiker typt of links iets bewerkt. */
  goalChips?: boolean;
}

export type AssistantInput =
  /** Een startkeuze, het "+"-menu of een zin als "koppel mijn agenda". */
  | { type: "entry"; entry: StartChoice }
  /** "Uit agenda halen" / "Deelnemers uit agenda" in de datumregel. */
  | { type: "calendar-field"; fields: CalendarField[] }
  /** "Start met een lege meeting" (C1d). */
  | { type: "start-empty" }
  | { type: "calendar"; provider: CalendarProvider; result: CalendarResult }
  | { type: "pick-meeting"; id: string }
  | { type: "notes-file"; name: string; text: string; sample: boolean; image: boolean; audio?: boolean }
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
  | { type: "paste"; process: boolean }
  /** "Laat zo" op de vraag naar onderwerpen. */
  | { type: "skip-topics" }
  /** Een doelchip onder de doelvraag (C0j–C0m). */
  | { type: "goal"; goal: MeetingGoal }
  /** Een snelkeuze bij "Hoeveel tijd hebben jullie meestal?" (C0k). */
  | { type: "goal-duration"; minutes: Minutes };

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
  /** "ik doe het zelf" / "toon een voorbeeld": de assistent sluit, of het voorbeeld opent. */
  ui?: "close" | "example";
}
