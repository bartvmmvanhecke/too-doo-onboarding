/**
 * Agenda van een vergadering: blokken met agendapunten, pauzes en het blok
 * "Openstaande acties". Ook de helpers voor tijden, tellers en deadlines.
 */
import { addDays, parseDateInput, today, toISO, type ISODate } from "@/lib/date";
import type { Minutes } from "@/lib/time";
import { uid } from "@/lib/utils";

export type Purpose = "discuss" | "inform" | "decide";

export const PURPOSES: { value: Purpose; label: string }[] = [
  { value: "discuss", label: "Bespreken" },
  { value: "inform", label: "Informeren" },
  { value: "decide", label: "Beslissen" },
];

export const PURPOSE_CLASS: Record<Purpose, string> = {
  discuss: "bg-purpose-discuss-bg text-purpose-discuss",
  inform: "bg-purpose-inform-bg text-purpose-inform",
  decide: "bg-purpose-decide-bg text-purpose-decide",
};

export type EntryKind = "decision" | "action" | "note" | "document";

export const ENTRY_KINDS: { kind: EntryKind; label: string; plural: string; tag: string }[] = [
  { kind: "decision", label: "Beslissing", plural: "beslissingen", tag: "Beslissing" },
  { kind: "action", label: "Actie", plural: "acties", tag: "Actie" },
  { kind: "note", label: "Notitie", plural: "notities", tag: "Notitie" },
  { kind: "document", label: "Document", plural: "documenten", tag: "Document" },
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
}

export interface AgendaItem {
  id: string;
  text: string;
  ownerId: string | null;
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
  return { id: uid("i-"), text, ownerId: null, duration: null, purposes: [], entries: [], ...extra };
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

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
