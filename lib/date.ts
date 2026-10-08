/**
 * Datums worden bewaard als "YYYY-MM-DD" (lokale tijd) en altijd relatief
 * vanaf vandaag berekend (SPEC.md §8, "Data").
 */
export type ISODate = string;

const DAYS_SHORT = ["zo", "ma", "di", "wo", "do", "vr", "za"] as const;
const DAYS_LONG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"] as const;
const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;
const MONTH_PREFIXES: string[][] = [
  ["jan"],
  ["feb"],
  ["mrt", "maa"],
  ["apr"],
  ["mei"],
  ["jun"],
  ["jul"],
  ["aug"],
  ["sep"],
  ["okt", "oct"],
  ["nov"],
  ["dec"],
];
const ORDINALS = ["Eerste", "Tweede", "Derde", "Vierde", "Laatste"] as const;

export const WEEKDAY = { zo: 0, ma: 1, di: 2, wo: 3, do: 4, vr: 5, za: 6 } as const;

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toISO(d: Date): ISODate {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function asDate(d: Date | ISODate): Date {
  return typeof d === "string" ? fromISO(d) : d;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** "ma 13 okt" */
export function formatShortDate(d: Date | ISODate): string {
  const x = asDate(d);
  return `${DAYS_SHORT[x.getDay()]} ${x.getDate()} ${MONTHS_SHORT[x.getMonth()]}`;
}

/** "maandag" */
export function weekdayLong(d: Date | ISODate): string {
  return DAYS_LONG[asDate(d).getDay()];
}

/** "ma" */
export function weekdayShort(d: Date | ISODate): string {
  return DAYS_SHORT[asDate(d).getDay()];
}

/** "Eerste", "Tweede", ... "Laatste" — de hoeveelste weekdag van de maand. */
export function weekdayOrdinal(d: Date | ISODate): string {
  return ORDINALS[Math.ceil(asDate(d).getDate() / 7) - 1];
}

/** Eerstvolgende gegeven weekdag, strikt na `from`. */
export function nextWeekday(weekday: number, from: Date = today()): Date {
  const diff = (weekday - from.getDay() + 7) % 7 || 7;
  return addDays(from, diff);
}

/** Eerstvolgende n-de weekdag van een maand (bv. eerste donderdag), strikt na `from`. */
export function nextNthWeekdayOfMonth(n: number, weekday: number, from: Date = today()): Date {
  for (let i = 0; i < 3; i++) {
    const first = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    const candidate = new Date(first.getFullYear(), first.getMonth(), 1 + offset + (n - 1) * 7);
    if (candidate > from) return candidate;
  }
  return nextWeekday(weekday, from);
}

function weekdayFromToken(token: string): number | null {
  const t = token.replace(/[.,]$/, "");
  for (let i = 0; i < 7; i++) {
    if (t === DAYS_SHORT[i] || t === DAYS_LONG[i]) return i;
  }
  return null;
}

function monthFromToken(token: string): number | null {
  const t = token.replace(/\.$/, "");
  if (t.length < 3) return null;
  const idx = MONTH_PREFIXES.findIndex((ps) => ps.some((p) => t.startsWith(p)));
  return idx >= 0 ? idx : null;
}

function buildDate(day: number, month: number, year: number | null, ref: Date): Date | null {
  const y = year ?? ref.getFullYear();
  const d = new Date(y, month, day);
  if (d.getMonth() !== month || d.getDate() !== day) return null;
  if (year === null && d < ref) d.setFullYear(y + 1);
  return d;
}

/**
 * Leest een getypte datum: "ma 13 okt", "13 okt", "13/10", "13-10", "13/10/2026"
 * of enkel een weekdag ("ma", "maandag" → eerstvolgende). Null bij ongeldige invoer.
 */
export function parseDateInput(input: string, ref: Date = today()): Date | null {
  const tokens = String(input ?? "")
    .toLowerCase()
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;

  const weekday = weekdayFromToken(tokens[0]);
  const rest = weekday !== null ? tokens.slice(1) : tokens;
  if (rest.length === 0) return weekday !== null ? nextWeekday(weekday, addDays(ref, -1)) : null;

  const numeric = rest.join("").match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2}|\d{4}))?$/);
  if (numeric && rest.length === 1) {
    const year = numeric[3] ? (numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3])) : null;
    return buildDate(Number(numeric[1]), Number(numeric[2]) - 1, year, ref);
  }

  if (rest.length >= 2 && rest.length <= 3 && /^\d{1,2}$/.test(rest[0])) {
    const month = monthFromToken(rest[1]);
    if (month === null) return null;
    let year: number | null = null;
    if (rest[2]) {
      if (!/^\d{4}$/.test(rest[2])) return null;
      year = Number(rest[2]);
    }
    return buildDate(Number(rest[0]), month, year, ref);
  }
  return null;
}
