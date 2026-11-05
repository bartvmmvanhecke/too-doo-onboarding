import { useState } from "react";
import { create } from "zustand";

/**
 * "Rondleiding starten" van buiten de vergadering (Hulp-menu): telt op, de vergadering die open staat start
 * dan de bestaande rondleiding. Een vergadering reageert enkel op aanvragen van na haar eigen start.
 */
const useTourRequest = create<{ at: number }>(() => ({ at: 0 }));

export function requestTour() {
  useTourRequest.setState((s) => ({ at: s.at + 1 }));
}

/** Of er een rondleiding gevraagd werd die nog niet afgehandeld is, en hoe je ze afhandelt. */
export function useRequestedTour(): [requested: boolean, handled: () => void] {
  const at = useTourRequest((s) => s.at);
  const [handledAt, setHandledAt] = useState(() => useTourRequest.getState().at);
  return [at > handledAt, () => setHandledAt(at)];
}
