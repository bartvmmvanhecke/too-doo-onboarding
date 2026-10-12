/**
 * De gesimuleerde assistent van Variant A (SPEC-LAZY.md §4): regelgebaseerd en deterministisch.
 * `respond(state, input)` geeft de nieuwe state, de berichten van de assistent en de meetpunten terug.
 * Principe: vul alleen in wat de gebruiker zei; vraag wat ontbreekt; verzin niets.
 */
import { addPeople } from "@/lib/assistant/people";
import {
  ME,
  type AssistantEvent,
  type AssistantInput,
  type AssistantReply,
  type AssistantState,
  type CalendarField,
  type CalendarOption,
  type CalendarProvider,
  type CalendarResult,
  type GuestAction,
  type GuestDecision,
  type GuestMeeting,
  type Message,
  type Pending,
  type StartChoice,
} from "@/lib/assistant/types";
import {
  foundFields,
  looksLikeNotes,
  nameFromHeading,
  parseMeetingSentence,
  parseMeetingUpdate,
  parseNameReply,
  parseIntent,
  parseTopics,
  parseNames,
  parseRecurrence,
  parseTimeIn,
  parseWeekday,
  type ParsedMeeting,
} from "@/lib/assistant/parse";
import { mailOwners, spokenTime, weekdayName } from "@/lib/assistant/format";
import { formatShortDate, today } from "@/lib/date";
import { extractProposals, findDate, findOwner, splitItems } from "@/lib/extract";
import type { Recurrence } from "@/lib/meeting";
import { parseTime } from "@/lib/time";
import { lowerFirst, uid, upperFirst } from "@/lib/utils";

type Out = Omit<Message, "id">;

const say = (text: string, card?: Message["card"]): Out => ({ from: "assistant", text, card });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const QUESTIONS = {
  sentence: "Waarover gaat je volgende overleg? Eén zin is genoeg. Wie en wanneer mag erbij, hoeft niet.",
  whenWho: "**Wanneer gaat het door en wie zit erbij?**",
  empty: "Zeg het als ik iets kan invullen.",
  /** Bericht 2 op het vertelpad (Stap 1, C1): vervangt daar de eenmalige herinnering. */
  notesTell: "**Heb je open punten of notities van de vorige keer?** Dan maak ik er acties van.",
  close: "Oké, je werkt zelf verder. Je vindt me rechtsonder.",
  example: "Ik toon je een voorbeeldagenda. Je eigen overleg blijft bewaard.",
  name: "Hoe heet dit overleg? Bijvoorbeeld Productieoverleg.",
  day: "Wanneer gaat het door?",
  time: "Hoe laat begint het?",
  recurrence: "Hoe vaak komt het samen?",
  participants: "Wie zit er meestal bij? Voornamen volstaan.",
  summary: "Begrepen. Links staat een voorstel van agenda, met een plek voor openstaande acties bovenaan. Klopt dit?",
  /** De ene proactieve herinnering (C3), zodra naam, wanneer en deelnemers ingevuld zijn. */
  notesReminder: "**Heb je notities van de vorige keer?** Plak ze hier, dan staan de openstaande acties meteen klaar.",
  notes: "**Staat er nog iets open van de vorige keer?** Plak je notities, spreek het in, of typ het gewoon.",
  /** Na "Ik heb notities van de vorige keer" (C1c), met de dropzone eronder. */
  notesEntry: "Top. Sleep ze hierheen, spreek ze in of plak de tekst. Ik haal de acties en eigenaars eruit.",
  notesLater: "Sleep je notities hierheen of plak de tekst. Ik haal de acties en eigenaars eruit.",
  provider: "Outlook of Google?",
  paste: "Dit lijken notities van een vorig overleg. Zal ik er de openstaande acties en agendapunten uit halen?",
} as const;

export const RECURRENCE_CHIPS: { value: Recurrence; label: string }[] = [
  { value: "weekly", label: "Elke week" },
  { value: "biweekly", label: "Om de 2 weken" },
  { value: "monthly", label: "Maandelijks" },
  { value: "once", label: "Eenmalig" },
];

interface Draft {
  state: AssistantState;
  messages: Out[];
  flash: string[];
  events: AssistantEvent[];
  edit?: boolean;
  ui?: "close" | "example";
}

const draft = (state: AssistantState): Draft => ({ state, messages: [], flash: [], events: [] });

const done = (d: Draft): AssistantReply => d;

function setPending(d: Draft, pending: Pending) {
  d.state = { ...d.state, pending };
}

