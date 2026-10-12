"use client";

/**
 * Gast-state van Variant A · Lazy Registration (SPEC-LAZY.md §2): de proefomgeving zonder account.
 * Apart van de app-store, bewaard in localStorage onder "toodoo-guest", geldig 7 dagen.
 * Bij bewaren gaat alles over naar de app-store (lib/guest-transfer.ts).
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { respond } from "@/lib/assistant/engine";
import type {
  AssistantInput,
  AssistantState,
  CalendarProvider,
  GuestAction,
  GuestDecision,
  GuestMeeting,
  GuestPerson,
  GuestTopic,
  Message,
} from "@/lib/assistant/types";
import { emptyMeeting } from "@/lib/assistant/engine";
import { guestPerson } from "@/lib/assistant/people";
import { track } from "@/lib/track";
import { uid } from "@/lib/utils";

export const GUEST_STORAGE_KEY = "toodoo-guest";
export const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Stap 1: één openingsbericht, welkom en startvraag samen (SPEC-LAZY.md §4). */
export const WELCOME_MESSAGES: Omit<Message, "id">[] = [
  { from: "assistant", text: "Je eerste overleg staat in twee minuten klaar. **Waarmee wil je starten?**" },
];

/** Typ-indicator voor elk antwoord (600–900 ms). */
export const TYPING_DELAY = 750;

/** Na "Uit mijn agenda": koppelen = inloggen (SPEC-LAZY.md §4). */
export interface GuestAccount {
  provider: CalendarProvider;
  firstName: string;
  lastName: string;
  email: string;
}

interface GuestData extends AssistantState {
  guestId: string;
  createdAt: number;
  conversation: Message[];
  account: GuestAccount | null;
}

/** Enkel in het geheugen, nooit bewaard: een antwoord dat onderweg is en wat het hoofdvlak markeert. */
interface GuestUi {
  typing: boolean;
  /** Velden die net ingevuld werden (2 s blauwe markering); `flashAt` maakt elke markering uniek. */
  flash: string[];
  flashAt: number;
  /** Telt op bij "Iets aanpassen": de velden gaan in bewerkmodus. */
  editRequest: number;
}

interface GuestActions {
  /**
   * Stuurt iets naar de assistent: één antwoord, na de typ-indicator. Zolang er een antwoord onderweg is,
   * wordt een tweede invoer genegeerd. De timer leeft buiten React, zodat een component die verborgen
   * (Activity) of dubbel gemonteerd (Strict Mode) wordt het antwoord niet kan verliezen of verdubbelen.
   */
  dispatch: (input: AssistantInput, userText?: string) => boolean;
  setAccount: (account: GuestAccount | null) => void;
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

export type GuestStore = GuestData & GuestUi & GuestActions;

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
    account: null,
  };
}

const initialUi = (): GuestUi => ({ typing: false, flash: [], flashAt: 0, editRequest: 0 });

/** Het antwoord dat onderweg is (één tegelijk). */
let replyTimer: ReturnType<typeof setTimeout> | null = null;

function assistantState(s: AssistantState): AssistantState {
  return {
    step: s.step,
    entry: s.entry,
    pending: s.pending,
    meeting: s.meeting,
    actions: s.actions,
    decisions: s.decisions,
    others: s.others,
  };
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
        ...initialUi(),

        dispatch: (input, userText) => {
          if (get().typing) return false;
          if (userText)
            set((s) => ({ conversation: [...s.conversation, ...withIds([{ from: "user", text: userText }])] }));
          if (input.type === "text")
            track("assistant_message_sent", { stap: String(get().step), lengte: input.text.length });
          set({ typing: true });
          replyTimer = setTimeout(() => {
            replyTimer = null;
            const s = get();
            const reply = respond(assistantState(s), input);
            set({
              ...reply.state,
              conversation: [...s.conversation, ...withIds(reply.messages)],
              typing: false,
              ...(reply.flash.length ? { flash: reply.flash, flashAt: Date.now() } : {}),
              editRequest: reply.edit ? s.editRequest + 1 : s.editRequest,
            });
            for (const [event, props] of reply.events) track(event, props);
          }, TYPING_DELAY);
          return true;
        },
        setAccount: (account) => set({ account }),
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
        reset: () => {
          if (replyTimer) clearTimeout(replyTimer);
          replyTimer = null;
          set({ ...initialGuest(), ...initialUi() });
        },
      };
    },
    {
      name: GUEST_STORAGE_KEY,
      // Versie 2: nieuwe ingangen (agenda, bestand). Oudere state begint opnieuw.
      version: 2,
      migrate: () => initialGuest(),
      // Wat enkel in het geheugen hoort (antwoord onderweg, markering), wordt nooit bewaard.
      partialize: (s) => {
        const { typing, flash, flashAt, editRequest, ...rest } = s;
        void [typing, flash, flashAt, editRequest];
        return rest;
      },
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
