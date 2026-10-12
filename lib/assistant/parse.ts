/**
 * Zinnen van de gebruiker begrijpen (SPEC-LAZY.md §4, "Zin begrijpen"). Nederlands, hoofdletterongevoelig,
 * enkel regels. Alles wat niet in de zin staat, blijft null: de assistent vraagt het, hij verzint niets.
 */
import type { Recurrence } from "@/lib/meeting";
import { parseTime, type Minutes } from "@/lib/time";
import { upperFirst } from "@/lib/utils";

export interface ParsedMeeting {
  name: string | null;
  recurrence: Recurrence | null;
  /** 1 = maandag … 5 = vrijdag */
  weekday: number | null;
  time: Minutes | null;
  /** Null = niet genoemd (de assistent stelt dan 60 min voor). */
  duration: Minutes | null;
  participants: string[];
  topics: string[];
}

export type ParsedField = "name" | "recurrence" | "weekday" | "time" | "duration" | "participants" | "topics";

/** Welke velden in de zin stonden. */
export function foundFields(p: ParsedMeeting): ParsedField[] {
  const out: ParsedField[] = [];
  if (p.name) out.push("name");
  if (p.recurrence) out.push("recurrence");
  if (p.weekday) out.push("weekday");
  if (p.time !== null) out.push("time");
  if (p.duration !== null) out.push("duration");
  if (p.participants.length) out.push("participants");
  if (p.topics.length) out.push("topics");
  return out;
}

/** Bekende overlegtypes, met de naam zoals ze in de app staan. */
const KNOWN_NAMES: [RegExp, string][] = [
  [/\bproductie-?(?:overleg|vergadering)\b/, "Productieoverleg"],
  [/\bmanagement-?(?:overleg|vergadering)\b/, "Managementoverleg"],
  [/\bveiligheids-?(?:overleg|vergadering)\b/, "Veiligheidsoverleg"],
  [/\bkwaliteits-?(?:overleg|vergadering)\b/, "Kwaliteitsoverleg"],
  [/\bteam-?(?:overleg|vergadering)\b/, "Teamoverleg"],
  [/\bdirectiecomit[eé]\b/, "Directiecomité"],
  [/\bdirectie-?(?:overleg|vergadering)\b/, "Directieoverleg"],
  [/\bsales-?(?:overleg|vergadering)\b/, "Salesoverleg"],
  [/\bweekstart\b/, "Weekstart"],
  [/\bmt\b/, "MT"],
];

/** Kopregel van notities ("Productie 6/10") → naam van het overleg, als het type herkenbaar is. */
const HEADING_NAMES: [RegExp, string][] = [
  [/\bproductie/, "Productieoverleg"],
  [/\bmanagement/, "Managementoverleg"],
  [/\bveiligheid/, "Veiligheidsoverleg"],
  [/\bkwaliteit/, "Kwaliteitsoverleg"],
  [/\bteam/, "Teamoverleg"],
  [/\bdirectie/, "Directieoverleg"],
  [/\bsales/, "Salesoverleg"],
  [/\bweekstart\b/, "Weekstart"],
  [/\bmt\b/, "MT"],
];

const DAYS: [RegExp, number][] = [
  [/\b(maandag|ma)\b/, 1],
  [/\b(dinsdag|di)\b/, 2],
  [/\b(woensdag|wo)\b/, 3],
  [/\b(donderdag|do)\b/, 4],
  [/\b(vrijdag|vr)\b/, 5],
];

const DAY_WORDS = "maandag|dinsdag|woensdag|donderdag|vrijdag|ma|di|wo|do|vr";

/** Woorden waar de naam ophoudt (zinsdeel tot komma, dubbele punt of "met"). */
const NAME_STOP = new RegExp(
  String.raw`[,:.]|\b(?:met|elke|iedere|wekelijks|tweewekelijks|maandelijks|om|op|over|${DAY_WORDS})\b`,
);

export function parseRecurrence(text: string): Recurrence | null {
  const s = text.toLowerCase();
  if (/\bom de (?:2|twee) weken\b|\btweewekelijks\b|\bom de andere week\b/.test(s)) return "biweekly";
  if (/\bmaandelijks\b|\b(?:elke|iedere) maand\b/.test(s)) return "monthly";
  if (new RegExp(String.raw`\b(?:elke|iedere) (?:week|${DAY_WORDS})\b|\bwekelijks\b`).test(s)) return "weekly";
  if (/\beenmalig\b|\bééns\b|\been keer\b/.test(s)) return "once";
  return null;
}

