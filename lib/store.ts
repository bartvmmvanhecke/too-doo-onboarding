"use client";

/**
 * Client-side state van het prototype (SPEC.md §4), bewaard in localStorage
 * zodat herladen de flow niet breekt. "Reset demo" wist alles.
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  allItems,
  defaultBlocks,
  newBlock,
  newItem,
  runSteps,
  todayISO,
  type AgendaBlock,
  type AgendaItem,
  type BlockKind,
  type Entry,
  type EntryInput,
  type MeetingRun,
} from "@/lib/agenda";
import { formatShortDate, nextWeekday, toISO, WEEKDAY, type ISODate } from "@/lib/date";
import { SAMPLE_NOTES, type Proposal } from "@/lib/extract";
import type { FlowId, FlowPreset } from "@/lib/flows";
import { deriveMeetingType, slugify, type MeetingSchedule } from "@/lib/meeting";
import {
  MOCK_USER,
  PEOPLE,
  SERIES,
  USER_PERSON_ID,
  seriesSchedule,
  type Appointment,
  type Person,
} from "@/lib/mock-data";
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
  /** Variant B: de eigenaar kreeg de actie per mail (gesimuleerd). */
  mailed?: boolean;
  /** Vergadering (datum) waarin de actie genoteerd werd. */
  createdAt?: ISODate;
}

export type { AgendaBlock, AgendaItem, Entry, MeetingRun };

export interface Meeting extends MeetingSchedule {
  id: string;
  type: string;
  participants: string[];
  actions: Action[];
  blocks: AgendaBlock[];
  /** Details-popover; leeg = niet getoond. */
  location?: string;
  room?: string;
  description?: string;
  /** Gezet zolang de vergadering bezig is. */
  run?: MeetingRun | null;
  seriesId?: string;
  draftId?: string;
  showWelcome: boolean;
  invited: boolean;
  held: boolean;
  /** Aangemaakt via variant B (/b/structuur). */
  origin?: "b";
  /** Voorbeeldvergadering op /voorbeeld: wordt nooit bewaard. */
  example?: boolean;
}

export type ExtractionTab = "plak" | "inspreken" | "typen";

export interface BState {
  /** Aangevinkte reeksen op /b/structuur; null = nog de standaardselectie. */
  selection: string[] | null;
  /** Overleg waarvoor /b/acties de acties verzamelt. */
  targetMeetingId: string | null;
  extraction: {
    tab: ExtractionTab;
    text: string;
    proposals: Proposal[] | null;
    typed: ActionDraft[];
  };
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
  /** Gekozen flow op /prototype. */
  flow: FlowId | null;
  /** Waar "Volgende" op /overleg/zelf naartoe gaat als je er vanuit variant B komt. */
  manualReturn: string | null;
  b: BState;
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
  addAgendaItem: (meetingId: string, blockId: string, text: string) => string;
  updateItem: (meetingId: string, itemId: string, patch: Partial<Omit<AgendaItem, "id">>) => void;
  removeItem: (meetingId: string, itemId: string) => void;
  moveItem: (meetingId: string, itemId: string, toBlockId: string, toIndex: number) => void;
  addEntry: (meetingId: string, itemId: string, entry: EntryInput) => string;
  updateEntry: (
    meetingId: string,
    itemId: string,
    entryId: string,
    patch: Partial<Pick<Entry, "text" | "ownerId" | "date">>,
  ) => void;
  removeEntry: (meetingId: string, itemId: string, entryId: string) => void;
  addBlock: (meetingId: string, kind: BlockKind) => string;
  updateBlock: (meetingId: string, blockId: string, patch: Partial<Omit<AgendaBlock, "id" | "items">>) => void;
  removeBlock: (meetingId: string, blockId: string) => void;
  moveBlock: (meetingId: string, blockId: string, toIndex: number) => void;
  updateDetails: (
    meetingId: string,
    patch: Partial<Pick<Meeting, "location" | "room" | "description" | "type">>,
  ) => void;
  startRun: (meetingId: string) => void;
  /** Rondt de huidige stap af (of stelt hem uit) en gaat naar de volgende. */
  nextStep: (meetingId: string, how?: "done" | "postpone") => void;
  endRun: (meetingId: string) => void;
  dismissWelcome: (meetingId: string) => void;
  markInvited: (meetingId: string) => void;
  markHeld: (meetingId: string) => void;
  startFlow: (flow: FlowId | null, preset: FlowPreset) => void;
  setManualReturn: (route: string | null) => void;
  setBSelection: (ids: string[]) => void;
  followSeries: (ids: string[], preferredId: string) => void;
  addManualMeetingToB: () => string | null;
  updateExtraction: (patch: Partial<BState["extraction"]>) => void;
  updateProposal: (id: string, patch: Partial<Proposal>) => void;
  updateTypedRow: (index: number, patch: Partial<ActionDraft>) => void;
  confirmProposals: () => void;
  assignOwner: (meetingId: string, actionId: string, ownerId: string) => void;
  /** Zet een vergadering klaar (of vervangt ze), bv. de voorbeeldvergadering. */
  putMeeting: (meeting: Meeting) => void;
  removeMeeting: (meetingId: string) => void;
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
  flow: null,
  manualReturn: null,
  b: {
    selection: null,
    targetMeetingId: null,
    extraction: { tab: "plak", text: SAMPLE_NOTES, proposals: null, typed: emptyActionDrafts() },
  },
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
    blocks: defaultBlocks(),
    showWelcome: true,
    invited: false,
    held: false,
    ...extra,
  };
}

