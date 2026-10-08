"use client";

/**
 * Client-side state van het prototype (SPEC.md §4), bewaard in localStorage
 * zodat herladen de flow niet breekt. "Reset demo" wist alles.
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { nextWeekday, toISO, WEEKDAY } from "@/lib/date";
import { deriveMeetingType, slugify, type MeetingSchedule } from "@/lib/meeting";
import { PEOPLE, SERIES, USER_PERSON_ID, seriesSchedule, type Appointment, type Person } from "@/lib/mock-data";
import { createPerson, initialsFrom } from "@/lib/people";
import { uid } from "@/lib/utils";

export type LoginOutcome = "success" | "blocked";
export type CalendarOutcome = "series" | "none" | "admin" | "cancelled";
export type LoginMethod = "microsoft" | "google" | "email" | "email-blocked";

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  method: LoginMethod;
}

export interface MeetingDraft extends MeetingSchedule {
  id: string;
  participants: string[];
  source: "outlook" | "manual" | "appointment";
  seriesId?: string;
}

export interface ActionDraft {
  what: string;
  ownerId: string | null;
  /** Getypte tekst in "Wie?" zolang er geen persoon gekozen is. */
  ownerText: string;
  deadline: string;
}

export interface Action {
  id: string;
  what: string;
  ownerId: string | null;
  deadline: string;
  done: boolean;
}

export interface AgendaItem {
  id: string;
  text: string;
}

export interface Meeting extends MeetingSchedule {
  id: string;
  type: string;
  participants: string[];
  actions: Action[];
  agendaItems: AgendaItem[];
  seriesId?: string;
  draftId?: string;
  showWelcome: boolean;
  invited: boolean;
  held: boolean;
}

export type CalendarState = "idle" | "series" | "none";

interface Data {
  demo: { login: LoginOutcome; calendar: CalendarOutcome };
  user: User | null;
  calendar: CalendarState;
  calendarNotice: "cancelled" | null;
  selectedSeriesId: string;
  manualDraft: MeetingDraft | null;
  pending: MeetingDraft | null;
  actionDrafts: ActionDraft[];
  extraPeople: Person[];
  meetings: Meeting[];
  moreMeetingsAdded: boolean;
}

interface Actions {
  setDemo: (patch: Partial<Data["demo"]>) => void;
  reset: () => void;
  signIn: (user: User) => void;
  setCalendar: (calendar: CalendarState) => void;
  setCalendarNotice: (notice: Data["calendarNotice"]) => void;
  selectSeries: (id: string) => void;
  startManualDraft: (from?: Appointment) => void;
  updateManualDraft: (patch: Partial<MeetingDraft>) => void;
  choosePending: (draft: MeetingDraft) => void;
  updateActionDraft: (index: number, patch: Partial<ActionDraft>) => void;
  addPerson: (input: string) => Person;
  createMeetingFromPending: (withActions: boolean) => string | null;
  createMeeting: (schedule: MeetingSchedule, extra?: Partial<Meeting>) => string;
  addMeetings: (list: { schedule: MeetingSchedule; seriesId?: string; participants?: string[] }[]) => void;
  toggleAction: (meetingId: string, actionId: string) => void;
  addAction: (meetingId: string, action: Omit<Action, "id" | "done">) => void;
  addAgendaItem: (meetingId: string, text: string) => void;
  dismissWelcome: (meetingId: string) => void;
  markInvited: (meetingId: string) => void;
  markHeld: (meetingId: string) => void;
}

export type Store = Data & Actions;

const emptyActionDrafts = (): ActionDraft[] =>
  Array.from({ length: 3 }, () => ({ what: "", ownerId: null, ownerText: "", deadline: "" }));

const initialData = (): Data => ({
  demo: { login: "success", calendar: "series" },
  user: null,
  calendar: "idle",
  calendarNotice: null,
  selectedSeriesId: SERIES[0].id,
  manualDraft: null,
  pending: null,
  actionDrafts: emptyActionDrafts(),
  extraPeople: [],
  meetings: [],
  moreMeetingsAdded: false,
});

/** Lege draft voor 2b: eerstvolgende maandag, 08:00, 1 uur, elke week. */
export function emptyManualDraft(): MeetingDraft {
  return {
    id: uid("d-"),
    name: "",
    recurrence: "weekly",
    date: toISO(nextWeekday(WEEKDAY.ma)),
    time: 8 * 60,
    duration: 60,
    participants: [],
    source: "manual",
  };
}

export function draftFromSeries(seriesId: string): MeetingDraft {
  const s = SERIES.find((x) => x.id === seriesId) ?? SERIES[0];
  return {
    id: `series-${s.id}`,
    ...seriesSchedule(s),
    participants: s.participants,
    source: "outlook",
    seriesId: s.id,
  };
}

function uniqueId(name: string, meetings: Meeting[], keep?: string): string {
  const base = slugify(name);
  let id = base;
  let n = 2;
  while (meetings.some((m) => m.id === id && m.id !== keep)) id = `${base}-${n++}`;
  return id;
}

function newMeeting(schedule: MeetingSchedule, id: string, extra: Partial<Meeting> = {}): Meeting {
  return {
    ...schedule,
    id,
    type: deriveMeetingType(schedule.name),
    participants: [],
    actions: [],
    agendaItems: [],
    showWelcome: true,
    invited: false,
    held: false,
    ...extra,
  };
}

const noopStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const STORAGE_KEY = "too-doo-onboarding";

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const updateMeeting = (id: string, fn: (m: Meeting) => Meeting) =>
        set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? fn(m) : m)) }));

      return {
        ...initialData(),

        setDemo: (patch) => set((s) => ({ demo: { ...s.demo, ...patch } })),
        reset: () => set(initialData()),

        signIn: (user) => set({ user }),
        setCalendar: (calendar) => set({ calendar, calendarNotice: null }),
        setCalendarNotice: (calendarNotice) => set({ calendarNotice }),
        selectSeries: (selectedSeriesId) => set({ selectedSeriesId }),

        startManualDraft: (from) => {
          const draft = emptyManualDraft();
          if (from) {
            Object.assign(draft, {
              name: from.name,
              date: from.date,
              time: from.time,
              duration: from.duration,
              participants: from.participants,
              source: "appointment",
            });
          }
          set({ manualDraft: draft });
        },
        updateManualDraft: (patch) =>
          set((s) => ({ manualDraft: { ...(s.manualDraft ?? emptyManualDraft()), ...patch } })),

        choosePending: (draft) =>
          set((s) => ({
            pending: draft,
            actionDrafts: s.pending?.id === draft.id ? s.actionDrafts : emptyActionDrafts(),
          })),
        updateActionDraft: (index, patch) =>
          set((s) => ({ actionDrafts: s.actionDrafts.map((a, i) => (i === index ? { ...a, ...patch } : a)) })),

        addPerson: (input) => {
          const s = get();
          const existing = [...PEOPLE, ...s.extraPeople].find(
            (p) =>
              p.email?.toLowerCase() === input.trim().toLowerCase() ||
              p.name.toLowerCase() === input.trim().toLowerCase(),
          );
          if (existing) return existing;
          const person = createPerson(input, PEOPLE.length + s.extraPeople.length);
          set({ extraPeople: [...s.extraPeople, person] });
          return person;
        },

        createMeetingFromPending: (withActions) => {
          const s = get();
          const draft = s.pending;
          if (!draft) return null;
          const actions: Action[] = [];
          if (withActions) {
            for (const a of s.actionDrafts) {
              if (!a.what.trim()) continue;
              let ownerId = a.ownerId;
              if (!ownerId && a.ownerText.trim()) ownerId = get().addPerson(a.ownerText).id;
              actions.push({ id: uid("a-"), what: a.what.trim(), ownerId, deadline: a.deadline.trim(), done: false });
            }
          }
          const previous = s.meetings.find((m) => m.draftId === draft.id);
          const id = uniqueId(draft.name, s.meetings, previous?.id);
          const meeting = newMeeting(draft, id, {
            participants: draft.participants,
            seriesId: draft.seriesId,
            draftId: draft.id,
            actions,
          });
          set((st) => ({
            meetings: previous
              ? st.meetings.map((m) => (m.id === previous.id ? meeting : m))
              : [meeting, ...st.meetings],
          }));
          return id;
        },

        createMeeting: (schedule, extra) => {
          const id = uniqueId(schedule.name, get().meetings);
          set((s) => ({ meetings: [...s.meetings, newMeeting(schedule, id, extra)] }));
          return id;
        },

        addMeetings: (list) => {
          let meetings = get().meetings;
          for (const item of list) {
            const id = uniqueId(item.schedule.name, meetings);
            meetings = [
              ...meetings,
              newMeeting(item.schedule, id, {
                seriesId: item.seriesId,
                participants: item.participants ?? [],
                showWelcome: false,
              }),
            ];
          }
          set({ meetings, moreMeetingsAdded: true });
        },

        toggleAction: (meetingId, actionId) =>
          updateMeeting(meetingId, (m) => ({
            ...m,
            actions: m.actions.map((a) => (a.id === actionId ? { ...a, done: !a.done } : a)),
          })),
        addAction: (meetingId, action) =>
          updateMeeting(meetingId, (m) => ({
            ...m,
            actions: [...m.actions, { ...action, id: uid("a-"), done: false }],
          })),
        addAgendaItem: (meetingId, text) =>
          updateMeeting(meetingId, (m) => ({ ...m, agendaItems: [...m.agendaItems, { id: uid("i-"), text }] })),
        dismissWelcome: (meetingId) => updateMeeting(meetingId, (m) => ({ ...m, showWelcome: false })),
        markInvited: (meetingId) => updateMeeting(meetingId, (m) => ({ ...m, invited: true })),
        markHeld: (meetingId) => updateMeeting(meetingId, (m) => ({ ...m, held: true })),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
    },
  ),
);

/* ---------- Selectors & helpers ---------- */

/** Alle personen; "jp" is altijd de ingelogde gebruiker. */
export function usePeople(): Person[] {
  const user = useStore((s) => s.user);
  const extra = useStore((s) => s.extraPeople);
  return mergePeople(user, extra);
}

export function mergePeople(user: User | null, extra: Person[]): Person[] {
  const base = PEOPLE.map((p) => {
    if (p.id !== USER_PERSON_ID || !user) return p;
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    return { ...p, name, email: user.email, initials: initialsFrom(name) };
  });
  return [...base, ...extra];
}

export function findPerson(people: Person[], id: string | null | undefined): Person | undefined {
  return id ? people.find((p) => p.id === id) : undefined;
}

export function useUserFirstName(): string {
  return useStore((s) => s.user?.firstName) || "Jan";
}

/** Outlook-opties verbergen enkel na een geblokkeerde Microsoft-login (SPEC.md §8). */
export function useOutlookBlocked(): boolean {
  return useStore((s) => s.user?.method === "email-blocked");
}
