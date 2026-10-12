/**
 * Variant A (SPEC-LAZY.md §3): het overleg in opbouw getoond met het bestaande detailscherm. De gast-state
 * blijft de bron; hier wordt ze een `Meeting` (met vaste id's) en worden wijzigingen uit het detailscherm
 * teruggeschreven naar de gast-state.
 */
import { newBlock, newItem, type AgendaBlock } from "@/lib/agenda";
import { ME, type GuestBundle } from "@/lib/assistant/types";
import { formatShortDate, nextWeekday, toISO } from "@/lib/date";
import { deriveMeetingType } from "@/lib/meeting";
import { AVATAR_COLORS, USER_PERSON_ID, type Person } from "@/lib/mock-data";
import { initialsFrom } from "@/lib/people";
import type { Action, Meeting } from "@/lib/store";

export const TRIAL_MEETING_ID = "proefomgeving";
const ACTIONS_BLOCK = "proef-acties";
const DEFAULT_BLOCK = "proef-lopende-zaken";
const VARIA_BLOCK = "proef-varia";

/** Beslissingen komen bij het agendapunt over knelpunten of beslissingen, anders bij het eerste. */
const DECISION_BLOCK = /beslis|knelpunt|probleem|problemen/i;

/**
 * De agenda: "Openstaande acties", elk agendapunt als eigen blok (of "Lopende zaken" als er nog geen zijn),
 * en "Varia". Beslissingen staan als punt in een blok, met het doel "beslissen".
 */
export function guestBlocks(b: GuestBundle, opts: { stableIds: boolean }): AgendaBlock[] {
  const decisions = b.decisions.filter((d) => d.confirmed && d.text.trim());
  const topics = b.meeting.topics.filter((t) => t.text.trim());
  const blocks: AgendaBlock[] = topics.length
    ? topics.map((t) => newBlock("topics", { ...(opts.stableIds ? { id: t.id } : {}), title: t.text.trim() }))
    : [newBlock("topics", { ...(opts.stableIds ? { id: DEFAULT_BLOCK } : {}), title: "Lopende zaken" })];
  const target = blocks.find((x) => DECISION_BLOCK.test(x.title)) ?? blocks[0];
  target.items = decisions.map((d) =>
    newItem(d.text.trim(), { ...(opts.stableIds ? { id: d.id } : {}), purposes: ["decide"] }),
  );
  return [
    newBlock("actions", opts.stableIds ? { id: ACTIONS_BLOCK } : {}),
    ...blocks,
    newBlock("topics", { ...(opts.stableIds ? { id: VARIA_BLOCK } : {}), title: "Varia" }),
  ];
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
