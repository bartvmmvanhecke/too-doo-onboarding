import { beforeEach, expect, test } from "vitest";
import { useGuestStore } from "./guest-store";
import { reviewGuestSuggestion, reviewSavedSuggestion, isVagueSuggestion } from "./review-suggestions";
import { bundleToMeeting } from "./guest-transfer";
import { currentTrialMeeting, trialDocumentOps } from "./trial-document";
import { createDraftStore } from "./store";

beforeEach(() => useGuestStore.getState().reset());
function seed() {
  useGuestStore.getState().startEmpty();
  useGuestStore.setState({
    actions: [
      {
        id: "a",
        text: "Jan vraagt een offerte",
        ownerId: null,
        deadline: null,
        confirmed: false,
        reviewStatus: "open",
        ownerLater: false,
      },
      {
        id: "b",
        text: "Leveranciers",
        ownerId: null,
        deadline: null,
        confirmed: false,
        reviewStatus: "open",
        ownerLater: false,
      },
    ],
  });
  return useGuestStore.getState();
}
test("vaagheid onderscheidt korte taken en deelnemers van losse onderwerpen", () => {
  expect(isVagueSuggestion("Leveranciers", [])).toBe(true);
  expect(isVagueSuggestion("Offerte aanvragen", [])).toBe(false);
  expect(isVagueSuggestion("Jan vraagt", [{ name: "Jan Peeters" }])).toBe(false);
  expect(isVagueSuggestion("Leverancier bellen", [])).toBe(false);
});
test("bevestigen maakt een echte actie; wegklikken en ongedaan maken houden voorstellen beschikbaar", () => {
  const state = seed();
  const confirmed = reviewGuestSuggestion(state, "a", "confirmed");
  expect(bundleToMeeting(confirmed).actions.map((a) => a.id)).toEqual(["a"]);
  const dismissed = reviewGuestSuggestion(confirmed, "b", "dismissed");
  expect(dismissed.actions).toHaveLength(2);
  const undo = reviewGuestSuggestion(dismissed, "a", "open");
  expect(bundleToMeeting(undo).actions).toEqual([]);
});
test("een vaag voorstel wordt één agendapunt; ongedaan maken verwijdert dat punt", () => {
  const state = seed();
  const agenda = reviewGuestSuggestion(state, "b", "agenda");
  expect(agenda.meeting.topics.find((t) => t.text === "Lopende zaken")?.items).toHaveLength(1);
  const twice = reviewGuestSuggestion(agenda, "b", "agenda");
  expect(twice.meeting.topics.flatMap((t) => t.items ?? [])).toHaveLength(1);
  expect(reviewGuestSuggestion(twice, "b", "open").meeting.topics.flatMap((t) => t.items ?? [])).toEqual([]);
});
test("agenda-edits wissen geen open of weggeklikte voorstellen", () => {
  seed();
  const ops = trialDocumentOps(createDraftStore().getState());
  const current = currentTrialMeeting();
  ops.addAgendaItem(current.id, current.blocks[1].id, "Nieuwe offerte bespreken");
  expect(useGuestStore.getState().actions.map((a) => a.id)).toEqual(["a", "b"]);
});
test("open voorstellen overleven bewaren en zijn daarna nog na te kijken", () => {
  const saved = { ...bundleToMeeting(seed()), id: "saved" };
  expect(saved.actions).toEqual([]);
  expect(saved.reviewSuggestions).toHaveLength(2);
  const confirmed = reviewSavedSuggestion(saved, "a", "confirmed");
  expect(confirmed.actions.map((a) => a.id)).toEqual(["a"]);
  expect(reviewSavedSuggestion(confirmed, "a", "open").actions).toEqual([]);
  const agenda = reviewSavedSuggestion(saved, "b", "agenda");
  expect(agenda.blocks.find((b) => b.title === "Lopende zaken")?.items[0].text).toBe("Leveranciers");
  expect(reviewSavedSuggestion(agenda, "b", "open").blocks.flatMap((b) => b.items)).toEqual([]);
});

test("bevestigde acties komen terug na de vergadering; open voorstellen blijven beschikbaar", () => {
  const saved = { ...bundleToMeeting(reviewGuestSuggestion(seed(), "a", "confirmed")), id: "saved" };
  const store = createDraftStore();
  store.getState().putMeeting(saved);
  store.getState().startRun(saved.id);
  store.getState().endRun(saved.id);
  const next = store.getState().meetings.find((m) => m.id === saved.id)!;
  expect(next.actions.map((a) => a.id)).toEqual(["a"]);
  expect(next.reviewSuggestions?.find((a) => a.id === "b")?.reviewStatus).toBe("open");
});
