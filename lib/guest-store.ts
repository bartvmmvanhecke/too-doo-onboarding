"use client";

/** Gast-state van Variant A · Lazy Registration (SPEC-LAZY.md §2), apart van de app-store. */
export const GUEST_STORAGE_KEY = "toodoo-guest";

/** Wist de proefomgeving op dit toestel. */
export function clearGuest() {
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // localStorage niet beschikbaar: niets te wissen.
  }
}
