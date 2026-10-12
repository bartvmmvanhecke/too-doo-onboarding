/**
 * Bewaren in Variant A (SPEC-LAZY.md §2 en §6): de gast-state wordt vergaderingen in de app-store,
 * zodat de bestaande app-schermen (/app/overleg/:id, acties, checklist) werken. Niets opnieuw ingeven.
 */
import { newBlock, newItem, todayISO } from "@/lib/agenda";
import { ME, type GuestBundle } from "@/lib/assistant/types";
import { formatShortDate, nextWeekday, toISO } from "@/lib/date";
import { deriveMeetingType } from "@/lib/meeting";
import { USER_PERSON_ID, type Person } from "@/lib/mock-data";
import type { Action, Meeting } from "@/lib/store";
import { uid } from "@/lib/utils";

/** De overleggen van de gast: eerst de afgewerkte ("Nog een overleg toevoegen"), dan het huidige. */
export function guestBundles(s: GuestBundle & { others: GuestBundle[] }): GuestBundle[] {
  const current = { meeting: s.meeting, actions: s.actions, decisions: s.decisions };
  return [...s.others, ...(s.meeting.name ? [current] : [])];
}

/** Deelnemers worden personen in de app; de gebruiker zelf is altijd USER_PERSON_ID. */
export function guestPeople(bundles: GuestBundle[]): Person[] {
  const seen = new Map<string, Person>();
  for (const b of bundles) for (const p of b.meeting.participants) if (!seen.has(p.id)) seen.set(p.id, { ...p });
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
      done: false,
      createdAt: todayISO(),
    }));
  const items = [
    ...m.topics.filter((t) => t.text.trim()).map((t) => newItem(t.text.trim())),
    ...b.decisions
      .filter((d) => d.confirmed && d.text.trim())
      .map((d) => newItem(d.text.trim(), { purposes: ["decide"] })),
  ];
  return {
    name,
    type: deriveMeetingType(name),
    recurrence: m.recurrence ?? "once",
    date: m.weekday ? toISO(nextWeekday(m.weekday)) : null,
    time: m.time,
    duration: m.duration,
    participants: [USER_PERSON_ID, ...m.participants.map((p) => p.id)],
    actions,
    blocks: [
      newBlock("actions"),
      newBlock("topics", { title: "Lopende zaken", items }),
      newBlock("topics", { title: "Varia", subtitle: "Wat onverwacht ter sprake komt" }),
    ],
    showWelcome: false,
    invited: false,
    held: false,
    origin: "a",
  };
}
