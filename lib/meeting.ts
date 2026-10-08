import { formatShortDate, weekdayLong, weekdayOrdinal, weekdayShort, type ISODate } from "@/lib/date";
import { formatTime, formatTimeRange, type Minutes } from "@/lib/time";

export type Recurrence = "once" | "weekly" | "biweekly" | "monthly" | "quarterly";

/** Keuzes in "Hoe vaak?" (2b), in deze volgorde. */
export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "once", label: "Eenmalig" },
  { value: "weekly", label: "Elke week" },
  { value: "biweekly", label: "Om de 2 weken" },
  { value: "monthly", label: "Maandelijks" },
];

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  once: "Eenmalig",
  weekly: "Elke week",
  biweekly: "Om de 2 weken",
  monthly: "Maandelijks",
  quarterly: "Per kwartaal",
};

/** De velden die nodig zijn om een overleg te beschrijven. */
export interface MeetingSchedule {
  name: string;
  recurrence: Recurrence;
  /** Volgende keer; null als het overleg nog niet ingepland is (snel toevoegen). */
  date: ISODate | null;
  time: Minutes | null;
  duration: Minutes;
}

/** "Elke maandag", "Om de 2 weken op dinsdag", "Eerste donderdag van de maand" */
export function rhythmLabel(recurrence: Recurrence, date: ISODate | null): string {
  if (!date) return RECURRENCE_LABEL[recurrence];
  switch (recurrence) {
    case "weekly":
      return `Elke ${weekdayLong(date)}`;
    case "biweekly":
      return `Om de 2 weken op ${weekdayLong(date)}`;
    case "monthly":
      return `${weekdayOrdinal(date)} ${weekdayLong(date)} van de maand`;
    default:
      return RECURRENCE_LABEL[recurrence];
  }
}

/**
 * Eén regel zoals in de mockups:
 * "Elke maandag · 08:00–09:00 · volgende: ma 13 okt · 6 deelnemers"
 */
export function scheduleLine(
  m: MeetingSchedule,
  opts: { next?: boolean; participants?: number } = {},
): string {
  const parts = [rhythmLabel(m.recurrence, m.date)];
  if (m.time !== null) parts.push(formatTimeRange(m.time, m.duration));
  if (opts.next !== false && m.date) {
    parts.push(m.recurrence === "once" ? formatShortDate(m.date) : `volgende: ${formatShortDate(m.date)}`);
  }
  if (opts.participants) parts.push(`${opts.participants} ${opts.participants === 1 ? "deelnemer" : "deelnemers"}`);
  return parts.join(" · ");
}

/** Korte vorm voor de modal: "Om de 2 weken · di 14:00" */
export function shortRhythmLine(m: MeetingSchedule): string {
  const r = m.recurrence === "monthly" ? "Maandelijks" : RECURRENCE_LABEL[m.recurrence];
  if (!m.date || m.time === null) return r;
  return `${r} · ${weekdayShort(m.date)} ${formatTime(m.time)}`;
}

const TYPE_RULES: [RegExp, string][] = [
  [/productie|werkplaats|atelier/, "Productie"],
  [/management|\bmt\b|directie/, "Management"],
  [/veiligheid|preventie/, "Veiligheid"],
  [/kwaliteit/, "Kwaliteit"],
  [/planning/, "Planning"],
  [/sales|verkoop|commercie/, "Sales"],
  [/bestuur/, "Bestuur"],
  [/team/, "Team"],
];

/** Overlegtype afleiden uit de naam (achter de schermen, SPEC.md §3.3). */
export function deriveMeetingType(name: string): string {
  const n = name.toLowerCase();
  for (const [re, type] of TYPE_RULES) if (re.test(n)) return type;
  return "Algemeen";
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "overleg"
  );
}

/** Naamsuggesties in 2b (SPEC.md §3.3). */
export const NAME_SUGGESTIONS = [
  "Productieoverleg",
  "Managementoverleg",
  "Veiligheidsoverleg",
  "Kwaliteitsoverleg",
  "Teamoverleg",
];

/** Naamsuggesties in de lege toestand (Product-Leeg). */
export const QUICK_NAME_SUGGESTIONS = ["Productieoverleg", "Managementoverleg", "Teamoverleg"];

/** Suggesties in de modal "Andere overlegmomenten". */
export const MORE_NAME_SUGGESTIONS = ["Planningsoverleg", "Raad van bestuur", "Teamoverleg"];

export const DURATION_PRESETS: { value: Minutes; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 uur" },
  { value: 90, label: "1u30" },
];