const samePending = (a: Pending, b: Pending) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Elke vraag van de assistent gaat hierlangs, zodat ze precies één keer verschijnt (SPEC-LAZY.md §4):
 * staat dezelfde vraag al open, dan wordt ze niet opnieuw gesteld en blijft de vorige gewoon staan.
 */
function ask(d: Draft, pending: Pending, text: string, card?: Message["card"]): boolean {
  if (samePending(d.state.pending, pending)) return false;
  setPending(d, pending);
  d.messages.push(say(text, card));
  return true;
}

function patchMeeting(d: Draft, patch: Partial<GuestMeeting>) {
  d.state = { ...d.state, meeting: { ...d.state.meeting, ...patch } };
}

/** Neemt enkel de gevonden velden over en markeert ze. */
function applyParsed(d: Draft, p: ParsedMeeting, opts: { topics: boolean }) {
  const m = d.state.meeting;
  const patch: Partial<GuestMeeting> = {};
  if (p.name) patch.name = p.name;
  if (p.recurrence) patch.recurrence = p.recurrence;
  if (p.weekday) patch.weekday = p.weekday;
  if (p.time !== null) patch.time = p.time;
  if (p.duration !== null) {
    patch.duration = p.duration;
    patch.durationProposed = false;
  }
  if (p.participants.length) patch.participants = addPeople(m.participants, p.participants);
  if (opts.topics && p.topics.length) {
    patch.topics = [...m.topics, ...p.topics.map((text) => ({ id: uid("t-"), text }))];
  }
  patchMeeting(d, patch);
  const flash = new Set(d.flash);
  if (p.name) flash.add("name");
  if (p.recurrence || p.weekday || p.time !== null || p.duration !== null) flash.add("when");
  if (p.participants.length) flash.add("participants");
  if (opts.topics && p.topics.length) flash.add("topics");
  d.flash = [...flash];
}

/** De eerstvolgende vraag over het overleg, of het voorstel (stap 1) / het klaarzetten (na de acties). */
function askNext(d: Draft, lead?: string) {
  const m = d.state.meeting;
  const question = (pending: Pending, text: string) => void ask(d, pending, lead ? `${lead} ${text}` : text);
  if (!m.name) return question({ kind: "name" }, QUESTIONS.name);
  // Vertelpad (Stap 1): wanneer en wie worden in de onboarding niet gevraagd; de datumregel heeft de links.
  if (isTellPath(d.state)) return d.state.step === 2 ? ready(d) : tellReady(d);
  if (!m.weekday) return question({ kind: "day" }, QUESTIONS.day);
  if (m.time === null) return question({ kind: "time" }, QUESTIONS.time);
  if (!m.recurrence) return question({ kind: "recurrence" }, QUESTIONS.recurrence);
  if (m.participants.length === 0 && !m.participantsSkipped)
    return question({ kind: "participants" }, QUESTIONS.participants);
  // Via notities kwamen de acties eerst: dan staat het overleg meteen klaar.
  if (d.state.step === 2) return ready(d);
  ask(d, { kind: "confirm-meeting" }, QUESTIONS.summary, "summary");
}

/**
 * Stap 2 · openstaande acties. De herinnering "Heb je notities van de vorige keer?" (C3) komt één keer,
 * zodra naam, wanneer en deelnemers ingevuld zijn en er nog geen acties zijn; daarna nooit meer.
 */
/** Vertelpad (of een lege vergadering): de gebruiker beschreef het overleg zelf. */
function isTellPath(s: AssistantState): boolean {
  return s.entry === "meeting" || s.entry === "empty";
}

const COUNT = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien"];

/**
 * Bericht 1 na het vertelpad (Stap 1, C1): "Je productieoverleg staat klaar. Ik zette drie thema's klaar.
 * Klopt dit ongeveer?" Zonder herkende onderwerpen de ene verduidelijkende vraag.
 */
function tellReady(d: Draft) {
  const m = d.state.meeting;
  const name = lowerFirst(m.name ?? "overleg");
  const n = m.topics.length;
  if (n === 0)
    return void ask(
      d,
      { kind: "topics" },
      `Je ${name} staat klaar als concept. **Waar willen jullie in die meeting vooral vooruitgang op boeken?**`,
    );
  const themes = `${COUNT[n] ?? n} ${n === 1 ? "thema" : "thema's"}`;
  ask(
    d,
    { kind: "confirm-meeting" },
    `Je ${name} staat klaar. Ik zette ${themes} klaar. **Klopt dit ongeveer?** Vul er gerust agendapunten onder aan.`,
  );
}

