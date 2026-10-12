"use client";

import { CALENDAR_USER } from "@/lib/assistant/calendar";
import type { CalendarProvider } from "@/lib/assistant/types";
import { useGuestStore } from "@/lib/guest-store";
import { bundleToMeeting, guestBundles, guestPeople } from "@/lib/guest-transfer";
import { useStore, type SaveIntent, type User } from "@/lib/store";
import { track } from "@/lib/track";

/** Wie inlogt met Microsoft of Google in Variant A (mock-data). */
export function ssoUser(method: "microsoft" | "google"): User {
  return { ...CALENDAR_USER, method };
}

/**
 * Koppelen = inloggen (SPEC-LAZY.md §4, Stap 1 punt 1): het account bestaat vanaf nu in de app-store.
 * Het bewaar-modal wordt daarna niet meer getoond; bewaren gaat meteen (saveGuestToApp).
 */
export function connectAccount(provider: CalendarProvider) {
  const user = ssoUser(provider === "outlook" ? "microsoft" : "google");
  useStore.getState().signIn(user);
  useGuestStore
    .getState()
    .setAccount({ provider, firstName: user.firstName, lastName: user.lastName, email: user.email });
  track("signup_completed", { methode: user.method, intent: "agenda" });
}

/** Bewaren: de gast-state gaat over naar de app-store. Geeft de id van het eerste overleg terug. */
export function saveGuestToApp(user: User, intent: SaveIntent): string | null {
  const bundles = guestBundles(useGuestStore.getState());
  const ids = useStore.getState().importGuest(user, guestPeople(bundles), bundles.map(bundleToMeeting), intent);
  track("signup_completed", { methode: user.method, intent });
  return ids[0] ?? null;
}
