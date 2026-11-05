"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useStore } from "../store";
import { CHIME_DEFAULT_ON } from "../meetingWrapUp.config";
import { playChime } from "./chime";

// TODO(api): store the per-user preference in the user's account settings.
export const useChimePreferences = create<{ users: Record<string, boolean> }>()(
  persist(() => ({ users: {} }), {
    name: "too-doo-chime-preferences",
    storage: createJSONStorage(() =>
      typeof localStorage === "undefined"
        ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
        : localStorage,
    ),
  }),
);
export const useAudioRuntime = create<{ running: boolean }>(() => ({ running: false }));
let context: AudioContext | null = null;
export const chimeUserKey = () => useStore.getState().user?.email.toLowerCase() ?? "guest";
export const chimeEnabled = () => useChimePreferences.getState().users[chimeUserKey()] ?? CHIME_DEFAULT_ON;
export function setChimeEnabled(enabled: boolean) {
  const key = chimeUserKey();
  useChimePreferences.setState((s) => ({ users: { ...s.users, [key]: enabled } }));
}
export const getChimeContext = () => context;
/** Must be called directly during a user gesture. Failing audio never blocks a meeting. */
export async function unlockChime() {
  try {
    if (!context) {
      context = new AudioContext();
      context.addEventListener("statechange", () =>
        useAudioRuntime.setState({ running: context?.state === "running" }),
      );
    }
    await context.resume();
    useAudioRuntime.setState({ running: context.state === "running" });
    return context;
  } catch {
    useAudioRuntime.setState({ running: false });
    return null;
  }
}
export async function toggleChime() {
  const enabled = chimeEnabled();
  const blocked = enabled && context?.state !== "running";
  const unlocked = unlockChime();
  if (blocked) {
    await unlocked;
    return;
  }
  setChimeEnabled(!enabled);
  if (!enabled) {
    const ctx = await unlocked;
    if (ctx?.state === "running") playChime(ctx, ctx.currentTime);
  }
}
