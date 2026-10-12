/**
 * "Uit mijn agenda" (SPEC-LAZY.md §4, Stap 1 punt 1, C1b): de vaste overleggen en losse afspraken uit de
 * mock-agenda, zoals de assistent ze als keuze toont. Gesimuleerd, alleen lezen.
 */
import type { CalendarOption, GuestPerson } from "@/lib/assistant/types";
import { fromISO, weekdayLong } from "@/lib/date";
import { rhythmLabel } from "@/lib/meeting";
import { getAppointments, PEOPLE, SERIES, seriesSchedule, USER_PERSON_ID } from "@/lib/mock-data";
import { formatTime } from "@/lib/time";
import { upperFirst } from "@/lib/utils";

/** Wie er na koppelen ingelogd is (mock-data). */
export const CALENDAR_USER = {
  firstName: "Tom",
  lastName: "Claes",
  email: "tom.claes@metaalwerken.be",
  company: "Metaalwerken",
};

/** Agendapunt uit de uitnodiging in de agenda, waar die er een heeft. */
const INVITATION_TOPICS: Record<string, string[]> = {
  productie: ["Orders, stilstanden en planning volgende week"],
  management: ["Budget en personeel"],
};

/** Deelnemers zoals in de agenda; jijzelf (de ingelogde gebruiker) telt apart. */
function people(ids: string[]): GuestPerson[] {
  return ids
    .filter((id) => id !== USER_PERSON_ID)
    .map((id) => PEOPLE.find((p) => p.id === id))
    .filter((p): p is (typeof PEOPLE)[number] => !!p && p.email !== CALENDAR_USER.email)
    .map(({ id, name, initials, color }) => ({ id, name, initials, color }));
}

const count = (n: number) => `${n} ${n === 1 ? "deelnemer" : "deelnemers"}`;

/** Vaste overleggen: wat je zelf organiseert met de meeste deelnemers eerst. */
export function seriesOptions(): CalendarOption[] {
  return SERIES.filter((s) => s.participants.includes(USER_PERSON_ID))
    .sort((a, b) => Number(b.organizer) - Number(a.organizer) || b.participants.length - a.participants.length)
    .map((s) => {
      const schedule = seriesSchedule(s);
      return {
        id: s.id,
        name: s.name,
        recurrence: schedule.recurrence,
        weekday: fromISO(schedule.date!).getDay(),
        time: s.time,
        duration: s.duration,
        participants: people(s.participants),
        organizer: s.organizer,
        topics: INVITATION_TOPICS[s.id] ?? [],
        line: `${rhythmLabel(schedule.recurrence, schedule.date)} ${formatTime(s.time)} · ${count(s.participants.length)}`,
      };
    });
}

/** Geen reeksen: losse afspraken in de komende 2 weken; het ritme is dan nog onbekend. */
export function appointmentOptions(): CalendarOption[] {
  return getAppointments().map((a) => ({
    id: a.id,
    name: a.name,
    recurrence: null,
    weekday: fromISO(a.date).getDay(),
    time: a.time,
    duration: a.duration,
    participants: people(a.participants),
    organizer: false,
    topics: [],
    line: `${upperFirst(weekdayLong(a.date))} ${formatTime(a.time)} · ${count(a.participants.length)}`,
  }));
}
