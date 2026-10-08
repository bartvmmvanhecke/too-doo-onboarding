"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { OwnerOption } from "@/components/onboarding/owner-combobox";
import type { Person } from "@/lib/mock-data";
import type { Meeting } from "@/lib/store";

export interface MeetingCtx {
  meeting: Meeting;
  people: Person[];
  owners: OwnerOption[];
  /** Huidige tijd (ms); tikt elke seconde zolang de vergadering bezig is. */
  now: number;
}

const Ctx = createContext<MeetingCtx | null>(null);

export const MeetingProvider = Ctx.Provider;

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
