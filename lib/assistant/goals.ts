/**
 * De vrijblijvende doelvraag na een te vage zin op het vertelpad (SPEC-LAZY.md §4, Stap 1, C0j–C0m): vier
 * doelen die de agenda links meteen aanpassen. Regelgebaseerd, zoals de rest van de assistent.
 */
import type { Purpose } from "@/lib/agenda";
import type { GuestItem, GuestMeeting, GuestTopic } from "@/lib/assistant/types";
import type { Minutes } from "@/lib/time";
import { uid } from "@/lib/utils";

export type MeetingGoal = "follow-through" | "focus" | "status" | "decide";

/** De vier doelen, in deze volgorde onder het bericht. Eén lijst, zodat ze later per sector kunnen verschillen. */
export const MEETING_GOALS: { value: MeetingGoal; label: string }[] = [
  { value: "follow-through", label: "Afspraken worden echt uitgevoerd" },
  { value: "focus", label: "Korter en gerichter" },
  { value: "status", label: "Weten waar iedereen mee bezig is" },
  { value: "decide", label: "Niet steeds hetzelfde bespreken" },
];

export function goalLabel(goal: MeetingGoal): string {
  return MEETING_GOALS.find((g) => g.value === goal)?.label ?? goal;
}

/** Snelkeuzes bij "Hoeveel tijd hebben jullie meestal?" (C0k). */
export const GOAL_DURATIONS: { value: Minutes; label: string }[] = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 uur" },
  { value: 90, label: "1u30" },
];

