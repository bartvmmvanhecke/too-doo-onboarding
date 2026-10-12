import { describe, expect, it } from "vitest";
import { respond } from "@/lib/assistant/engine";
import { foundFields, parseMeetingSentence } from "@/lib/assistant/parse";
import type { AssistantState } from "@/lib/assistant/types";
import { emptyMeeting } from "@/lib/assistant/engine";
import { SAMPLE_NOTES } from "@/lib/extract";

/** Vaste referentiedatum (een maandag) zodat datums voorspelbaar zijn. */
const REF = new Date(2026, 9, 12);

function start(): AssistantState {
  return {
    step: 1,
    entry: null,
    pending: { kind: "sentence" },
    meeting: emptyMeeting(),
    actions: [],
    decisions: [],
    others: [],
  };
}

/** De vier zinnen uit SPEC-LAZY.md §9. */
describe("parseMeetingSentence", () => {
  it("productieoverleg: alles staat in de zin", () => {
    const p = parseMeetingSentence(
      "Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim: lopende orders, problemen en planning.",
    );
    expect(p).toEqual({
      name: "Productieoverleg",
      recurrence: "weekly",
      weekday: 1,
      time: 8 * 60,
      duration: null,
      participants: ["Jan", "Sofie", "Pieter", "Karim"],
      topics: ["Lopende orders", "Knelpunten en beslissingen", "Planning komende week"],
    });
  });

  it("managementoverleg: ritme, dag, uur en duur", () => {
    const p = parseMeetingSentence("managementoverleg om de 2 weken op dinsdag 14u30, anderhalf uur");
    expect(p).toEqual({
      name: "Managementoverleg",
      recurrence: "biweekly",
      weekday: 2,
      time: 14 * 60 + 30,
      duration: 90,
      participants: [],
      topics: [],
    });
  });

  it("teamoverleg: enkel naam en deelnemers", () => {
    const p = parseMeetingSentence("teamoverleg met Els en Bram");
    expect(p).toEqual({
      name: "Teamoverleg",
      recurrence: null,
      weekday: null,
      time: null,
      duration: null,
      participants: ["Els", "Bram"],
      topics: [],
    });
  });

  it("veiligheidsoverleg: enkel naam en ritme", () => {
    const p = parseMeetingSentence("Veiligheidsoverleg maandelijks");
    expect(foundFields(p)).toEqual(["name", "recurrence"]);
    expect(p.name).toBe("Veiligheidsoverleg");
    expect(p.recurrence).toBe("monthly");
  });

  it("herkent uren en duren in andere vormen", () => {
    expect(parseMeetingSentence("weekstart om 9").time).toBe(9 * 60);
    expect(parseMeetingSentence("weekstart 8:30").time).toBe(8 * 60 + 30);
    expect(parseMeetingSentence("weekstart 09.00").time).toBe(9 * 60);
    expect(parseMeetingSentence("weekstart een uurtje").duration).toBe(60);
    expect(parseMeetingSentence("weekstart half uur").duration).toBe(30);
    expect(parseMeetingSentence("weekstart 1u30").duration).toBe(90);
    expect(parseMeetingSentence("weekstart 1u30").time).toBeNull();
  });

  it("valt terug op het eerste zinsdeel als naam", () => {
    expect(parseMeetingSentence("werfoverleg met Tom, elke vrijdag").name).toBe("Werfoverleg");
  });
});

