/**
 * Bewaren in Variant A (SPEC-LAZY.md §2 en §6): de gast-state wordt vergaderingen in de app-store,
 * zodat de bestaande app-schermen (/app/overleg/:id, acties, checklist) werken. Niets opnieuw ingeven.
 */
import { todayISO } from "@/lib/agenda";
import { ME, type GuestBundle } from "@/lib/assistant/types";
import { formatShortDate, nextWeekday, toISO } from "@/lib/date";
import { deriveMeetingType } from "@/lib/meeting";
import { PEOPLE, USER_PERSON_ID, type Person } from "@/lib/mock-data";
import type { Action, Meeting } from "@/lib/store";
import { guestBlocks } from "@/lib/trial-meeting";
import { uid } from "@/lib/utils";

/** De overleggen van de gast: eerst de afgewerkte ("Nog een overleg toevoegen"), dan het huidige. */
export function guestBundles(s: GuestBundle & { others: GuestBundle[] }): GuestBundle[] {
  const current = { meeting: s.meeting, actions: s.actions, decisions: s.decisions };
  return [...s.others, ...(s.meeting.name ? [current] : [])];
}

/**
 * Deelnemers worden personen in de app; de gebruiker zelf is altijd USER_PERSON_ID. Wie uit de agenda komt,
 * bestaat al in de app (zelfde id) en wordt niet opnieuw toegevoegd.
 */
export function guestPeople(bundles: GuestBundle[]): Person[] {
  const seen = new Map<string, Person>();
  for (const b of bundles)
    for (const p of b.meeting.participants)
      if (!seen.has(p.id) && !PEOPLE.some((x) => x.id === p.id)) seen.set(p.id, { ...p });
  return [...seen.values()];
}

function ownerFor(ownerId: string | null): string | null {
  return ownerId === ME ? USER_PERSON_ID : ownerId;
}

export function bundleToMeeting(b: GuestBundle): Omit<Meeting, "id"> {
  const m = b.meeting;
  const name = m.name ?? "Mijn overleg";
  const actions: Action[] = b.actions
    .filter((a) => a.confirmed && a.text.trim())
    .map((a) => ({
      id: uid("a-"),
      what: a.text.trim(),
      ownerId: ownerFor(a.ownerId),
      deadline: a.deadline ? formatShortDate(a.deadline) : "",
      done: !!a.done,
      createdAt: todayISO(),
    }));
  return {
    name,
    type: deriveMeetingType(name),
    recurrence: m.recurrence ?? "once",
    date: m.weekday ? toISO(nextWeekday(m.weekday)) : null,
    time: m.time,
    duration: m.duration,
    participants: [USER_PERSON_ID, ...m.participants.map((p) => p.id)],
    actions,
    blocks: guestBlocks(b, { stableIds: false }),
    showWelcome: false,
    invited: false,
    held: false,
    origin: "a",
  };
}