function askNotes(d: Draft) {
  const m = d.state.meeting;
  // Vertelpad: bericht 2 vervangt de eenmalige herinnering.
  if (isTellPath(d.state) && !d.state.actions.length) {
    d.state = { ...d.state, step: 2, notesReminderShown: true };
    return void ask(d, { kind: "notes" }, QUESTIONS.notesTell);
  }
  const remind =
    !d.state.notesReminderShown && !!m.name && !!m.weekday && m.participants.length > 0 && !d.state.actions.length;
  d.state = { ...d.state, step: 2, notesReminderShown: d.state.notesReminderShown || remind };
  ask(d, { kind: "notes" }, remind ? QUESTIONS.notesReminder : QUESTIONS.notes);
}

/** "Wie gaat leverancier staal opnieuw bellen?" */
export function ownerQuestion(text: string): string {
  const words = text.trim().split(/\s+/);
  const last = words[words.length - 1]?.toLowerCase() ?? "";
  return /en$/.test(last) && words.length > 1
    ? `Wie gaat ${lowerFirst(text.trim())}?`
    : `Wie neemt "${text.trim()}" op?`;
}

const hasOwner = (a: GuestAction) => !!a.ownerId;

function nextOwnerQuestion(d: Draft, afterAnswer: boolean) {
  const open = d.state.actions.find((a) => a.confirmed && !a.ownerId && !a.ownerLater);
  if (open) return void ask(d, { kind: "owner", actionId: open.id }, ownerQuestion(open.text));
  setPending(d, { kind: "place-actions" });
  if (afterAnswer) d.messages.push(say("Dat was alles. Zet ze op de agenda wanneer je wilt."));
}

function trackFirstOwner(d: Draft, before: GuestAction[]) {
  if (!before.some(hasOwner) && d.state.actions.some(hasOwner)) d.events.push(["first_action_with_owner", {}]);
}

function extract(d: Draft, text: string, ref: Date) {
  const before = d.state.actions;
  const people = d.state.meeting.participants;
  const proposals = extractProposals(text, people, ref);
  const actions: GuestAction[] = proposals
    .filter((p) => p.kind === "action")
    .map((p) => ({ id: p.id, text: p.text, ownerId: p.ownerId, deadline: p.date, confirmed: true, ownerLater: false }));
  const decisions: GuestDecision[] = proposals
    .filter((p) => p.kind === "agenda")
    .map((p) => ({ id: p.id, text: p.text, confirmed: true }));
  d.state = { ...d.state, actions: [...before, ...actions], decisions: [...d.state.decisions, ...decisions] };
  // Via notities: de naam van het overleg uit de kopregel, als die herkenbaar is ("Productie 6/10").
  if (!d.state.meeting.name) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const heading = lines[0]?.trim() ?? "";
    const name = lines.length > 1 && !splitItems(text).includes(heading) ? nameFromHeading(heading) : null;
    if (name) {
      patchMeeting(d, { name });
      d.flash = [...d.flash, "name"];
    }
  }
  const n = actions.length;
  const m = decisions.length;
  d.events.push([
    "actions_extracted",
    { aantal: n, beslissingen: m, zonderEigenaar: actions.filter((a) => !a.ownerId).length },
  ]);
  trackFirstOwner(d, before);
  if (n + m === 0) {
    setPending(d, { kind: "notes" });
    d.messages.push(
      say("Ik vond geen acties in je tekst. Typ ze gewoon, één per regel, of klik op ‘Ik heb niets openstaan’."),
    );
    return;
  }
  d.flash = [...d.flash, "actions"];
  const found =
    m > 0
      ? `**${plural(n, "actie", "acties")}** en **${plural(m, "beslissing", "beslissingen")}**`
      : `**${plural(n, "actie", "acties")}**`;
  d.messages.push(say(`Ik vond ${found}. Ze staan links op de agenda; vink uit wat niet klopt.`));
  nextOwnerQuestion(d, false);
}