/** Wat ontbreekt, wordt gevraagd; niets wordt verzonnen. */
describe("respond", () => {
  it("vult in wat er gezegd werd en stelt het voorstel voor", () => {
    const r = respond(
      start(),
      {
        type: "text",
        text: "Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim: lopende orders, problemen en planning.",
      },
      REF,
    );
    expect(r.state.pending).toEqual({ kind: "confirm-meeting" });
    expect(r.state.meeting.duration).toBe(60);
    expect(r.state.meeting.durationProposed).toBe(true);
    expect(r.state.meeting.participants.map((p) => p.name)).toEqual(["Jan", "Sofie", "Pieter", "Karim"]);
    expect(r.messages.at(-1)?.card).toBe("summary");
  });

  it("teamoverleg vraagt naar dag en uur", () => {
    let r = respond(start(), { type: "text", text: "teamoverleg met Els en Bram" }, REF);
    expect(r.state.pending).toEqual({ kind: "day" });
    expect(r.messages.at(-1)?.text).toContain("Wanneer gaat het door?");
    r = respond(r.state, { type: "chip", value: "2" }, REF);
    expect(r.state.pending).toEqual({ kind: "time" });
    expect(r.state.meeting.weekday).toBe(2);
    expect(r.state.meeting.time).toBeNull();
  });

  it("veiligheidsoverleg vraagt naar dag, uur en deelnemers", () => {
    let r = respond(start(), { type: "text", text: "Veiligheidsoverleg maandelijks" }, REF);
    expect(r.state.pending.kind).toBe("day");
    r = respond(r.state, { type: "text", text: "donderdag" }, REF);
    expect(r.state.pending.kind).toBe("time");
    r = respond(r.state, { type: "text", text: "10u" }, REF);
    expect(r.state.pending.kind).toBe("participants");
    expect(r.state.meeting.participants).toEqual([]);
    r = respond(r.state, { type: "chip", value: "later" }, REF);
    expect(r.state.pending.kind).toBe("confirm-meeting");
  });

  it("notities: acties op de agenda, ontbrekende eigenaar wordt een vraag", () => {
    let r = respond(
      start(),
      { type: "text", text: "productieoverleg elke maandag om 8u met Jan, Sofie, Pieter en Karim" },
      REF,
    );
    r = respond(r.state, { type: "confirm-meeting" }, REF);
    expect(r.state.step).toBe(2);
    r = respond(r.state, { type: "text", text: SAMPLE_NOTES }, REF);
    expect(r.state.actions.map((a) => a.text)).toEqual([
      "Nieuwe offerte plooibank opvragen",
      "Instructie heftruck aanpassen na incident",
      "Leverancier staal opnieuw bellen",
    ]);
    expect(r.state.decisions.map((d) => d.text)).toEqual(["Planning week 42"]);
    expect(r.messages[0].text).toBe(
      "Ik vond **3 acties** en **1 beslissing**. Ze staan links op de agenda; vink uit wat niet klopt.",
    );
    expect(r.messages.at(-1)?.text).toBe("Wie gaat leverancier staal opnieuw bellen?");
    expect(r.events.map((e) => e[0])).toEqual(["actions_extracted", "first_action_with_owner"]);

    // "Karim belt, tegen woensdag" vult eigenaar en datum van de open vraag in.
    r = respond(r.state, { type: "text", text: "Karim belt, tegen woensdag" }, REF);
    const staal = r.state.actions[2];
    expect(r.state.meeting.participants.find((p) => p.id === staal.ownerId)?.name).toBe("Karim");
    expect(staal.deadline).toBe("2026-10-14");
    expect(r.state.pending.kind).toBe("place-actions");

    r = respond(r.state, { type: "place-actions" }, REF);
    expect(r.state.step).toBe(3);
    expect(r.messages.at(-1)?.text).toContain("**Zal ik Jan, Sofie en Karim hun actie nu al mailen?**");
  });

  it("via notities eerst: naam uit de kopregel, daarna enkel vragen wat ontbreekt", () => {
    let r = respond({ ...start(), pending: { kind: "entry" } }, { type: "entry", entry: "notes" }, REF);
    expect(r.state.step).toBe(2);
    r = respond(r.state, { type: "text", text: SAMPLE_NOTES }, REF);
    expect(r.state.meeting.name).toBe("Productieoverleg");
    // Zonder deelnemers geen eigenaars: elke actie wordt een vraag.
    expect(r.state.actions.every((a) => a.ownerId === null)).toBe(true);
    r = respond(r.state, { type: "text", text: "Jan" }, REF);
    expect(r.state.meeting.participants.map((p) => p.name)).toEqual(["Jan"]);
    r = respond(r.state, { type: "chip", value: "me" }, REF);
    r = respond(r.state, { type: "chip", value: "later" }, REF);
    r = respond(r.state, { type: "place-actions" }, REF);
    expect(r.state.pending.kind).toBe("day");
    r = respond(r.state, { type: "chip", value: "1" }, REF);
    r = respond(r.state, { type: "chip", value: "08:00" }, REF);
    r = respond(r.state, { type: "chip", value: "weekly" }, REF);
    // Jan werd al genoemd als eigenaar: geen vraag meer naar deelnemers.
    expect(r.state.step).toBe(3);
  });
});
