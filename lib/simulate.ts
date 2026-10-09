"use client";

/**
 * Gesimuleerde externe stappen (SPEC.md §4). De uitkomst komt uit de demo-balk.
 * Geen echte login, Microsoft Graph of Google API.
 */
import { useCallback, useState } from "react";
import { MOCK_USER } from "@/lib/mock-data";
import { useStore, type CalendarOutcome, type LoginOutcome } from "@/lib/store";

export const SIMULATION_DELAY = 900;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "Doorgaan met Microsoft/Google": slaagt of wordt geblokkeerd door het bedrijf. */
export function useSsoLogin() {
  const [pending, setPending] = useState<"microsoft" | "google" | null>(null);

  const start = useCallback(async (provider: "microsoft" | "google"): Promise<LoginOutcome> => {
    setPending(provider);
    await wait(SIMULATION_DELAY);
    const { demo, signIn } = useStore.getState();
    // Het bedrijfsbeleid uit de demo-balk geldt enkel voor Microsoft.
    const outcome: LoginOutcome = provider === "microsoft" ? demo.login : "success";
    if (outcome === "success") signIn({ ...MOCK_USER, method: provider });
    setPending(null);
    return outcome;
  }, []);

  return { start, pending };
}

/** "Connecteer Outlook en kies een meeting" / "Koppel Outlook": agendatoestemming. */
export function useCalendarConsent() {
  const [pending, setPending] = useState(false);

  const connect = useCallback(async (): Promise<CalendarOutcome> => {
    setPending(true);
    await wait(SIMULATION_DELAY);
    const { demo, setCalendar, setCalendarNotice } = useStore.getState();
    const outcome = demo.calendar;
    if (outcome === "series") setCalendar("series");
    else if (outcome === "none") setCalendar("none");
    else if (outcome === "cancelled") setCalendarNotice("cancelled");
    setPending(false);
    return outcome;
  }, []);

  return { connect, pending };
}

/** Gesimuleerde verzending (uitleg voor IT, uitnodigingen). */
export async function simulateSend(): Promise<void> {
  await wait(600);
}