/** Antwoord op "Wie …?": een deelnemer, een nieuwe voornaam, "ik", "later", en eventueel een datum. */
function answerOwner(d: Draft, actionId: string, text: string, ref: Date) {
  const before = d.state.actions;
  const lower = text.trim().toLowerCase();
  const date = findDate(text, ref);
  let ownerId: string | null = null;
  let later = false;
  if (/^(ik|ikzelf|ik zelf|mezelf|mij)\b/.test(lower)) ownerId = ME;
  else if (/^(later|weet (ik )?niet|niemand)\b/.test(lower)) later = true;
  else {
    const found = findOwner(text, d.state.meeting.participants);
    if (found) ownerId = found.person.id;
    else {
      const first = text.trim().match(/^([A-ZÀ-Ý][a-zà-ÿ'-]+)\b/)?.[1];
      if (first && !["Later", "Geen", "Niemand", "Tegen", "Voor", "Morgen"].includes(first)) {
        const participants = addPeople(d.state.meeting.participants, [first]);
        patchMeeting(d, { participants });
        ownerId = participants.find((p) => p.name === first)?.id ?? null;
        d.flash = [...d.flash, "participants"];
      }
    }
  }
  if (!ownerId && !later && !date) {
    d.messages.push(say("Kies hieronder wie het doet, of typ een voornaam."));
    return;
  }
  d.state = {
    ...d.state,
    actions: d.state.actions.map((a) =>
      a.id === actionId
        ? {
            ...a,
            ownerId: ownerId ?? a.ownerId,
            ownerLater: later || (!ownerId && !a.ownerId),
            deadline: date?.date ?? a.deadline,
          }
        : a,
    ),
  };
  d.flash = [...d.flash, "actions"];
  trackFirstOwner(d, before);
  const name = ownerId === ME ? "jij" : (d.state.meeting.participants.find((p) => p.id === ownerId)?.name ?? null);
  if (name)
    d.messages.push(say(date ? `Genoteerd: ${name}, tegen ${formatShortDate(date.date)}.` : `Genoteerd: ${name}.`));
  else if (later) d.messages.push(say("Goed, dat beslis je later."));
  nextOwnerQuestion(d, false);
}

function chooseOwner(d: Draft, actionId: string, value: string) {
  const before = d.state.actions;
  const later = value === "later";
  d.state = {
    ...d.state,
    actions: d.state.actions.map((a) =>
      a.id === actionId ? { ...a, ownerId: later ? null : value, ownerLater: later } : a,
    ),
  };
  d.flash = [...d.flash, "actions"];
  trackFirstOwner(d, before);
  nextOwnerQuestion(d, false);
}

/** "Zet ze op de agenda" (of "Ik heb niets openstaan"): wat uitgevinkt is, valt weg. */
function placeActions(d: Draft) {
  d.state = {
    ...d.state,
    actions: d.state.actions.filter((a) => a.confirmed && a.text.trim()),
    decisions: d.state.decisions.filter((x) => x.confirmed && x.text.trim()),
  };
  // Notities nadat het overleg al klaarstond: de acties komen erbij, het overleg blijft klaar.
  if (d.state.step === 3 || d.state.step === "done") {
    setPending(d, { kind: "idle" });
    return void d.messages.push(say("Ze staan bovenaan bij de openstaande acties."));
  }
  askNext(d);
}

/** Stap 3 · Overleg klaar (C4). */
function ready(d: Draft) {
  const s = d.state;
  d.state = { ...s, step: 3, meeting: { ...s.meeting, proposed: false } };
  setPending(d, { kind: "proposal" });
  const m = d.state.meeting;
  const day = weekdayName(m);
  const n = s.actions.length;
  d.events.push(["meeting_ready", { acties: n, beslissingen: s.decisions.length }]);
  const when = [day ? upperFirst(day) : null, m.time !== null ? `om ${spokenTime(m.time)}` : null]
    .filter(Boolean)
    .join(" ");
  const decision =
    s.decisions.length === 1
      ? `, en ${lowerFirst(s.decisions[0].text)} staat klaar om te beslissen`
      : s.decisions.length > 1
        ? `, en ${s.decisions.length} beslissingen staan klaar`
        : "";
  if (n > 0) {
    d.messages.push(
      say(
        `Klaar. ${when} ${n === 1 ? "staat je actie" : `staan je ${n} acties`} bovenaan${decision}.`.replace(
          /\s+/g,
          " ",
        ),
      ),
    );
  } else {
    d.messages.push(say(`Klaar. Je ${lowerFirst(m.name ?? "overleg")} staat klaar${day ? ` voor ${day}` : ""}.`));
  }
  const owners = mailOwners(s.actions, m.participants);
  if (owners.length) {
    const names = owners.map((p) => p.name);
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
    d.messages.push(
      say(
        `**Zal ik ${list} ${owners.length === 1 ? "zijn of haar" : "hun"} actie nu al mailen?** Met een herinnering voor de deadline. Zo hoef jij ${day ?? "volgende keer"} niet na te vragen wie wat zou doen.`,
        "mail",
      ),
    );
  } else {
    d.messages.push(say("Bewaar je overleg, dan kan je je deelnemers uitnodigen. Ze hebben geen account nodig."));
  }
}

/** Notities verwerken (geplakt of uit een bestand): stap 2, met de bestaande extractie. */
function processNotes(d: Draft, text: string, ref: Date) {
  if (d.state.step === 1) d.state = { ...d.state, step: 2, entry: d.state.entry ?? "notes" };
  extract(d, text, ref);
}

/**
 * Vrije tekst. Eerst de intentie (SPEC-LAZY.md §4, Ingangen blijven bereikbaar): een opdracht als
 * "koppel mijn agenda" voert die actie uit; een lange geplakte tekst die niet het antwoord is op de vraag
 * om notities, lijkt op notities (C2b). `plain`: "Nee, gewoon bericht", dus zonder die herkenning.
 */
function onText(d: Draft, text: string, ref: Date, plain = false): void {
  const pending = d.state.pending;
  if (pending.kind === "paste") {
    // Iets anders getypt: de geplakte tekst blijft liggen, verder met wat openstond.
    setPending(d, pending.resume);
    return onText(d, text, ref, plain);
  }
  if (!plain) {
    const intent = parseIntent(text);
    if (intent === "close" || intent === "example") {
      d.messages.push(say(intent === "close" ? QUESTIONS.close : QUESTIONS.example));
      d.ui = intent;
      return;
    }
    if (intent) return onEntry(d, intent);
    const asksNotes = pending.kind === "notes" || pending.kind === "place-actions";
    if (!asksNotes && looksLikeNotes(text))
      return void ask(d, { kind: "paste", text, resume: pending }, QUESTIONS.paste);
  }
  switch (pending.kind) {
    case "entry":
    case "sentence": {
      // Vrije tekst bij de start = "Mijn volgende overleg".
      d.state = { ...d.state, entry: d.state.entry ?? "meeting" };
      const p = parseMeetingSentence(text);
      applyParsed(d, p, { topics: true });
      d.events.push(["meeting_parsed", { velden: foundFields(p) }]);
      // De naam wordt nooit gevraagd: uit de zin, of anders een generieke naam (aanpasbaar in de titel).
      // "een meeting met mijn team": "Meeting" is geen naam.
      if (/^(een |de )?(meeting|overleg|vergadering)$/i.test(d.state.meeting.name ?? ""))
        patchMeeting(d, { name: null });
      if (!d.state.meeting.name) {
        patchMeeting(d, { name: /\bteam/i.test(text) ? "Teamoverleg" : "Overleg" });
        d.flash = [...new Set([...d.flash, "name"])];
      }
      return tellReady(d);
    }
    case "topics": {
      const topics = parseTopics(text);
      if (!topics.length)
        return void d.messages.push(say("Noem gewoon een paar onderwerpen, gescheiden door komma's."));
      patchMeeting(d, { topics: [...d.state.meeting.topics, ...topics.map((t) => ({ id: uid("t-"), text: t }))] });
      d.flash = ["topics"];
      return askNotes(d);
    }
    case "when-who": {
      const p = parseMeetingUpdate(text);
      if (foundFields(p).length === 0)
        return void d.messages.push(say("Typ het gewoon, bijvoorbeeld ‘elke maandag om 8u met Jan, Sofie en Karim’."));
      applyParsed(d, p, { topics: false });
      return askNext(d);
    }
    case "name": {
      const name = parseNameReply(text);
      if (!name) return void d.messages.push(say("Typ alleen de naam, bijvoorbeeld Productieoverleg."));
      patchMeeting(d, { name });
      d.flash = ["name"];
      return askNext(d);
    }
    case "day": {
      const weekday = parseWeekday(text);
      if (!weekday) return void d.messages.push(say("Kies hieronder een dag, of typ bijvoorbeeld ‘dinsdag’."));
      const time = parseTimeIn(text);
      patchMeeting(d, { weekday, ...(time !== null ? { time } : {}) });
      const recurrence = parseRecurrence(text);
      if (recurrence) patchMeeting(d, { recurrence });
      d.flash = ["when"];
      return askNext(d);
    }
    case "time": {
      const time = parseTimeIn(text);
      if (time === null) return void d.messages.push(say("Typ een uur, bijvoorbeeld 9u of 14:30."));
      patchMeeting(d, { time });
      d.flash = ["when"];
      return askNext(d);
    }
    case "recurrence": {
      const recurrence = parseRecurrence(text);
      if (!recurrence)
        return void d.messages.push(say("Kies hieronder hoe vaak: elke week, om de 2 weken, maandelijks of eenmalig."));
      patchMeeting(d, { recurrence });
      d.flash = ["when"];
      return askNext(d);
    }
    case "participants": {
      const names = parseNames(text.replace(/^met\s+/i, ""));
      if (!names.length) return void d.messages.push(say("Typ voornamen, bijvoorbeeld: Jan, Sofie en Karim."));
      patchMeeting(d, { participants: addPeople(d.state.meeting.participants, names) });
      d.flash = ["participants"];
      return askNext(d);
    }
    case "confirm-meeting": {
      const p = parseMeetingUpdate(text);
      if (foundFields(p).length === 0) {
        // Vertelpad: een vrij antwoord telt als bevestiging.
        if (isTellPath(d.state)) {
          patchMeeting(d, { proposed: false });
          return askNotes(d);
        }
        return void d.messages.push(say("Dat begreep ik niet helemaal. Pas het links aan, of klik op Klopt."));
      }
      applyParsed(d, p, { topics: true });
      setPending(d, { kind: "confirm-meeting" });
      return void d.messages.push(say("Aangepast. Hieronder staat de nieuwe versie.", "summary"));
    }
    case "notes":
    case "place-actions":
      return processNotes(d, text, ref);
    case "owner":
      return answerOwner(d, pending.actionId, text, ref);
    case "provider":
    case "pick-meeting":
      // Toch liever vertellen: de zin wordt het overleg.
      setPending(d, pending.resume);
      return onText(d, text, ref, true);
    case "proposal":
    case "idle":
      d.messages.push(
        say("Dat kan ik in de proefomgeving nog niet. Pas je overleg links aan, of bewaar het om je acties te mailen."),
      );
  }
}

function onChip(d: Draft, value: string, ref: Date) {
  const pending = d.state.pending;
  switch (pending.kind) {
    case "day":
      patchMeeting(d, { weekday: Number(value) });
      d.flash = ["when"];
      return askNext(d);
    case "time": {
      const time = parseTime(value);
      if (time === null) return;
      patchMeeting(d, { time });
      d.flash = ["when"];
      return askNext(d);
    }
    case "recurrence":
      patchMeeting(d, { recurrence: value as Recurrence });
      d.flash = ["when"];
      return askNext(d);
    case "participants":
      patchMeeting(d, { participantsSkipped: true });
      return askNext(d);
    case "owner":
      return chooseOwner(d, pending.actionId, value);
    default:
      return onText(d, value, ref);
  }
}

const PROVIDER_LABEL = { outlook: "Outlook", google: "Google" } as const;
const CALM = "Geen probleem: vertel het me of gebruik notities.";

/** Wat openstond vóór het agendapad; daar gaat de assistent daarna mee verder. */
function resumeOf(p: Pending): Pending {
  return p.kind === "provider" || p.kind === "pick-meeting" || p.kind === "paste" ? p.resume : p;
}

/** Een startkeuze (C1), het "+"-menu, of een zin als "ik heb notities". De details komen pas nu. */
function onEntry(d: Draft, entry: StartChoice) {
  const p = d.state.pending;
  const atStart = p.kind === "entry";
  switch (entry) {
    case "calendar":
      // Staat de vraag al open, dan enkel een korte wegwijzer, geen tweede keer dezelfde vraag.
      if (!ask(d, { kind: "provider", fields: null, resume: resumeOf(p) }, QUESTIONS.provider))
        d.messages.push(say("Kies hieronder Outlook of Google."));
      return;
    case "notes":
      if (atStart) d.state = { ...d.state, entry: "notes" };
      if (d.state.step === 1) d.state = { ...d.state, step: 2 };
      if (!ask(d, { kind: "notes" }, atStart ? QUESTIONS.notesEntry : QUESTIONS.notesLater, "dropzone"))
        d.messages.push(say("Plak ze hieronder in het chatveld, of sleep een bestand hierheen."));
      return;
    case "meeting":
      d.state = { ...d.state, entry: "meeting" };
      return void ask(d, { kind: "sentence" }, QUESTIONS.sentence);
  }
}

/** "Uit agenda halen" / "Deelnemers uit agenda": het agendapad, maar enkel voor dat veld. */
function onCalendarField(d: Draft, fields: CalendarField[]) {
  const p = d.state.pending;
  // De vraag "Outlook of Google?" staat al open: ze komt niet nog eens, enkel de velden komen erbij.
  if (p.kind === "provider") {
    if (p.fields) setPending(d, { ...p, fields: [...new Set([...p.fields, ...fields])] });
    return void d.messages.push(say("Kies hieronder Outlook of Google."));
  }
  ask(d, { kind: "provider", fields, resume: resumeOf(p) }, QUESTIONS.provider);
}

/** Na koppelen: vaste overleggen kiezen (C1b), of een rustige melding en de andere keuzes opnieuw. */
function onCalendar(d: Draft, provider: CalendarProvider, result: CalendarResult) {
  const p = d.state.pending;
  const fields = p.kind === "provider" ? p.fields : null;
  const resume = resumeOf(p);
  const pick = (text: string, options: CalendarOption[]) => {
    if (!fields) d.state = { ...d.state, entry: d.state.entry ?? "calendar" };
    setPending(d, { kind: "pick-meeting", provider, options, fields, resume });
    d.messages.push(say(text));
  };
  switch (result.kind) {
    case "series":
      return pick(
        `Ik vond **${plural(result.options.length, "vast overleg", "vaste overleggen")}**. Welk wil je ${fields ? "gebruiken" : "eerst opvolgen"}?`,
        result.options,
      );
    case "none":
      return pick(
        result.options.length
          ? "Ik vond geen vaste overleggen in je agenda. Wel deze losse afspraken in de komende 2 weken; kies er een, of vertel het me."
          : "Ik vond geen vaste overleggen in je agenda. Vertel het me gewoon.",
        result.options,
      );
  }
  // Mislukt: rustige melding. Bij de start komen de twee andere keuzes terug als tekstregels.
  setPending(d, resume.kind === "entry" ? { kind: "entry", choices: ["notes", "meeting"] } : resume);
  const reason =
    result.kind === "admin"
      ? "Je bedrijf moet dit eerst goedkeuren."
      : result.kind === "cancelled"
        ? "Het koppelen is geannuleerd."
        : "Inloggen met Microsoft lukt niet bij je bedrijf.";
  d.messages.push(say(`${reason} ${CALM}`));
}

/**
 * "Dit overleg opvolgen": het overleg uit de agenda komt als voorstel in het hoofdvlak, daarna de acties.
 * Via de links in de datumregel worden enkel die velden ingevuld en gaat de assistent verder waar hij was.
 */
function pickMeeting(d: Draft, id: string) {
  const p = d.state.pending;
  if (p.kind !== "pick-meeting") return;
  const o = p.options.find((x) => x.id === id);
  if (!o) return;
  const from = PROVIDER_LABEL[p.provider];
  if (p.fields) {
    const when = p.fields.includes("when");
    const people = p.fields.includes("participants");
    patchMeeting(d, {
      ...(when
        ? { recurrence: o.recurrence, weekday: o.weekday, time: o.time, duration: o.duration, durationProposed: false }
        : {}),
      ...(people ? { participants: [...d.state.meeting.participants, ...newPeople(d, o)] } : {}),
    });
    d.flash = [...(when ? ["when"] : []), ...(people ? ["participants"] : [])];
    const what = when && people ? "dag, uur en deelnemers" : when ? "dag en uur" : "de deelnemers";
    d.messages.push(say(`Ik nam ${what} over uit je ${lowerFirst(o.name)} in ${from}.`));
    setPending(d, p.resume);
    if (d.state.step === 1) askNext(d);
    return;
  }
  patchMeeting(d, {
    name: o.name,
    recurrence: o.recurrence,
    weekday: o.weekday,
    time: o.time,
    duration: o.duration,
    durationProposed: false,
    participants: o.participants,
    topics: o.topics.map((text) => ({ id: uid("t-"), text })),
    proposed: true,
    source: p.provider,
  });
  d.flash = ["name", "when", "participants", "topics"];
  d.events.push(["meeting_parsed", { bron: "agenda", velden: ["name", "weekday", "time", "participants"] }]);
  d.messages.push(say(`Links staat je ${lowerFirst(o.name)} uit ${from}, als voorstel.`));
  if (d.state.step === 1) return askNotes(d);
  // Al acties (via notities of na stap 1): verder waar de assistent was.
  setPending(d, p.resume);
  if (d.state.step === 2 && p.resume.kind !== "owner" && p.resume.kind !== "place-actions") askNext(d);
}

/** Deelnemers uit de agenda die nog niet in het overleg staan. */
function newPeople(d: Draft, o: { participants: GuestMeeting["participants"] }) {
  const have = new Set(d.state.meeting.participants.map((x) => x.id));
  return o.participants.filter((x) => !have.has(x.id));
}

/** Notities uit een bestand: toon welk bestand, daarna de bestaande extractie. */
function onNotesFile(
  d: Draft,
  file: { name: string; text: string; sample: boolean; image: boolean; audio?: boolean },
  ref: Date,
) {
  // Een bestand beantwoordt ook een open vraag "Outlook of Google?" of "Dit lijken notities…".
  setPending(d, resumeOf(d.state.pending));
  if (d.state.step === 1) d.state = { ...d.state, entry: d.state.entry ?? "notes", step: 2 };
  const note = !file.sample
    ? ""
    : file.audio
      ? " Een opname echt uitschrijven kan het prototype nog niet; ik gebruik de voorbeeldnotities."
      : file.image
        ? " Tekst uit een foto lezen kan het prototype nog niet; ik gebruik de voorbeeldnotities."
        : " De tekst kon ik er niet uit halen; ik gebruik de voorbeeldnotities.";
  d.messages.push(say(`Ik las **${file.name}**.${note}`));
  extract(d, file.text, ref);
}

/** Een leeg overleg: niets gezegd, duur 60 min als voorstel. */
export function emptyMeeting(): GuestMeeting {
  return {
    name: null,
    recurrence: null,
    weekday: null,
    time: null,
    duration: 60,
    durationProposed: true,
    participants: [],
    participantsSkipped: false,
    topics: [],
    proposed: true,
    source: null,
  };
}

export function respond(state: AssistantState, input: AssistantInput, ref: Date = today()): AssistantReply {
  const d = draft(state);
  switch (input.type) {
    case "calendar":
      onCalendar(d, input.provider, input.result);
      break;
    case "pick-meeting":
      pickMeeting(d, input.id);
      break;
    case "notes-file":
      onNotesFile(d, input, ref);
      break;
    case "entry":
      onEntry(d, input.entry);
      break;
    case "calendar-field":
      onCalendarField(d, input.fields);
      break;
    case "start-empty":
      // C1d: de standaardagenda, titel in bewerkmodus; geen herinnering over notities op dit pad.
      d.state = { ...d.state, entry: "empty", notesReminderShown: true };
      patchMeeting(d, { name: "Nieuwe vergadering" });
      setPending(d, { kind: "sentence" });
      d.messages.push(say(QUESTIONS.empty));
      d.edit = true;
      break;
    case "paste": {
      const p = d.state.pending;
      if (p.kind !== "paste") break;
      setPending(d, p.resume);
      if (input.process) processNotes(d, p.text, ref);
      else onText(d, p.text, ref, true);
      break;
    }
    case "text":
      if (input.text.trim()) onText(d, input.text.trim(), ref);
      break;
    case "chip":
      onChip(d, input.value, ref);
      break;
    case "confirm-meeting":
      patchMeeting(d, { proposed: false });
      d.events.push(["meeting_confirmed", {}]);
      askNotes(d);
      break;
    case "adjust":
      d.edit = true;
      // Vertelpad: de agenda gaat in bewerkmodus en de assistent gaat toch door naar bericht 2.
      if (isTellPath(d.state)) {
        patchMeeting(d, { proposed: false });
        askNotes(d);
        break;
      }
      d.messages.push(say("Klik links op wat niet klopt en pas het aan. Daarna kan je op Klopt klikken."));
      break;
    case "skip-topics":
      if (d.state.pending.kind === "topics") askNotes(d);
      break;
    case "edited": {
      const k = d.state.pending.kind;
      // Het voorstel staat al open: de kaart toont de aanpassing, er komt geen nieuwe vraag.
      if (k === "confirm-meeting") break;
      if (["entry", "sentence", "when-who", "name", "day", "time", "recurrence", "participants"].includes(k)) {
        if (k === "entry") d.state = { ...d.state, entry: "meeting" };
        askNext(d);
      }
      break;
    }
    case "no-actions":
      d.state = { ...d.state, actions: [], decisions: [] };
      placeActions(d);
      break;
    case "place-actions":
      placeActions(d);
      break;
    case "dismiss-proposal":
      setPending(d, { kind: "idle" });
      d.messages.push(say("Prima. Kijk gerust rond. Bewaren kan wanneer je wilt, met de knop links."));
      break;
    case "another-meeting": {
      const s = d.state;
      d.state = {
        ...s,
        others: [...s.others, { meeting: s.meeting, actions: s.actions, decisions: s.decisions }],
        meeting: emptyMeeting(),
        actions: [],
        decisions: [],
        step: 1,
        entry: "meeting",
      };
      setPending(d, { kind: "sentence" });
      d.messages.push(say(`Goed, je ${lowerFirst(s.meeting.name ?? "overleg")} blijft staan. ${QUESTIONS.sentence}`));
      break;
    }
  }
  return done(d);
}