export function parseWeekday(text: string): number | null {
  const s = text.toLowerCase();
  let best: { day: number; index: number } | null = null;
  for (const [re, day] of DAYS) {
    const m = s.match(re);
    if (m?.index !== undefined && (!best || m.index < best.index)) best = { day, index: m.index };
  }
  return best?.day ?? null;
}

interface Span {
  value: Minutes;
  start: number;
  end: number;
}

/** Duur: "anderhalf uur" → 90, "half uur" → 30, "een uurtje" → 60, "45 min" → 45, "1u30" → 90. */
function findDuration(s: string): Span | null {
  const rules: [RegExp, (m: RegExpMatchArray) => Minutes][] = [
    [/\banderhalf\s*uur(?:tje)?\b/, () => 90],
    [/\b(?:een\s+)?half\s*uur(?:tje)?\b|\bhalfuur\b/, () => 30],
    [/\b(\d{1,3})\s*min(?:uten|uut)?\b/, (m) => Number(m[1])],
    [/\b(?:een|1)\s*uur(?:tje)?\b|\buurtje\b/, () => 60],
    [/(?<!\bom\s)\b([1-3])u(30|15|45)?\b/, (m) => Number(m[1]) * 60 + Number(m[2] ?? 0)],
    [/(?<!\bom\s)\b([2-3])\s*uur\b/, (m) => Number(m[1]) * 60],
  ];
  for (const [re, value] of rules) {
    const m = s.match(re);
    if (m?.index !== undefined) return { value: value(m), start: m.index, end: m.index + m[0].length };
  }
  return null;
}

/** Uur: "8u", "8u30", "8:30", "om 9", "09.00", "om 8 uur" → minuten na middernacht. */
function findTime(s: string, skip: Span | null): Span | null {
  const rules: RegExp[] = [
    /\b(\d{1,2})[u:.h](\d{2})\b/g,
    /\b(\d{1,2})u\b/g,
    /\bom\s+(\d{1,2})(?:\s*uur)?\b(?!\s*(?:weken|week|maanden|maand|min))/g,
  ];
  for (const re of rules) {
    for (const m of s.matchAll(re)) {
      const start = m.index ?? 0;
      if (skip && start < skip.end && start + m[0].length > skip.start) continue;
      const h = Number(m[1]);
      const min = Number(m[2] ?? 0);
      if (h > 23 || min > 59) continue;
      return { value: h * 60 + min, start, end: start + m[0].length };
    }
  }
  return null;
}

export function parseDuration(text: string): Minutes | null {
  return findDuration(text.toLowerCase())?.value ?? null;
}

/** Uur in een zin, of een los antwoord als "9" of "14:30". */
export function parseTimeIn(text: string): Minutes | null {
  const s = text.toLowerCase();
  const found = findTime(s, findDuration(s));
  if (found) return found.value;
  return /^\s*\d{1,2}([:.u]\d{2})?\s*$/.test(s) ? parseTime(s.trim()) : null;
}

const NOT_NAMES = new Set(["ik", "mij", "mezelf", "jij", "jou", "je", "ons", "het", "de", "team", "iedereen"]);

/** "Jan, Sofie, Pieter en Karim" → ["Jan", "Sofie", "Pieter", "Karim"]. Enkel woorden die op een naam lijken. */
export function parseNames(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/,|\ben\b|&|\+/i)
        .map((part) => part.trim().replace(/[.!?]+$/, ""))
        .filter((part) => /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*(?:\s+[A-Za-zÀ-ÿ'-]+)?$/.test(part))
        .filter((part) => !NOT_NAMES.has(part.toLowerCase()))
        .map((part) => part.split(/\s+/).map(upperFirst).join(" ")),
    ),
  ];
}

const TOPIC_TITLES: [RegExp, string][] = [
  [/\borders?\b/, "Lopende orders"],
  [/\b(?:problemen|probleem|knelpunten|knelpunt)\b/, "Knelpunten en beslissingen"],
  [/\bplanning\b/, "Planning komende week"],
  [/\b(?:veiligheid|incidenten|incident)\b/, "Veiligheid en incidenten"],
  [/\b(?:kwaliteit|klachten)\b/, "Kwaliteit en klachten"],
];

/** "lopende orders, problemen en planning" → herkenbare agendapunten. */
export function parseTopics(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/,|;|\ben\b/i)) {
    const part = raw.trim().replace(/[.!?]+$/, "");
    if (!part) continue;
    const known = TOPIC_TITLES.find(([re]) => re.test(part.toLowerCase()));
    const title = known ? known[1] : upperFirst(part);
    if (!out.includes(title)) out.push(title);
  }
  return out;
}

