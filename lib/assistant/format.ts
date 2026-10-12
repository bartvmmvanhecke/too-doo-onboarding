/** Teksten over het overleg in opbouw, gedeeld door de assistent, het hoofdvlak en het bewaar-modal. */
import { ME, type GuestAction, type GuestMeeting, type GuestPerson } from "@/lib/assistant/types";
import { formatShortDate, nextWeekday, toISO, weekdayLong } from "@/lib/date";
import { RECURRENCE_LABEL, rhythmLabel } from "@/lib/meeting";
import { formatTime, formatTimeRange, type Minutes } from "@/lib/time";
import { joinNl, upperFirst } from "@/lib/utils";

export function nextDate(m: Pick<GuestMeeting, "weekday">, ref?: Date): string | null {
  return m.weekday ? toISO(nextWeekday(m.weekday, ref)) : null;
}

/** "maandag" */
export function weekdayName(m: Pick<GuestMeeting, "weekday">): string | null {
  const date = nextDate(m);
  return date ? weekdayLong(date) : null;
}

/** "Elke maandag", "Om de 2 weken op dinsdag", "Maandelijks", "Maandag"; null als er nog niets is. */
export function rhythmText(m: GuestMeeting): string | null {
  const date = nextDate(m);
  if (m.recurrence && date) {
    return m.recurrence === "once" ? `Eenmalig op ${weekdayLong(date)}` : rhythmLabel(m.recurrence, date);
  }
  if (m.recurrence) return RECURRENCE_LABEL[m.recurrence];
  if (date) return upperFirst(weekdayLong(date));
  return null;
}

/** "Elke maandag · 08:00–09:00"; null als er nog niets gezegd is. */
export function whenText(m: GuestMeeting, sep = " · "): string | null {
  const parts = [rhythmText(m), m.time !== null ? formatTimeRange(m.time, m.duration) : null].filter(Boolean);
  return parts.length ? parts.join(sep) : null;
}

/** "Elke maandag · 08:00" (zonder einduur), voor het bewaar-modal. */
export function whenShort(m: GuestMeeting): string | null {
  const parts = [rhythmText(m), m.time !== null ? formatTime(m.time) : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** "Elke maandag · 08:00–09:00 · volgende: ma 19 okt · 5 deelnemers" */
export function scheduleText(m: GuestMeeting): string {
  const date = nextDate(m);
  const parts = [whenText(m)];
  if (date) parts.push(m.recurrence === "once" ? formatShortDate(date) : `volgende: ${formatShortDate(date)}`);
  const n = m.participants.length + 1;
  parts.push(`${n} ${n === 1 ? "deelnemer" : "deelnemers"}`);
  return parts.filter(Boolean).join(" · ");
}

/** "8u" of "14u30" */
export function spokenTime(t: Minutes): string {
  const h = Math.floor(t / 60);
  const m = t % 60;
  return m ? `${h}u${String(m).padStart(2, "0")}` : `${h}u`;
}

/** "Jan, Sofie, Pieter, Karim en jij" */
export function participantsText(people: GuestPerson[]): string {
  return joinNl([...people.map((p) => p.name), "jij"]);
}

/** Eigenaars (behalve jijzelf) van aangevinkte acties, in volgorde. */
export function mailOwners(actions: GuestAction[], people: GuestPerson[]): GuestPerson[] {
  const ids = [...new Set(actions.filter((a) => a.confirmed && a.ownerId && a.ownerId !== ME).map((a) => a.ownerId!))];
  return ids.map((id) => people.find((p) => p.id === id)).filter((p): p is GuestPerson => !!p);
}

export function ownerName(ownerId: string | null, people: GuestPerson[]): string | null {
  if (!ownerId) return null;
  if (ownerId === ME) return "Ikzelf";
  return people.find((p) => p.id === ownerId)?.name ?? null;
}