function mapItem(m: Meeting, itemId: string, fn: (i: AgendaItem) => AgendaItem): Meeting {
  return {
    ...m,
    blocks: m.blocks.map((b) =>
      b.items.some((i) => i.id === itemId) ? { ...b, items: b.items.map((i) => (i.id === itemId ? fn(i) : i)) } : b,
    ),
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
              actions.push({
                id: uid("a-"),
                what: a.what.trim(),
                ownerId,
                deadline: a.deadline.trim(),
                done: false,
                createdAt: todayISO(),
              });
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
            actions: [...m.actions, { ...action, id: uid("a-"), done: false, createdAt: todayISO() }],
          })),
        addAgendaItem: (meetingId, blockId, text) => {
          const item = newItem(text);
          updateMeeting(meetingId, (m) => ({
            ...m,
            blocks: m.blocks.map((b) => (b.id === blockId ? { ...b, items: [...b.items, item] } : b)),
          }));
          return item.id;
        },
        updateItem: (meetingId, itemId, patch) =>
          updateMeeting(meetingId, (m) => mapItem(m, itemId, (i) => ({ ...i, ...patch }))),
        removeItem: (meetingId, itemId) =>
          updateMeeting(meetingId, (m) => ({
            ...m,
            blocks: m.blocks.map((b) => ({ ...b, items: b.items.filter((i) => i.id !== itemId) })),
          })),
        moveItem: (meetingId, itemId, toBlockId, toIndex) =>
          updateMeeting(meetingId, (m) => {
            const item = allItems(m.blocks).find((i) => i.id === itemId);
            if (!item) return m;
            const without = m.blocks.map((b) => ({ ...b, items: b.items.filter((i) => i.id !== itemId) }));
            return {
              ...m,
              blocks: without.map((b) => {
                if (b.id !== toBlockId) return b;
                const items = [...b.items];
                items.splice(Math.max(0, Math.min(toIndex, items.length)), 0, item);
                return { ...b, items };
              }),
            };
          }),
        addEntry: (meetingId, itemId, input) => {
          const id = uid("e-");
          updateMeeting(meetingId, (m) => {
            const entry = { ...input, authorId: USER_PERSON_ID, createdAt: Date.now() };
            if (entry.kind !== "action") {
              return mapItem(m, itemId, (i) => ({ ...i, entries: [...i.entries, { ...entry, id }] }));
            }
            // Een actie komt ook in "Openstaande acties", tot ze af is.
            const action: Action = {
              id: uid("a-"),
              what: entry.text,
              ownerId: entry.ownerId,
              deadline: entry.date,
              done: false,
              createdAt: todayISO(),
            };
            const next = mapItem(m, itemId, (i) => ({
              ...i,
              entries: [...i.entries, { ...entry, id, actionId: action.id }],
            }));
            return { ...next, actions: [...next.actions, action] };
          });
          return id;
        },
        updateEntry: (meetingId, itemId, entryId, patch) =>
          updateMeeting(meetingId, (m) => {
            const entry = allItems(m.blocks)
              .find((i) => i.id === itemId)
              ?.entries.find((e) => e.id === entryId);
            const next = mapItem(m, itemId, (i) => ({
              ...i,
              entries: i.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
            }));
            if (!entry?.actionId) return next;
            // De actie in "Openstaande acties" volgt mee.
            return {
              ...next,
              actions: next.actions.map((a) =>
                a.id === entry.actionId
                  ? {
                      ...a,
                      what: patch.text ?? a.what,
                      ownerId: patch.ownerId !== undefined ? patch.ownerId : a.ownerId,
                      deadline: patch.date ?? a.deadline,
                    }
                  : a,
              ),
            };
          }),
        removeEntry: (meetingId, itemId, entryId) =>
          updateMeeting(meetingId, (m) => {
            const entry = allItems(m.blocks)
              .find((i) => i.id === itemId)
              ?.entries.find((e) => e.id === entryId);
            const next = mapItem(m, itemId, (i) => ({ ...i, entries: i.entries.filter((e) => e.id !== entryId) }));
            return entry?.actionId ? { ...next, actions: next.actions.filter((a) => a.id !== entry.actionId) } : next;
          }),
        addBlock: (meetingId, kind) => {
          const block = newBlock(kind);
          updateMeeting(meetingId, (m) => ({
            ...m,
            // "Openstaande acties" staat altijd vooraan.
            blocks: kind === "actions" ? [block, ...m.blocks] : [...m.blocks, block],
          }));
          return block.id;
        },
        updateBlock: (meetingId, blockId, patch) =>
          updateMeeting(meetingId, (m) => ({
            ...m,
            blocks: m.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
          })),
        removeBlock: (meetingId, blockId) =>
          updateMeeting(meetingId, (m) => ({ ...m, blocks: m.blocks.filter((b) => b.id !== blockId) })),
        moveBlock: (meetingId, blockId, toIndex) =>
          updateMeeting(meetingId, (m) => {
            const block = m.blocks.find((b) => b.id === blockId);
            if (!block) return m;
            const blocks = m.blocks.filter((b) => b.id !== blockId);
            blocks.splice(Math.max(0, Math.min(toIndex, blocks.length)), 0, block);
            return { ...m, blocks };
          }),
        updateDetails: (meetingId, patch) => updateMeeting(meetingId, (m) => ({ ...m, ...patch })),

        startRun: (meetingId) =>
          updateMeeting(meetingId, (m) => {
            const now = Date.now();
            return {
              ...m,
              showWelcome: false,
              run: {
                startedAt: now,
                stepStartedAt: now,
                currentId: runSteps(m.blocks)[0] ?? null,
                doneIds: [],
                postponedIds: [],
                actuals: {},
              },
            };
          }),
        nextStep: (meetingId, how = "done") =>
          updateMeeting(meetingId, (m) => {
            const run = m.run;
            if (!run?.currentId) return m;
            const now = Date.now();
            const current = run.currentId;
            const handled = new Set([...run.doneIds, ...run.postponedIds, current]);
            const steps = runSteps(m.blocks);
            const from = steps.indexOf(current);
            const next = [...steps.slice(from + 1), ...steps.slice(0, from)].find((id) => !handled.has(id)) ?? null;
            return {
              ...m,
              run: {
                ...run,
                stepStartedAt: now,
                currentId: next,
                doneIds: how === "done" ? [...run.doneIds, current] : run.doneIds,
                postponedIds: how === "postpone" ? [...run.postponedIds, current] : run.postponedIds,
                actuals: how === "done" ? { ...run.actuals, [current]: (now - run.stepStartedAt) / 1000 } : run.actuals,
              },
            };
          }),
        endRun: (meetingId) =>
          updateMeeting(meetingId, (m) => ({
            ...m,
            held: true,
            run: null,
            // Afgevinkte acties zijn af; de rest komt vanzelf terug.
            actions: m.actions.filter((a) => !a.done),
            // Afgeronde agendapunten verdwijnen; wat uitgesteld werd, blijft staan.
            blocks: m.blocks.map((b) => ({
              ...b,
              items: b.items.filter((i) => !m.run?.doneIds.includes(i.id)),
            })),
          })),
        dismissWelcome: (meetingId) => updateMeeting(meetingId, (m) => ({ ...m, showWelcome: false })),
        markInvited: (meetingId) => updateMeeting(meetingId, (m) => ({ ...m, invited: true })),
        markHeld: (meetingId) => updateMeeting(meetingId, (m) => ({ ...m, held: true })),

        startFlow: (flow, preset) => {
          const base = initialData();
          set({
            ...base,
            flow,
            demo: { ...base.demo, ...preset.demo },
            user: preset.signedIn ? { ...MOCK_USER, method: "microsoft" } : null,
          });
        },
        setManualReturn: (manualReturn) => set({ manualReturn }),

        setBSelection: (selection) => set((s) => ({ b: { ...s.b, selection } })),

        followSeries: (ids, preferredId) => {
          const s = get();
          // Overleggen uit B die niet meer aangevinkt zijn en nog leeg zijn, vallen weg.
          let meetings = s.meetings.filter(
            (m) =>
              m.origin !== "b" ||
              !m.seriesId ||
              ids.includes(m.seriesId) ||
              m.actions.length > 0 ||
              allItems(m.blocks).length > 0,
          );
          for (const sid of ids) {
            if (meetings.some((m) => m.seriesId === sid)) continue;
            const series = SERIES.find((x) => x.id === sid);
            if (!series) continue;
            const id = uniqueId(series.name, meetings);
            meetings = [
              ...meetings,
              newMeeting(seriesSchedule(series), id, {
                seriesId: sid,
                participants: series.participants,
                origin: "b",
                showWelcome: false,
              }),
            ];
          }
          const targetSeries = ids.includes(preferredId) ? preferredId : ids[0];
          const target = meetings.find((m) => m.seriesId === targetSeries);
          set({ meetings, b: { ...s.b, selection: ids, targetMeetingId: target?.id ?? null }, calendar: "series" });
        },

        addManualMeetingToB: () => {
          const s = get();
          const draft = s.manualDraft;
          if (!draft?.name.trim()) return null;
          const id = uniqueId(draft.name, s.meetings);
          const meeting = newMeeting({ ...draft, name: draft.name.trim() }, id, {
            participants: draft.participants,
            origin: "b",
            showWelcome: false,
          });
          set({
            meetings: [...s.meetings, meeting],
            b: { ...s.b, targetMeetingId: s.b.targetMeetingId ?? id },
            manualReturn: null,
          });
          return id;
        },

        updateExtraction: (patch) => set((s) => ({ b: { ...s.b, extraction: { ...s.b.extraction, ...patch } } })),
        updateProposal: (id, patch) =>
          set((s) => ({
            b: {
              ...s.b,
              extraction: {
                ...s.b.extraction,
                proposals: (s.b.extraction.proposals ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
              },
            },
          })),
        updateTypedRow: (index, patch) =>
          set((s) => ({
            b: {
              ...s.b,
              extraction: {
                ...s.b.extraction,
                typed: s.b.extraction.typed.map((r, i) => (i === index ? { ...r, ...patch } : r)),
              },
            },
          })),

        confirmProposals: () => {
          const s = get();
          const targetId = s.b.targetMeetingId;
          if (!targetId) return;
          const { proposals, typed } = s.b.extraction;
          const actions: Action[] = [];
          const items: AgendaItem[] = [];
          const toAction = (what: string, ownerId: string | null, deadline: string): Action => ({
            id: uid("a-"),
            what,
            ownerId,
            deadline,
            done: false,
            mailed: !!ownerId && ownerId !== USER_PERSON_ID,
            createdAt: todayISO(),
          });
          for (const p of (proposals ?? []).filter((x) => x.checked && x.text.trim())) {
            if (p.kind === "agenda") items.push(newItem(p.text.trim(), { purposes: ["decide"] }));
            else actions.push(toAction(p.text.trim(), p.ownerId, p.date ? formatShortDate(p.date) : ""));
          }
          for (const r of typed.filter((x) => x.what.trim())) {
            let ownerId = r.ownerId;
            if (!ownerId && r.ownerText.trim()) ownerId = get().addPerson(r.ownerText).id;
            actions.push(toAction(r.what.trim(), ownerId, r.deadline.trim()));
          }
          updateMeeting(targetId, (m) => {
            // Agendapunten uit de notities komen in het eerste blok met agendapunten.
            const target = m.blocks.find((b) => b.kind === "topics");
            return {
              ...m,
              actions: [...m.actions, ...actions],
              blocks: m.blocks.map((b) => (b === target ? { ...b, items: [...b.items, ...items] } : b)),
            };
          });
          set((st) => ({
            b: {
              ...st.b,
              extraction: { ...st.b.extraction, text: SAMPLE_NOTES, proposals: null, typed: emptyActionDrafts() },
            },
          }));
        },

        assignOwner: (meetingId, actionId, ownerId) =>
          updateMeeting(meetingId, (m) => ({
            ...m,
            actions: m.actions.map((a) =>
              a.id === actionId ? { ...a, ownerId, mailed: ownerId !== USER_PERSON_ID } : a,
            ),
          })),

        putMeeting: (meeting) =>
          set((s) => ({
            meetings: s.meetings.some((m) => m.id === meeting.id)
              ? s.meetings.map((m) => (m.id === meeting.id ? meeting : m))
              : [...s.meetings, meeting],
          })),
        removeMeeting: (meetingId) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== meetingId) })),
      };
    },
    {
      name: STORAGE_KEY,
      version: 4,
      // Oudere opgeslagen state mist velden (flows, variant B, agendablokken): begin opnieuw.
      migrate: () => initialData(),
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
      // De voorbeeldvergadering leeft enkel zolang /voorbeeld open is.
      partialize: (s) => ({ ...s, meetings: s.meetings.filter((m) => !m.example) }),
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
