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
  type CalendarProvider,
  type CalendarResult,
  type GuestAction,
  type GuestDecision,
  type GuestMeeting,
  type Message,
  type Pending,
} from "@/lib/assistant/types";
import {
  foundFields,
  nameFromHeading,
  parseMeetingSentence,
  parseMeetingUpdate,
  parseNameReply,
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
  sentence: "Waarover gaat je volgende overleg? Eén zin is genoeg.",
  name: "Hoe heet dit overleg? Bijvoorbeeld Productieoverleg.",
  day: "Wanneer gaat het door?",
  time: "Hoe laat begint het?",
  recurrence: "Hoe vaak komt het samen?",
  participants: "Wie zit er meestal bij? Voornamen volstaan.",
  summary: "Begrepen. Links staat een voorstel van agenda, met een plek voor openstaande acties bovenaan. Klopt dit?",
  notes:
    "**Wat werd er vorige keer afgesproken dat nog niet af is?** Plak je notities of een mail, spreek het in, of typ het gewoon.",
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
}

const draft = (state: AssistantState): Draft => ({ state, messages: [], flash: [], events: [] });

const done = (d: Draft): AssistantReply => d;

function setPending(d: Draft, pending: Pending) {
  d.state = { ...d.state, pending };
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
  // De open vraag wordt nooit opnieuw gesteld: staat ze al open, dan verandert er niets.
  const ask = (pending: Pending, question: string) => {
    if (d.state.pending.kind === pending.kind) return;
    setPending(d, pending);
    d.messages.push(say(lead ? `${lead} ${question}` : question));
  };
  if (!m.name) return ask({ kind: "name" }, QUESTIONS.name);
  if (!m.weekday) return ask({ kind: "day" }, QUESTIONS.day);
  if (m.time === null) return ask({ kind: "time" }, QUESTIONS.time);
  if (!m.recurrence) return ask({ kind: "recurrence" }, QUESTIONS.recurrence);
  if (m.participants.length === 0 && !m.participantsSkipped)
    return ask({ kind: "participants" }, QUESTIONS.participants);
  // Via notities kwamen de acties eerst: dan staat het overleg meteen klaar.
  if (d.state.step === 2) return ready(d);
  if (d.state.pending.kind === "confirm-meeting") return;
  setPending(d, { kind: "confirm-meeting" });
  d.messages.push(say(QUESTIONS.summary, "summary"));
}

function askNotes(d: Draft) {
  d.state = { ...d.state, step: 2 };
  setPending(d, { kind: "notes" });
  d.messages.push(say(QUESTIONS.notes));
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
  if (open) {
    const p = d.state.pending;
    if (p.kind === "owner" && p.actionId === open.id) return;
    setPending(d, { kind: "owner", actionId: open.id });
    d.messages.push(say(ownerQuestion(open.text)));
    return;
  }
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

function onText(d: Draft, text: string, ref: Date): void {
  const pending = d.state.pending;
  switch (pending.kind) {
    case "entry":
    case "sentence": {
      // Vrije tekst bij de start = "Mijn volgende overleg".
      d.state = { ...d.state, entry: d.state.entry ?? "meeting" };
      const p = parseMeetingSentence(text);
      applyParsed(d, p, { topics: true });
      d.events.push(["meeting_parsed", { velden: foundFields(p) }]);
      const m = d.state.meeting;
      const complete = m.name && m.weekday && m.time !== null && m.recurrence && m.participants.length > 0;
      return askNext(d, complete ? undefined : "Begrepen. Links staat al een voorstel van agenda.");
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
        return void d.messages.push(say("Dat begreep ik niet helemaal. Pas het links aan, of klik op Klopt."));
      }
      applyParsed(d, p, { topics: true });
      setPending(d, { kind: "confirm-meeting" });
      return void d.messages.push(say("Aangepast. Hieronder staat de nieuwe versie.", "summary"));
    }
    case "notes":
    case "place-actions":
      return extract(d, text, ref);
    case "owner":
      return answerOwner(d, pending.actionId, text, ref);
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

/** "Uit mijn agenda": vaste overleggen kiezen (C1b), of een rustige melding; de andere ingangen blijven. */
function onCalendar(d: Draft, provider: CalendarProvider, result: CalendarResult) {
  switch (result.kind) {
    case "series":
      d.state = { ...d.state, entry: "calendar" };
      setPending(d, { kind: "pick-meeting", provider, options: result.options });
      d.messages.push(
        say(
          `Ik vond **${plural(result.options.length, "vast overleg", "vaste overleggen")}**. Welk wil je eerst opvolgen?`,
        ),
      );
      return;
    case "none":
      d.state = { ...d.state, entry: "calendar" };
      setPending(d, { kind: "pick-meeting", provider, options: result.options });
      d.messages.push(
        say(
          result.options.length
            ? "Ik vond geen vaste overleggen in je agenda. Wel deze losse afspraken in de komende 2 weken; kies er een, of vertel het me."
            : "Ik vond geen vaste overleggen in je agenda. Vertel het me gewoon.",
        ),
      );
      return;
    case "admin":
      return void d.messages.push(say(`Je bedrijf moet dit eerst goedkeuren. ${CALM}`));
    case "cancelled":
      return void d.messages.push(say(`Het koppelen is geannuleerd. ${CALM}`));
    case "blocked":
      return void d.messages.push(say(`Inloggen met Microsoft lukt niet bij je bedrijf. ${CALM}`));
  }
}

/** "Dit overleg opvolgen": het hoofdvlak krijgt het overleg uit de agenda als voorstel, daarna de acties. */
function pickMeeting(d: Draft, id: string) {
  const p = d.state.pending;
  if (p.kind !== "pick-meeting") return;
  const o = p.options.find((x) => x.id === id);
  if (!o) return;
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
  d.messages.push(say(`Links staat je ${lowerFirst(o.name)} uit ${PROVIDER_LABEL[p.provider]}, als voorstel.`));
  askNotes(d);
}

/** Notities uit een bestand: toon welk bestand, daarna de bestaande extractie. */
function onNotesFile(d: Draft, file: { name: string; text: string; sample: boolean; image: boolean }, ref: Date) {
  if (d.state.step === 3 || d.state.step === "done") {
    return void d.messages.push(say("Je overleg staat al klaar. Voeg acties toe met ‘+ Actie’."));
  }
  if (d.state.step === 1) d.state = { ...d.state, entry: "notes", step: 2 };
  const note = !file.sample
    ? ""
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
      if (input.entry === "notes") {
        d.state = { ...d.state, entry: "notes" };
        askNotes(d);
      } else {
        d.state = { ...d.state, entry: "meeting" };
        setPending(d, { kind: "sentence" });
        d.messages.push(say(QUESTIONS.sentence));
      }
      break;
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
      d.messages.push(say("Klik links op wat niet klopt en pas het aan. Daarna kan je op Klopt klikken."));
      break;
    case "edited": {
      const k = d.state.pending.kind;
      // Het voorstel staat al open: de kaart toont de aanpassing, er komt geen nieuwe vraag.
      if (k === "confirm-meeting") break;
      if (["entry", "sentence", "name", "day", "time", "recurrence", "participants"].includes(k)) {
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
