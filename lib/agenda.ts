/**
 * Agenda van een vergadering: blokken met agendapunten, pauzes en het blok
 * "Openstaande acties". Ook de helpers voor tijden, tellers en deadlines.
 */
import { addDays, formatShortDate, parseDateInput, today, toISO, type ISODate } from "@/lib/date";
import type { Minutes } from "@/lib/time";
import { uid } from "@/lib/utils";

export type Purpose = "discuss" | "inform" | "decide";

export const PURPOSES: { value: Purpose; label: string; hint: string }[] = [
  { value: "discuss", label: "Bespreken", hint: "Samen bespreken en afwegen" },
  { value: "inform", label: "Informeren", hint: "Info delen, geen beslissing nodig" },
  { value: "decide", label: "Beslissen", hint: "Er is een beslissing of actie nodig" },
];

export const PURPOSE_CLASS: Record<Purpose, string> = {
  discuss: "bg-purpose-discuss-bg text-purpose-discuss",
  inform: "bg-purpose-inform-bg text-purpose-inform",
  decide: "bg-purpose-decide-bg text-purpose-decide",
};

export type EntryKind = "decision" | "action" | "note" | "document";

export const ENTRY_KINDS: { kind: EntryKind; label: string; plural: string; tag: string; placeholder: string }[] = [
  {
    kind: "decision",
    label: "Beslissing",
    plural: "beslissingen",
    tag: "Beslissing",
    placeholder: "Voeg een beslissing toe…",
  },
  { kind: "action", label: "Actie", plural: "acties", tag: "Actie", placeholder: "Voeg een actie toe…" },
  { kind: "note", label: "Notitie", plural: "notities", tag: "Notitie", placeholder: "Voeg een notitie toe…" },
  { kind: "document", label: "Document", plural: "documenten", tag: "Document", placeholder: "" },
];

/** Iets dat tijdens (of voor) een vergadering bij een agendapunt is vastgelegd. */
export interface Entry {
  id: string;
  kind: EntryKind;
  text: string;
  ownerId: string | null;
  /** Deadline of "uitvoeren tegen"; vrije tekst zoals "vr 17 okt". */
  date: string;
  /** Bij een actie: de actie in "Openstaande acties". */
  actionId?: string;
  /** Wie het vastlegde en wanneer (ms). */
  authorId?: string | null;
  createdAt?: number;
  /** Document: grootte in bytes. */
  size?: number;
}

/** Wat je invult bij een nieuw item; id, actie, auteur en tijd vult de store aan. */
export type EntryInput = Pick<Entry, "kind" | "text" | "ownerId" | "date" | "size">;

export interface AgendaItem {
  id: string;
  text: string;
  /** Wie het punt brengt; één of meer collega's. */
  ownerIds: string[];
  duration: Minutes | null;
  purposes: Purpose[];
  entries: Entry[];
}

export type BlockKind = "actions" | "topics" | "break";

export interface AgendaBlock {
  id: string;
  kind: BlockKind;
  title: string;
  /** Korte uitleg onder de titel, bv. bij Varia. */
  subtitle?: string;
  presenterId: string | null;
  /** Pauze, of de tijd voor "Openstaande acties". */
  duration: Minutes | null;
  items: AgendaItem[];
}

/** Een lopende vergadering. Stappen zijn agendapunten of het blok "Openstaande acties". */
export interface MeetingRun {
  startedAt: number;
  stepStartedAt: number;
  currentId: string | null;
  doneIds: string[];
  postponedIds: string[];
  /** Werkelijke duur per afgeronde stap, in seconden. */
  actuals: Record<string, number>;
}

export function newItem(text: string, extra: Partial<AgendaItem> = {}): AgendaItem {
  return { id: uid("i-"), text, ownerIds: [], duration: null, purposes: [], entries: [], ...extra };
}

export function newBlock(kind: BlockKind, extra: Partial<AgendaBlock> = {}): AgendaBlock {
  const title = kind === "actions" ? "Openstaande acties" : kind === "break" ? "Pauze" : "Nieuw blok";
  return {
    id: uid("b-"),
    kind,
    title,
    presenterId: null,
    duration: kind === "break" ? 5 : null,
    items: [],
    ...extra,
  };
}

/** Standaardagenda: Openstaande acties → Lopende zaken → Varia. */
export function defaultBlocks(): AgendaBlock[] {
  return [
    newBlock("actions"),
    newBlock("topics", { title: "Lopende zaken" }),
    newBlock("topics", { title: "Varia", subtitle: "Wat onverwacht ter sprake komt" }),
  ];
}

export function allItems(blocks: AgendaBlock[]): AgendaItem[] {
  return blocks.flatMap((b) => b.items);
}

export function blockDuration(b: AgendaBlock): Minutes {
  if (b.kind !== "topics") return b.duration ?? 0;
  return b.items.reduce((n, i) => n + (i.duration ?? 0), 0);
}

/** Som van alle ingevulde tijden; null als er nergens een tijd staat. */
export function plannedMinutes(blocks: AgendaBlock[]): Minutes | null {
  const filled = blocks.some((b) => (b.kind === "topics" ? b.items.some((i) => i.duration) : b.duration));
  return filled ? blocks.reduce((n, b) => n + blockDuration(b), 0) : null;
}

/** De stappen van een lopende vergadering, in volgorde. */
export function runSteps(blocks: AgendaBlock[]): string[] {
  return blocks.flatMap((b) => (b.kind === "actions" ? [b.id] : b.kind === "topics" ? b.items.map((i) => i.id) : []));
}

export function countEntries(item: AgendaItem, kind: EntryKind): number {
  return item.entries.filter((e) => e.kind === kind).length;
}

/** Deadline als datum; data tot een half jaar terug tellen als verleden. */
export function deadlineDate(deadline: string): Date | null {
  return deadline ? parseDateInput(deadline, addDays(today(), -180)) : null;
}

/** Aantal dagen te laat (0 als niet te laat of geen datum). */
export function daysLate(deadline: string): number {
  const d = deadlineDate(deadline);
  if (!d) return 0;
  return Math.max(0, Math.round((today().getTime() - d.getTime()) / 86_400_000));
}

export function todayISO(): ISODate {
  return toISO(today());
}

/** "03:20" of "1:03:20" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1,2 MB", "820 kB" */
export function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} kB`;
}

/** "Vandaag 14:03", "gisteren 09:10" of "ma 12 okt 14:03" */
export function formatStamp(ms: number): string {
  const d = new Date(ms);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today().getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return `Vandaag ${time}`;
  if (diff === 1) return `Gisteren ${time}`;
  return `${formatShortDate(d)} ${time}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
