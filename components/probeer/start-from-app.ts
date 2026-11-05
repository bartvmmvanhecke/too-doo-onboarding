import { WELCOME_LABEL } from "@/components/probeer/welcome";
import type { StartChoice } from "@/lib/assistant";
import { GUEST_SESSION_KEY, clearGuest, useGuestStore } from "@/lib/guest-store";
import { useStore } from "@/lib/store";
import { track } from "@/lib/track";

/**
 * Ingelogd, op de lege staat van Vergaderingen: dezelfde paden als op het startscherm, via dezelfde assistent
 * (de gast-assistent op /probeer). Het account staat klaar, zodat bewaren meteen naar de app gaat (geen
 * bewaar-modal), en de overgang van welkom naar app is al gespeeld: de gebruiker zit meteen in de app-layout.
 */
function prepare() {
  const user = useStore.getState().user;
  clearGuest();
  const guest = useGuestStore.getState();
  if (user) guest.setAccount({ firstName: user.firstName, lastName: user.lastName, email: user.email });
  guest.setTransitionPlayed();
  try {
    // Geen "Welkom terug" in de proefomgeving: dit is een nieuw begin, geen terugkeer.
    window.sessionStorage.setItem(GUEST_SESSION_KEY, "1");
  } catch {
    // sessionStorage niet beschikbaar: dan hooguit dat bericht.
  }
  return guest;
}

/** Waar de assistent verdergaat. */
export const ASSISTANT_PATH = "/probeer";

/** "Maak mijn agenda": de zin wordt meteen het overleg (zoals `tellSentence` op het startscherm). */
export function startTell(text: string) {
  const guest = prepare();
  guest.setStartPath("tell");
  track("assistant_entry_chosen", { ingang: "meeting", bron: "app" });
  guest.dispatch({ type: "text", text }, text);
}

/** "Gebruik eerdere notities" of "Haal het uit mijn agenda" (zoals `choose` op het startscherm). */
export function startEntry(choice: Exclude<StartChoice, "meeting">) {
  const guest = prepare();
  guest.setStartPath(choice === "notes" ? "notes" : "agenda");
  track("assistant_entry_chosen", { ingang: choice, bron: "app" });
  guest.dispatch({ type: "entry", entry: choice }, WELCOME_LABEL[choice]);
}

/** "Start met een lege vergadering" (C1d): de conceptvergadering met de standaardagenda. */
export function startEmpty() {
  const guest = prepare();
  track("assistant_entry_chosen", { ingang: "empty", bron: "app" });
  guest.startEmpty();
}

/** Enkel de assistent openen, zonder keuze: hij vraagt hoe je wil starten. */
export function openAssistant() {
  prepare().setAssistantOpen(true);
}
