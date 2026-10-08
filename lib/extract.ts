/**
 * Gesimuleerde extractie van acties uit notities of een transcript (SPEC-FLOWS.md §4).
 * Geen echte AI: eenvoudige regels op tekst.
 */
import { addDays, nextWeekday, parseDateInput, toISO, today, type ISODate } from "@/lib/date";
import type { Person } from "@/lib/mock-data";
import { uid, upperFirst } from "@/lib/utils";

export interface Proposal {
  id: string;
  kind: "action" | "agenda";
  text: string;
  ownerId: string | null;
  date: ISODate | null;
  checked: boolean;
}

/** Voorbeeldtekst uit de mockup B3. */
export const SAMPLE_NOTES = `Productie 6/10
- plooibank: Jan vraagt nieuwe offerte, liefst voor vrijdag
- heftruck: instructie moet aangepast na incident, Sofie
- staal leverancier blijft te laat leveren -> opnieuw bellen
- planning wk 42 volgende keer beslissen`;

/** Vast transcript na "Inspreken" (SPEC.md §8). */
export const SAMPLE_TRANSCRIPT =
  "Jan vraagt een nieuwe offerte voor de plooibank, liefst voor vrijdag. Sofie past de instructie van de heftruck aan na het incident. De leverancier van staal moet opnieuw gebeld worden. Over de planning van week 42 moeten we volgende keer beslissen.";

const BULLET = /^\s*(?:[-*•–]|\d+[.)])\s+/;

/** Regels die voorstellen worden: met opsommingstekens enkel die regels, anders elke regel/zin. */
export function splitItems(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines.filter((l) => BULLET.test(l));
  if (bullets.length > 0) return bullets.map((l) => l.replace(BULLET, "").trim()).filter(Boolean);
  return lines
    .flatMap((l) => l.split(/(?<=[.!?])\s+/))
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Herkende titels voor de onderwerpen uit de voorbeeldtekst, zoals in de mockup. */
const KNOWN: { test: (l: string) => boolean; title: string }[] = [
  { test: (l) => /plooibank/.test(l) && /offerte/.test(l), title: "Nieuwe offerte plooibank opvragen" },
  { test: (l) => /heftruck/.test(l) && /instructie/.test(l), title: "Instructie heftruck aanpassen na incident" },
  { test: (l) => /staal/.test(l) && /leverancier/.test(l), title: "Leverancier staal opnieuw bellen" },
  { test: (l) => /planning/.test(l) && /(wk|week)\s*42/.test(l), title: "Planning week 42" },
];

const WEEKDAYS: Record<string, number> = {
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
  zondag: 0,
};

const DATE_PREFIX = String.raw`(?:(?:liefst|ten laatste|uiterlijk)\s+)?(?:(?:voor|tegen|op)\s+)?`;

/** Herkent eenvoudige datumwoorden. Geeft de datum en het stuk tekst dat weg mag. */
export function findDate(line: string, ref: Date = today()): { date: ISODate; match: string } | null {
  const rules: { re: RegExp; resolve: (m: RegExpMatchArray) => Date | null }[] = [
    { re: new RegExp(`${DATE_PREFIX}volgende week`, "i"), resolve: () => nextWeekday(1, ref) },
    {
      re: new RegExp(`${DATE_PREFIX}(?:eind(?:e)? van )?deze week`, "i"),
      resolve: () => nextWeekday(5, addDays(ref, -1)),
    },
    { re: new RegExp(`${DATE_PREFIX}overmorgen`, "i"), resolve: () => addDays(ref, 2) },
    { re: new RegExp(`${DATE_PREFIX}morgen`, "i"), resolve: () => addDays(ref, 1) },
    {
      re: new RegExp(`${DATE_PREFIX}(${Object.keys(WEEKDAYS).join("|")})`, "i"),
      resolve: (m) => nextWeekday(WEEKDAYS[m[1].toLowerCase()], ref),
    },
    { re: new RegExp(`${DATE_PREFIX}(\\d{1,2}[/-]\\d{1,2})\\b`, "i"), resolve: (m) => parseDateInput(m[1], ref) },
  ];
  for (const { re, resolve } of rules) {
    const m = line.match(re);
    const d = m && resolve(m);
    if (m && d) return { date: toISO(d), match: m[0] };
  }
  return null;
}

/** Zoekt een voornaam uit de deelnemers als los woord in de regel. */
export function findOwner(line: string, people: Person[]): { person: Person; match: string } | null {
  for (const p of people) {
    const first = p.name.split(" ")[0];
    if (first.length < 2) continue;
    const m = line.match(new RegExp(`\\b${first}\\b`, "i"));
    if (m) return { person: p, match: m[0] };
  }
  return null;
}

function cleanup(line: string, remove: string[]): string {
  let s = line;
  for (const r of remove) s = s.replace(r, " ");
  s = s
    .replace(/->|→/g, " ")
    .replace(/\bwk\b/gi, "week")
    .replace(/\b(volgende keer\s+)?beslissen\b/gi, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[,;:]\s*[,;:]/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "");
  return upperFirst(s);
}

/** Zet tekst om in voorstellen: acties (met eigenaar en datum waar herkend) en agendapunten. */
export function extractProposals(text: string, people: Person[], ref: Date = today()): Proposal[] {
  return splitItems(text).map((line) => {
    const lower = line.toLowerCase();
    const known = KNOWN.find((k) => k.test(lower));
    if (/beslis/.test(lower)) {
      return {
        id: uid("v-"),
        kind: "agenda" as const,
        text: known?.title ?? cleanup(line, []),
        ownerId: null,
        date: null,
        checked: true,
      };
    }
    const owner = findOwner(line, people);
    const date = findDate(line, ref);
    const remove = [owner?.match, date?.match].filter((x): x is string => !!x);
    return {
      id: uid("v-"),
      kind: "action" as const,
      text: known?.title ?? (cleanup(line, remove) || line),
      ownerId: owner?.person.id ?? null,
      date: date?.date ?? null,
      checked: true,
    };
  });
}
