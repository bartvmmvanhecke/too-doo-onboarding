"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { OwnerOption } from "@/components/onboarding/owner-combobox";
import type { Person } from "@/lib/mock-data";
import { useStore, type Meeting, type Store } from "@/lib/store";

/**
 * Variant A (SPEC-LAZY.md §3): het overleg in opbouw in de proefomgeving, in de vorm van dit detailscherm.
 * Zonder `trial` ziet het detailscherm er uit zoals altijd.
 */
export interface TrialView {
  /** Statuslabel boven de titel. */
  status: "Concept" | "Gepland";
  /** "uit Outlook" naast het statuslabel. */
  source: string | null;
  /** Nog niets ingevuld (C1): titel en datumregel gedempt, blokken gestippeld. */
  empty: boolean;
  /** Wat de assistent net invulde, licht 2 s op: "name", "when", "participants", "topics", "actions". */
  flash: Set<string>;
  /** Agendapunten die nog een voorstel zijn (label "voorstel"). */
  proposedBlockIds: Set<string>;
  /** Stap 2: de acties zijn voorstellen ("vink aan wat klopt"). */
  confirming: boolean;
  /** "Start overleg" pas na stap 3. */
  canStart: boolean;
  /** Datumregel, of null als ze nog leeg is ("Wanneer?"). */
  scheduleText: string | null;
  /** Telt op bij "Iets aanpassen": de titel gaat in bewerkmodus. */
  editRequest: number;
  onRename: (name: string) => void;
  /** Inhoud van de popovers achter de datumregel en de avatars. */
  scheduleEditor: ReactNode;
  participantsEditor: ReactNode;
  /** Inhoud van een leeg blok "Openstaande acties" (uitleg, bestand kiezen). */
  emptyActions: ReactNode;
  /** Een bestand slepen op het blok "Openstaande acties". */
  onFileDrop: ((file: File) => void) | null;
  /** De ene inline regel "+ Agendapunt". */
  onAddAgendaItem: (text: string) => void;
  /** "Uit agenda halen" / "Deelnemers uit agenda" in de datumregel, zolang dat veld leeg is (C1). */
  onFromCalendar: ((field: "when" | "participants") => void) | null;
}

export interface MeetingCtx {
  meeting: Meeting;
  people: Person[];
  owners: OwnerOption[];
  /** Huidige tijd (ms); tikt elke seconde zolang de vergadering bezig is. */
  now: number;
  trial?: TrialView;
}

const Ctx = createContext<MeetingCtx | null>(null);

export const MeetingProvider = Ctx.Provider;

/** Wat het detailscherm aan een overleg kan wijzigen; standaard rechtstreeks in de app-store. */
export type MeetingOps = Pick<
  Store,
  | "updateItem"
  | "removeItem"
  | "moveItem"
  | "addAgendaItem"
  | "addEntry"
  | "updateEntry"
  | "removeEntry"
  | "addBlock"
  | "updateBlock"
  | "removeBlock"
  | "moveBlock"
  | "updateDetails"
  | "startRun"
  | "nextStep"
  | "endRun"
  | "toggleAction"
  | "assignOwner"
  | "addAction"
  | "markInvited"
  | "putMeeting"
>;

const OpsCtx = createContext<MeetingOps | null>(null);

/** Andere opslag voor het overleg (Variant A: de gast-state). Zonder provider: de app-store. */
export const MeetingOpsProvider = OpsCtx.Provider;

export function useMeetingOps(): MeetingOps {
  return useContext(OpsCtx) ?? useStore.getState();
}

export function useMeeting(): MeetingCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMeeting buiten MeetingProvider");
  return ctx;
}

/** Klok voor de timers van een lopende vergadering. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [active]);
  return now;
}
