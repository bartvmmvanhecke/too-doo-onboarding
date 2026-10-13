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
  GuestItem,
  GuestItemMeta,
  GuestMeeting,
  GuestPerson,
  GuestTopic,
  Message,
} from "@/lib/assistant/types";
import { emptyMeeting } from "@/lib/assistant/engine";
import { guestPerson } from "@/lib/assistant/people";
import { addGuestItem, moveGuestItem, removeGuestItem, setGuestPresenter, updateGuestItem } from "@/lib/trial-meeting";
import { track } from "@/lib/track";
import { uid } from "@/lib/utils";

export const GUEST_STORAGE_KEY = "toodoo-guest";
export const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Stap 0: het welkomstscherm toont kop en keuzes; na een keuze blijft dit het eerste bericht van het
 * gesprek (SPEC-LAZY.md §4, C0g).
 */
export const WELCOME_MESSAGES: Omit<Message, "id">[] = [
  { from: "assistant", text: "**Welkom bij Too-doo.** Laten we je eerste overleg klaarzetten." },
];

/** Hoe de gast startte op het welkomstscherm. */
export type StartPath = "tell" | "notes" | "agenda" | "empty";

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
  reviewVersion?: 1;
  guestId: string;
  createdAt: number;
  conversation: Message[];
  account: GuestAccount | null;
  startPath: StartPath | null;
  /** De overgang van welkom naar app speelde al (één keer per gast); daarna meteen de app. */
  transitionPlayed: boolean;
  /** Het assistentpaneel staat open; gesloten = de zwevende knop "Assistent" rechtsonder (C1g). */
  assistantOpen: boolean;
  /** De tooltip boven de zwevende knop werd al getoond (één keer). */
  closedHintShown: boolean;
}

/** Enkel in het geheugen, nooit bewaard: een antwoord dat onderweg is en wat het hoofdvlak markeert. */
interface GuestUi {
  typing: boolean;
  /** Velden die net ingevuld werden (2 s blauwe markering); `flashAt` maakt elke markering uniek. */
  flash: string[];
  flashAt: number;
  /** Telt op bij "Iets aanpassen": de velden gaan in bewerkmodus. */
  editRequest: number;
  /** Waar in het gesprek het laatste antwoord van de assistent begint. */
  replyFrom: number;
  /** "ik doe het zelf" / "toon een voorbeeld" in de chat: het scherm voert het uit (met `at` uniek). */
  uiRequest: { kind: "close" | "example"; at: number } | null;
}

interface GuestActions {
  /**
   * Stuurt iets naar de assistent: één antwoord, na de typ-indicator. Zolang er een antwoord onderweg is,
   * wordt een tweede invoer genegeerd. De timer leeft buiten React, zodat een component die verborgen
   * (Activity) of dubbel gemonteerd (Strict Mode) wordt het antwoord niet kan verliezen of verdubbelen.
   */
  dispatch: (input: AssistantInput, userText?: string, opts?: { applyNow?: boolean }) => boolean;
  setAccount: (account: GuestAccount | null) => void;
  setStartPath: (path: StartPath) => void;
  setTransitionPlayed: () => void;
  /** "Start met een lege meeting" (C1d): meteen, zonder typ-indicator; het gesprek begint opnieuw. */
  startEmpty: () => void;
  addMessages: (messages: Omit<Message, "id">[]) => void;
  updateMeeting: (patch: Partial<GuestMeeting>) => void;
  addParticipant: (name: string) => GuestPerson;
  removeParticipant: (id: string) => void;
  updateTopic: (id: string, text: string) => void;
  addTopic: (text: string) => void;
  removeTopic: (id: string) => void;
  /** Verplaatst een agendapunt naar een andere plaats in de lijst. */
  moveTopic: (id: string, index: number) => void;
  /** Agendapunten onder een thema (ook "Lopende zaken" en "Varia"). */
  addItem: (blockId: string, text: string) => void;
  updateItem: (id: string, patch: Partial<Pick<GuestItem, "text"> & GuestItemMeta>) => void;
  setPresenter: (blockId: string, presenterId: string | null) => void;
  removeItem: (id: string) => void;
  moveItem: (id: string, blockId: string, index: number) => void;
  setAssistantOpen: (open: boolean) => void;
  /** De gebruiker typt in het chatveld: de doelchips verdwijnen (C0j–C0m). */
  hideGoalChips: () => void;
  setClosedHintShown: () => void;
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
    reviewVersion: 1,
    guestId: uid("g-"),
    createdAt: Date.now(),
    step: 1,
    entry: null,
    pending: { kind: "entry" },
    meeting: emptyMeeting(),
    actions: [],
    decisions: [],
    others: [],
    notesReminderShown: false,
    goalChips: false,
    conversation: withIds(WELCOME_MESSAGES),
    account: null,
    startPath: null,
    transitionPlayed: false,
    assistantOpen: true,
    closedHintShown: false,
  };
}

