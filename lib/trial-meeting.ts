/**
 * Variant A (SPEC-LAZY.md §3): het overleg in opbouw getoond met het bestaande detailscherm. De gast-state
 * blijft de bron; hier wordt ze een `Meeting` (met vaste id's) en worden wijzigingen uit het detailscherm
 * teruggeschreven naar de gast-state.
 */
import { newBlock, newItem, type AgendaBlock, type AgendaItem } from "@/lib/agenda";
import {
  ME,
  type GuestBundle,
  type GuestDecision,
  type GuestItem,
  type GuestItemMeta,
  type GuestMeeting,
} from "@/lib/assistant/types";
import { formatShortDate, nextWeekday, toISO } from "@/lib/date";
import { deriveMeetingType } from "@/lib/meeting";
import { AVATAR_COLORS, USER_PERSON_ID, type Person } from "@/lib/mock-data";
import { initialsFrom } from "@/lib/people";
import type { Action, Meeting } from "@/lib/store";
import { uid } from "@/lib/utils";

export const TRIAL_MEETING_ID = "proefomgeving";
const ACTIONS_BLOCK = "proef-acties";
const DEFAULT_BLOCK = "proef-lopende-zaken";
const VARIA_BLOCK = "proef-varia";

/** Beslissingen komen bij het agendapunt over knelpunten of beslissingen, anders bij het eerste. */
const DECISION_BLOCK = /beslis|knelpunt|probleem|problemen/i;

/**
 * De agenda: "Openstaande acties", de thema's met hun agendapunten (of "Lopende zaken" als er nog geen thema's
 * zijn) en "Varia". Beslissingen staan als agendapunt met het doel "beslissen", bovenaan in hun thema.
 */
export function guestBlocks(b: GuestBundle, opts: { stableIds: boolean }): AgendaBlock[] {
  const stable = (id: string) => (opts.stableIds ? { id } : {});
  const items = (list: GuestItem[] | undefined) =>
    (list ?? []).filter((i) => i.text.trim()).map((i) => newItem(i.text.trim(), { ...stable(i.id), ...meta(i) }));
  const topics = b.meeting.topics.filter((t) => t.text.trim() || t.items?.length || t.kind);
  const blocks: AgendaBlock[] = topics.length
    ? topics.map((t) => ({
        ...newBlock(t.kind ?? "topics", {
          ...stable(t.id),
          title: t.text.trim(),
          presenterId: t.presenterId ?? null,
          duration: t.duration ?? null,
        }),
        items: items(t.items),
      }))
    : [newBlock("topics", { ...stable(DEFAULT_BLOCK), title: "Lopende zaken" })];
  const varia = {
    ...newBlock("topics", { ...stable(VARIA_BLOCK), title: "Varia", presenterId: b.meeting.variaPresenterId ?? null }),
    items: items(b.meeting.variaItems),
  };
  const all = [...blocks, varia];
  const ids = topics.length ? topics.map((t) => t.id) : [DEFAULT_BLOCK];
  for (const d of [...b.decisions].reverse()) {
    if (!d.confirmed || !d.text.trim()) continue;
    const at = decisionBlockIndex(d, ids, blocks);
    const item = newItem(d.text.trim(), { ...stable(d.id), purposes: ["decide"], ...meta(d) });
    all[at].items = [item, ...all[at].items];
  }
  return [newBlock("actions", stable(ACTIONS_BLOCK)), ...all];
}

/** Doel, eigenaars en duur, enkel wat gezet is. */
function meta(i: GuestItemMeta): Partial<AgendaItem> {
  return {
    ...(i.entries ? { entries: i.entries } : {}),
    ...(i.purposes ? { purposes: i.purposes } : {}),
    ...(i.ownerIds ? { ownerIds: i.ownerIds } : {}),
    ...(i.duration !== undefined ? { duration: i.duration } : {}),
  };
}

/** Waar een beslissing staat: het thema waarheen ze versleept werd, anders het thema over beslissingen of het eerste. */
function decisionBlockIndex(d: GuestDecision, ids: string[], blocks: AgendaBlock[]): number {
  if (d.topicId === VARIA_BLOCK) return blocks.length;
  const i = d.topicId ? ids.indexOf(d.topicId) : -1;
  if (i >= 0) return i;
  const rule = blocks.findIndex((x) => DECISION_BLOCK.test(x.title));
  return rule >= 0 ? rule : 0;
}

/* ---------- Agendapunten onder een thema (SPEC-LAZY.md §3, "Agendapunten aanmaken en verslepen") ---------- */

type Lists = Pick<GuestBundle, "meeting" | "decisions">;

/** "Lopende zaken" is een standaardblok zolang er geen thema's zijn; een agendapunt erin maakt het een thema. */
function materialize(m: GuestMeeting, blockId: string): { meeting: GuestMeeting; blockId: string } {
  if (blockId !== DEFAULT_BLOCK || m.topics.length) return { meeting: m, blockId };
  const id = uid("t-");
  return { meeting: { ...m, topics: [{ id, text: "Lopende zaken", items: [] }] }, blockId: id };
}

function withList(m: GuestMeeting, blockId: string, fn: (items: GuestItem[]) => GuestItem[]): GuestMeeting {
  if (blockId === VARIA_BLOCK) return { ...m, variaItems: fn(m.variaItems ?? []) };
  return { ...m, topics: m.topics.map((t) => (t.id === blockId ? { ...t, items: fn(t.items ?? []) } : t)) };
}

