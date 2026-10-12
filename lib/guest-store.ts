"use client";

/**
 * Gast-state van Variant A · Lazy Registration (SPEC-LAZY.md §2): de proefomgeving zonder account.
 * Apart van de app-store, bewaard in localStorage onder "toodoo-guest", geldig 7 dagen.
 * Bij bewaren gaat alles over naar de app-store (lib/guest-transfer.ts).
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type {
  AssistantState,
  GuestAction,
  GuestDecision,
  GuestMeeting,
  GuestPerson,
  GuestTopic,
  Message,
} from "@/lib/assistant/types";
import { AVATAR_COLORS } from "@/lib/mock-data";
import { createPerson } from "@/lib/people";
import { uid } from "@/lib/utils";

export const GUEST_STORAGE_KEY = "toodoo-guest";
export const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  };
}

export const WELCOME_MESSAGES: Omit<Message, "id">[] = [
  {
    from: "assistant",
    text: "Welkom. In twee minuten staat je eerste overleg klaar, met de acties die nog openstaan. Je hoeft niets aan te maken of te koppelen.",
  },
  { from: "assistant", text: "**Hoe wil je starten?**" },
];

interface GuestData extends AssistantState {
  guestId: string;
  createdAt: number;
  conversation: Message[];
}

interface GuestActions {
  /** Neemt het antwoord van de assistent over. */
  applyReply: (state: AssistantState, messages: Omit<Message, "id">[]) => void;
  addMessages: (messages: Omit<Message, "id">[]) => void;
  updateMeeting: (patch: Partial<GuestMeeting>) => void;
  addParticipant: (name: string) => GuestPerson;
  removeParticipant: (id: string) => void;
  updateTopic: (id: string, text: string) => void;
  addTopic: (text: string) => void;
  removeTopic: (id: string) => void;
  updateAction: (id: string, patch: Partial<GuestAction>) => void;
  addAction: (text: string) => void;
  removeAction: (id: string) => void;
  updateDecision: (id: string, patch: Partial<GuestDecision>) => void;
  reset: () => void;
}

export type GuestStore = GuestData & GuestActions;

const withIds = (messages: Omit<Message, "id">[]): Message[] => messages.map((m) => ({ ...m, id: uid("m-") }));

export function initialGuest(): GuestData {
  return {
    guestId: uid("g-"),
    createdAt: Date.now(),
    step: 1,
    entry: null,
    pending: { kind: "entry" },
    meeting: emptyMeeting(),
    actions: [],
    decisions: [],
    others: [],
    conversation: withIds(WELCOME_MESSAGES),
  };
}

/** Nieuwe deelnemer met enkel de naam zoals de gebruiker hem zei. */
export function guestPerson(name: string, index: number): GuestPerson {
  const p = createPerson(name, index);
  return { id: p.id, name: p.name, initials: p.initials, color: AVATAR_COLORS[index % AVATAR_COLORS.length] };
}

/** Ouder dan 7 dagen: leeg starten. */
export function isExpired(createdAt: number | undefined, now = Date.now()): boolean {
  return !createdAt || now - createdAt > GUEST_TTL_MS;
}

const noopStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useGuestStore = create<GuestStore>()(
  persist(
    (set, get) => {
      const meeting = (patch: Partial<GuestMeeting>) => set((s) => ({ meeting: { ...s.meeting, ...patch } }));
      return {
        ...initialGuest(),

        applyReply: (state, messages) =>
          set((s) => ({ ...state, conversation: [...s.conversation, ...withIds(messages)] })),
        addMessages: (messages) => set((s) => ({ conversation: [...s.conversation, ...withIds(messages)] })),
        updateMeeting: meeting,
        addParticipant: (name) => {
          const s = get();
          const existing = s.meeting.participants.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
          if (existing) return existing;
          const person = guestPerson(name.trim(), s.meeting.participants.length);
          meeting({ participants: [...s.meeting.participants, person] });
          return person;
        },
        removeParticipant: (id) =>
          set((s) => ({
            meeting: { ...s.meeting, participants: s.meeting.participants.filter((p) => p.id !== id) },
            actions: s.actions.map((a) => (a.ownerId === id ? { ...a, ownerId: null } : a)),
          })),
        updateTopic: (id, text) =>
          meeting({ topics: get().meeting.topics.map((t) => (t.id === id ? { ...t, text } : t)) }),
        addTopic: (text) =>
          meeting({ topics: [...get().meeting.topics, { id: uid("t-"), text } satisfies GuestTopic] }),
        removeTopic: (id) => meeting({ topics: get().meeting.topics.filter((t) => t.id !== id) }),
        updateAction: (id, patch) =>
          set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
        addAction: (text) =>
          set((s) => ({
            actions: [
              ...s.actions,
              { id: uid("a-"), text, ownerId: null, deadline: null, confirmed: true, ownerLater: false },
            ],
          })),
        removeAction: (id) => set((s) => ({ actions: s.actions.filter((a) => a.id !== id) })),
        updateDecision: (id, patch) =>
          set((s) => ({ decisions: s.decisions.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
        reset: () => set(initialGuest()),
      };
    },
    {
      name: GUEST_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
      // Ouder dan 7 dagen (of onleesbaar): leeg starten.
      merge: (persisted, current) => {
        const p = persisted as Partial<GuestData> | undefined;
        if (!p || isExpired(p.createdAt)) return current;
        return { ...current, ...p };
      },
    },
  ),
);

/** Wist de proefomgeving op dit toestel. */
export function clearGuest() {
  useGuestStore.getState().reset();
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // localStorage niet beschikbaar: de state in het geheugen is al leeg.
  }
}

/** Heeft de gast al iets gedaan (meer dan het welkomstbericht)? */
export function hasGuestWork(s: Pick<GuestData, "conversation">): boolean {
  return s.conversation.some((m) => m.from === "user");
}