function parseName(text: string): string | null {
  const s = text.toLowerCase();
  for (const [re, name] of KNOWN_NAMES) if (re.test(s)) return name;
  const stop = s.search(NAME_STOP);
  const head = (stop >= 0 ? text.slice(0, stop) : text)
    .trim()
    .replace(/^(?:ons|onze|het|de|mijn|een|our)\s+/i, "")
    .trim();
  return head ? upperFirst(head) : null;
}

/** Naam uit de kopregel van notities, enkel als het overlegtype herkenbaar is. */
export function nameFromHeading(line: string): string | null {
  const s = line.toLowerCase();
  for (const [re, name] of HEADING_NAMES) if (re.test(s)) return name;
  return null;
}

/** Een antwoord op "Hoe heet het overleg?". */
export function parseNameReply(text: string): string | null {
  return parseName(text);
}

/** Deelnemers na "met", tot de dubbele punt, "over" of het einde van de zin. */
function parseParticipants(text: string): string[] {
  const m = text.match(/\bmet\s+(.+?)(?=:|\.|\bover\b|\belke\b|\biedere\b|\bom\b|\bop\b|$)/i);
  return m ? parseNames(m[1]) : [];
}

/** Agendapunten na de dubbele punt of na "over". */
function parseTopicPart(text: string): string[] {
  const colon = text.indexOf(":");
  if (colon >= 0) return parseTopics(text.slice(colon + 1));
  const over = text.match(/\bover\s+(.+)$/i);
  return over ? parseTopics(over[1]) : [];
}

/** Eén zin over een overleg → wat erin stond. */
export function parseMeetingSentence(text: string): ParsedMeeting {
  const s = text.toLowerCase();
  const duration = findDuration(s);
  const time = findTime(s, duration);
  return {
    name: parseName(text),
    recurrence: parseRecurrence(text),
    weekday: parseWeekday(text),
    time: time?.value ?? null,
    duration: duration?.value ?? null,
    participants: parseParticipants(text),
    topics: parseTopicPart(text),
  };
}

/** Een aanpassing na het voorstel ("het duurt anderhalf uur"): enkel wat uitdrukkelijk genoemd wordt, zonder naam. */
export function parseMeetingUpdate(text: string): ParsedMeeting {
  const p = parseMeetingSentence(text);
  const named = KNOWN_NAMES.some(([re]) => re.test(text.toLowerCase()));
  return { ...p, name: named ? p.name : null };
}

/** Kort genoeg om een opdracht te zijn, en geen zin over een overleg. */
const COMMAND_MAX = 80;

/**
 * "koppel mijn agenda", "haal uit outlook", "ik heb notities", "notities uploaden": de assistent voert die
 * actie meteen uit, zoals het "+"-menu (SPEC-LAZY.md §4, Ingangen blijven bereikbaar).
 */
export function parseIntent(text: string): "calendar" | "notes" | "close" | "example" | null {
  const t = text.trim().toLowerCase();
  if (t.length > COMMAND_MAX) return null;
  // De assistent sluiten of een voorbeeld tonen (SPEC-LAZY.md §4, Stap 0, C1f).
  if (/^(ik doe het (wel )?zelf|ik doe (het )?verder zelf|sluit( maar| de assistent)?|laat maar)\b/.test(t))
    return "close";
  if (/\b(toon|laat)\b.*\bvoorbeeld\b|^voorbeeld( tonen)?$/.test(t)) return "example";
  if (
    /\bkoppel\w*\b.*\b(agenda|outlook|google)\b|\b(agenda|outlook|google)\b.*\bkoppelen\b/.test(t) ||
    /\b(haal|halen)\b.*\buit\s+(mijn\s+|de\s+|je\s+)?(agenda|outlook|google)\b/.test(t)
  )
    return "calendar";
  if (/\b(ik\s+)?heb\s+(\w+\s+)?notities\b|\bnotities\s+(uploaden|opladen|plakken|toevoegen|verwerken)\b/.test(t))
    return "notes";
  return null;
}

/** Een geplakte tekst van minstens 3 regels of 200 tekens: dit lijken notities (C2b). */
export function looksLikeNotes(text: string): boolean {
  return text.trim().length >= 200 || text.split(/\r?\n/).filter((l) => l.trim()).length >= 3;
}