export function addGuestItem(m: GuestMeeting, blockId: string, text: string): GuestMeeting {
  const target = materialize(m, blockId);
  return withList(target.meeting, target.blockId, (items) => [...items, { id: uid("i-"), text }]);
}

const allLists = (m: GuestMeeting) => [VARIA_BLOCK, ...m.topics.map((t) => t.id)];

export function updateGuestItem(
  m: GuestMeeting,
  itemId: string,
  patch: Partial<Pick<GuestItem, "text"> & GuestItemMeta>,
): GuestMeeting {
  return allLists(m).reduce(
    (acc, id) => withList(acc, id, (items) => items.map((i) => (i.id === itemId ? { ...i, ...patch } : i))),
    m,
  );
}

/** Presentator van een thema; "Lopende zaken" wordt daarbij een echt thema. */
export function setGuestPresenter(m: GuestMeeting, blockId: string, presenterId: string | null): GuestMeeting {
  if (blockId === VARIA_BLOCK) return { ...m, variaPresenterId: presenterId };
  const target = materialize(m, blockId);
  return {
    ...target.meeting,
    topics: target.meeting.topics.map((t) => (t.id === target.blockId ? { ...t, presenterId } : t)),
  };
}

export function removeGuestItem(m: GuestMeeting, itemId: string): GuestMeeting {
  return allLists(m).reduce((acc, id) => withList(acc, id, (items) => items.filter((i) => i.id !== itemId)), m);
}

/**
 * Verplaatst een agendapunt (of beslissing) naar `index` in het thema `toBlockId`, binnen hetzelfde thema of
 * naar een ander. Beslissingen blijven bovenaan in hun thema.
 */
export function moveGuestItem(b: Lists, itemId: string, toBlockId: string, index: number): Lists {
  const target = materialize(b.meeting, toBlockId);
  const decision = b.decisions.find((d) => d.id === itemId);
  if (decision) {
    return {
      meeting: target.meeting,
      decisions: b.decisions.map((d) => (d.id === itemId ? { ...d, topicId: target.blockId } : d)),
    };
  }
  const item = allLists(target.meeting)
    .flatMap((id) =>
      id === VARIA_BLOCK
        ? (target.meeting.variaItems ?? [])
        : (target.meeting.topics.find((t) => t.id === id)?.items ?? []),
    )
    .find((i) => i.id === itemId);
  if (!item) return b;
  const removed = removeGuestItem(target.meeting, itemId);
  // De index telt de beslissingen bovenaan het thema mee.
  const shown = guestBlocks({ meeting: removed, actions: [], decisions: b.decisions }, { stableIds: true });
  const decisionsAbove =
    shown.find((x) => x.id === target.blockId)?.items.filter((i) => i.purposes.includes("decide")).length ?? 0;
  const meeting = withList(removed, target.blockId, (items) => {
    const at = Math.max(0, Math.min(index - decisionsAbove, items.length));
    return [...items.slice(0, at), item, ...items.slice(at)];
  });
  return { meeting, decisions: b.decisions };
}

/** Is er minstens één agendapunt (thema's zonder punten en openstaande acties tellen niet)? */
export function hasAgendaItem(b: GuestBundle): boolean {
  return guestBlocks(b, { stableIds: true }).some((x) => x.kind === "topics" && x.items.length > 0);
}

/** Deelnemers als personen; de gebruiker zelf heet "Ikzelf" tot er een account is. */
export function trialPeople(b: GuestBundle, me: { name: string } | null): Person[] {
  return [
    {
      id: USER_PERSON_ID,
      name: me?.name ?? "Ikzelf",
      initials: me ? initialsFrom(me.name) : "JIJ",
      color: AVATAR_COLORS[7],
    },
    ...b.meeting.participants.map((p) => ({ ...p })),
  ];
}

/** Het overleg in opbouw als `Meeting`, met vaste id's zodat het detailscherm stabiel blijft. */
export function trialMeeting(b: GuestBundle, opts: { confirming: boolean }): Meeting {
  const m = b.meeting;
  const actions: Action[] = b.actions
    .filter((a) => a.text.trim())
    .map((a) => ({
      id: a.id,
      what: a.text,
      ownerId: a.ownerId === ME ? USER_PERSON_ID : a.ownerId,
      deadline: a.deadline ? formatShortDate(a.deadline) : "",
      // Stap 2: "uitgevinkt" = klopt niet (valt weg bij "Zet ze op de agenda").
      done: opts.confirming ? !a.confirmed : !!a.done,
    }));
  return {
    id: TRIAL_MEETING_ID,
    name: m.name ?? "Je eerste overleg",
    type: deriveMeetingType(m.name ?? ""),
    recurrence: m.recurrence ?? "once",
    date: m.weekday ? toISO(nextWeekday(m.weekday)) : null,
    time: m.time,
    duration: m.duration,
    participants: m.participants.map((p) => p.id),
    actions,
    blocks: guestBlocks(b, { stableIds: true }),
    showWelcome: false,
    invited: false,
    held: false,
  };
}

/** Is dit blok een agendapunt uit de gast-state (en geen standaardblok)? */
export function isTopicBlock(id: string): boolean {
  return id !== ACTIONS_BLOCK && id !== DEFAULT_BLOCK && id !== VARIA_BLOCK;
}

export { ACTIONS_BLOCK, DEFAULT_BLOCK, VARIA_BLOCK };