/** "1 uur", "1u30", "45 min" */
export function durationLabel(minutes: Minutes): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} uur`;
  return `${h}u${String(m).padStart(2, "0")}`;
}

/** Vrije tekst koppelen aan het dichtstbijzijnde doel (mock: trefwoorden). */
const GOAL_WORDS: [MeetingGoal, RegExp][] = [
  [
    "follow-through",
    /\b(afspraken|afspraak|acties|opvolg\w*|uitgevoerd|uitvoeren|uitvoering|losse eindjes|niemand doet|gebeurt niets)\b/i,
  ],
  [
    "focus",
    /\b(korter|kort|sneller|gerichter|gericht|te lang|uitlopen|lo(?:opt|pen) (?:\w+ )?uit|tijd|efficiënt\w*|to the point)\b/i,
  ],
  ["status", /\b(mee bezig|waar iedereen|rondje|stand van zaken|status|updates?|overzicht|wie doet wat)\b/i],
  [
    "decide",
    /\b(hetzelfde|herhal\w*|terugkom\w*|komt terug|komen terug|steeds weer|beslis\w*|knoop|doorhakken|cirkel\w*|in rondjes)\b/i,
  ],
];

export function goalFromText(text: string): MeetingGoal | null {
  return GOAL_WORDS.find(([, re]) => re.test(text))?.[0] ?? null;
}

/** Punten waar een keuze in zit krijgen het doel Beslissen (C0m). */
const CHOICE = /\b(beslis\w*|knelpunt\w*|probleem|problemen|keuze\w*|kiezen|kies|of we|akkoord|goedkeur\w*)\b/i;
/** Wat vooral informatie is. */
const INFORM = /\b(planning|stand|update|info\w*|cijfers|orders?|kwaliteit|veiligheid|incidenten|mededeling\w*)\b/i;

export function guessPurpose(text: string): Purpose {
  if (CHOICE.test(text)) return "decide";
  if (INFORM.test(text)) return "inform";
  return "discuss";
}

export const ROUND_TITLE = "Rondje per persoon";
export const ROUND_SUBTITLE = "Elk kort: waar ben je mee bezig, en waar loop je vast?";
/** Elke deelnemer in het rondje. */
export const ROUND_MINUTES = 3;
export const DECIDE_RULE =
  "Een punt met **Beslissen** sluit je af met een beslissing of een actie. Wat beslist is, komt niet terug.";

/** Zonder thema's toont de agenda "Lopende zaken": voor een doel wordt dat een echt thema. */
export function withTopics(m: GuestMeeting): GuestMeeting {
  return m.topics.length ? m : { ...m, topics: [{ id: uid("t-"), text: "Lopende zaken", items: [] }] };
}

/** Plekken die een duur krijgen: elk agendapunt, of het thema zelf als het (nog) geen punten heeft. */
type Slot = { topic: GuestTopic; item: GuestItem | null };

function slots(m: GuestMeeting): Slot[] {
  return m.topics.flatMap((topic): Slot[] =>
    topic.items?.length ? topic.items.map((item) => ({ topic, item })) : [{ topic, item: null }],
  );
}

/** Verdeelt `total` over `n` plekken, in veelvouden van 5 waar het kan; de rest gaat naar de eerste. */
function split(total: Minutes, n: number): Minutes[] {
  if (n <= 0) return [];
  const step = total / n >= 5 ? 5 : 1;
  const base = Math.floor(total / n / step) * step;
  const out = Array<Minutes>(n).fill(base);
  let rest = total - base * n;
  for (let i = 0; rest > 0; i = (i + 1) % n) {
    const add = Math.min(step, rest);
    out[i] += add;
    rest -= add;
  }
  return out;
}

/** Schaalt de tijden proportioneel naar `total`; het verschil door afronden gaat naar de grootste. */
export function scale(values: Minutes[], total: Minutes): Minutes[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!sum) return split(total, values.length);
  const round = values.every((v) => !v || (v * total) / sum >= 5) ? 5 : 1;
  // Wat (nog) geen tijd heeft, blijft zonder tijd.
  const out = values.map((v) => (v ? Math.max(1, Math.round((v * total) / sum / round) * round) : 0));
  const diff = total - out.reduce((a, b) => a + b, 0);
  const at = out.indexOf(Math.max(...out));
  out[at] = Math.max(1, out[at] + diff);
  return out;
}

function setSlots(m: GuestMeeting, durations: Minutes[], purpose: boolean): GuestMeeting {
  const list = slots(m);
  const byTopic = new Map<string, { duration: Minutes | null; purposes?: Purpose[] }>();
  const byItem = new Map<string, { duration: Minutes | null; purposes?: Purpose[] }>();
  list.forEach((s, i) => {
    const text = s.item?.text ?? s.topic.text;
    const target = s.item ?? s.topic;
    const purposes = purpose && !target.purposes?.length ? [guessPurpose(text)] : undefined;
    const patch = { duration: durations[i] || null, ...(purposes ? { purposes } : {}) };
    if (s.item) byItem.set(s.item.id, patch);
    else byTopic.set(s.topic.id, patch);
  });
  return {
    ...m,
    topics: m.topics.map((t) => ({
      ...t,
      ...byTopic.get(t.id),
      items: t.items?.map((i) => ({ ...i, ...byItem.get(i.id) })),
    })),
  };
}

/** De tijd voor "Openstaande acties": een zesde van het overleg, minstens 5 min. */
function actionsShare(total: Minutes): Minutes {
  return Math.max(5, Math.round(total / 6 / 5) * 5);
}

/** C0k: elk blok en agendapunt krijgt een duur en een doel, verdeeld over de duur van het overleg. */
export function planDurations(m: GuestMeeting): GuestMeeting {
  const base = withTopics(m);
  const actions = actionsShare(base.duration);
  const n = slots(base).length;
  return { ...setSlots(base, split(base.duration - actions, n), true), actionsDuration: actions };
}

/** Een snelkeuze of getypte duur herverdeelt de tijden proportioneel. */
export function rescaleDurations(m: GuestMeeting, total: Minutes): GuestMeeting {
  const list = slots(m);
  const current = list.map((s) => (s.item ? s.item.duration : s.topic.duration) ?? 0);
  const withActions = !!m.actionsDuration;
  const scaled = scale(withActions ? [m.actionsDuration ?? 0, ...current] : current, total);
  const rest = withActions ? scaled.slice(1) : scaled;
  return {
    ...setSlots(m, rest, false),
    actionsDuration: withActions ? scaled[0] : m.actionsDuration,
    duration: total,
    durationProposed: false,
  };
}

/** Totale tijd van de agenda; null zolang er nergens een tijd staat. */
export function totalMinutes(m: GuestMeeting): Minutes | null {
  const list = slots(m).map((s) => (s.item ? s.item.duration : s.topic.duration) ?? 0);
  const sum = (m.actionsDuration ?? 0) + list.reduce((a, b) => a + b, 0);
  return sum > 0 ? sum : null;
}