const initialUi = (): GuestUi => ({
  typing: false,
  flash: [],
  flashAt: 0,
  editRequest: 0,
  replyFrom: 0,
  uiRequest: null,
});

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
    notesReminderShown: !!s.notesReminderShown,
    goalChips: !!s.goalChips,
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
      // Wat de gebruiker links zelf bewerkt, laat de doelchips verdwijnen (C0j–C0m).
      const meeting = (patch: Partial<GuestMeeting>) =>
        set((s) => ({ meeting: { ...s.meeting, ...patch }, goalChips: false }));
      return {
        ...initialGuest(),
        ...initialUi(),

        dispatch: (input, userText, opts) => {
          if (get().typing) return false;
          if (userText)
            set((s) => ({ conversation: [...s.conversation, ...withIds([{ from: "user", text: userText }])] }));
          if (input.type === "text")
            track("assistant_message_sent", { stap: String(get().step), lengte: input.text.length });
          // `applyNow` (een doelchip, C0j–C0m): links verandert meteen; enkel het bericht wacht op de typ-indicator.
          const early = opts?.applyNow ? respond(assistantState(get()), input) : null;
          if (early)
            set({
              ...early.state,
              ...(early.flash.length ? { flash: early.flash, flashAt: Date.now() } : {}),
            });
          set({ typing: true });
          replyTimer = setTimeout(() => {
            replyTimer = null;
            const s = get();
            const reply = early ?? respond(assistantState(s), input);
            set({
              ...(early ? {} : reply.state),
              replyFrom: s.conversation.length,
              conversation: [...s.conversation, ...withIds(reply.messages)],
              typing: false,
              ...(!early && reply.flash.length ? { flash: reply.flash, flashAt: Date.now() } : {}),
              editRequest: reply.edit ? s.editRequest + 1 : s.editRequest,
              ...(reply.ui ? { uiRequest: { kind: reply.ui, at: Date.now() } } : {}),
            });
            for (const [event, props] of reply.events) track(event, props);
          }, TYPING_DELAY);
          return true;
        },
        setAccount: (account) => set({ account }),
        setStartPath: (startPath) => set({ startPath }),
        setTransitionPlayed: () => set({ transitionPlayed: true }),
        startEmpty: () => {
          const reply = respond(assistantState(get()), { type: "start-empty" });
          set({
            ...reply.state,
            startPath: "empty",
            transitionPlayed: true,
            // C1d: de assistent start gesloten, als zwevende knop rechtsonder.
            assistantOpen: false,
            conversation: withIds(reply.messages),
            replyFrom: 0,
          });
        },
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
        addItem: (blockId, text) => meeting(addGuestItem(get().meeting, blockId, text)),
        updateItem: (id, patch) => meeting(updateGuestItem(get().meeting, id, patch)),
        setPresenter: (blockId, presenterId) => meeting(setGuestPresenter(get().meeting, blockId, presenterId)),
        removeItem: (id) => meeting(removeGuestItem(get().meeting, id)),
        moveItem: (id, blockId, index) => set((s) => ({ ...moveGuestItem(s, id, blockId, index), goalChips: false })),
        setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
        hideGoalChips: () => {
          if (get().goalChips) set({ goalChips: false });
        },
        setClosedHintShown: () => set({ closedHintShown: true }),
        moveTopic: (id, index) => {
          const topics = get().meeting.topics;
          const topic = topics.find((t) => t.id === id);
          if (!topic) return;
          const rest = topics.filter((t) => t.id !== id);
          rest.splice(Math.max(0, Math.min(index, rest.length)), 0, topic);
          meeting({ topics: rest });
        },
        updateAction: (id, patch) =>
          set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)), goalChips: false })),
        addAction: (text) =>
          set((s) => ({
            goalChips: false,
            actions: [
              ...s.actions,
              { id: uid("a-"), text, ownerId: null, deadline: null, confirmed: true, ownerLater: false },
            ],
          })),
        removeAction: (id) => set((s) => ({ actions: s.actions.filter((a) => a.id !== id), goalChips: false })),
        updateDecision: (id, patch) =>
          set((s) => ({ decisions: s.decisions.map((d) => (d.id === id ? { ...d, ...patch } : d)), goalChips: false })),
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
        const { typing, flash, flashAt, editRequest, replyFrom, uiRequest, ...rest } = s;
        void [typing, flash, flashAt, editRequest, replyFrom, uiRequest];
        return rest;
      },
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.localStorage)),
      // Ouder dan 7 dagen (of onleesbaar): leeg starten.
      merge: (persisted, current) => {
        const p = persisted as Partial<GuestData> | undefined;
        if (!p || isExpired(p.createdAt)) return current;
        // Van vóór het welkomstscherm: wie al bezig was, ziet het niet meer.
        const legacy =
          p.transitionPlayed === undefined && !!p.conversation && hasGuestWork({ conversation: p.conversation });
        return {
          ...current,
          ...p,
          actions: (p.actions ?? []).map((a) =>
            p.reviewVersion === undefined && p.step === 2 && !a.reviewStatus
              ? { ...a, confirmed: false, reviewStatus: "open" as const }
              : a,
          ),
          ...(legacy ? { transitionPlayed: true } : {}),
        };
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
