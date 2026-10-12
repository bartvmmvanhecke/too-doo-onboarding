import { describe, expect, it } from "vitest";
import { appointmentOptions, seriesOptions } from "@/lib/assistant/calendar";
import { emptyMeeting, respond } from "@/lib/assistant/engine";
import type { AssistantInput, AssistantState, Message } from "@/lib/assistant/types";
import { SAMPLE_NOTES, SAMPLE_TRANSCRIPT } from "@/lib/extract";

const REF = new Date(2026, 9, 12);

function start(): AssistantState {
  return {
    step: 1,
    entry: null,
    pending: { kind: "entry" },
    meeting: emptyMeeting(),
    actions: [],
    decisions: [],
    others: [],
  };
}

/** Speelt een reeks invoer af en houdt het hele gesprek (enkel de assistent) bij. */
function play(inputs: AssistantInput[], from = start()) {
  let state = from;
  const said: Omit<Message, "id">[] = [];
  for (const input of inputs) {
    const r = respond(state, input, REF);
    state = r.state;
    said.push(...r.messages);
  }
  return { state, said: said.map((m) => m.text) };
}

/** Elke vraag van de assistent verschijnt precies één keer (SPEC-LAZY.md §4, Stap 1). */
function expectNoRepeatedQuestion(said: string[]) {
  const questions = said.flatMap((t) => t.split(/(?<=[.?])\s+/)).filter((q) => q.trim().endsWith("?"));
  const dup = questions.filter((q, i) => questions.indexOf(q) !== i);
  expect(dup, `dubbele vragen: ${dup.join(" | ")}`).toEqual([]);
}

describe("elke vraag één keer", () => {
  it("'Klaar met aanpassen' (edited) stelt de open vraag niet opnieuw", () => {
    const { state, said } = play([
      { type: "entry", entry: "notes" },
      { type: "text", text: SAMPLE_TRANSCRIPT },
      { type: "chip", value: "me" },
      { type: "chip", value: "later" },
      { type: "chip", value: "later" },
      { type: "place-actions" },
      { type: "edited" },
      { type: "edited" },
    ]);
    expect(state.pending.kind).toBe("name");
    expect(said.filter((t) => t.includes("Hoe heet dit overleg?"))).toHaveLength(1);
    expectNoRepeatedQuestion(said);
  });

  it("een onleesbaar antwoord geeft een uitleg, geen herhaalde vraag", () => {
    const { said } = play([
      { type: "entry", entry: "meeting" },
      { type: "text", text: "teamoverleg met Els" },
      { type: "text", text: "geen idee" },
      { type: "text", text: "nog steeds geen idee" },
    ]);
    expect(said.filter((t) => t.includes("Wanneer gaat het door?"))).toHaveLength(1);
    expectNoRepeatedQuestion(said);
  });

  it("aanpassen tijdens het voorstel herhaalt 'Klopt dit?' niet", () => {
    const { said } = play([
      { type: "entry", entry: "meeting" },
      { type: "text", text: "productieoverleg elke maandag om 8u met Jan en Sofie" },
      { type: "edited" },
      { type: "text", text: "het duurt anderhalf uur" },
      { type: "edited" },
    ]);
    expectNoRepeatedQuestion(said);
  });

  it("een eigenaar die al gevraagd werd, wordt niet opnieuw gevraagd bij een tweede bestand", () => {
    const { said } = play([
      { type: "entry", entry: "notes" },
      { type: "notes-file", name: "a.txt", text: "- leverancier staal opnieuw bellen", sample: false, image: false },
      { type: "notes-file", name: "b.txt", text: "- offerte plooibank opvragen", sample: false, image: false },
    ]);
    expect(said.filter((t) => t === "Wie gaat leverancier staal opnieuw bellen?")).toHaveLength(1);
    expectNoRepeatedQuestion(said);
  });
});

describe("Uit mijn agenda (C1b)", () => {
  it("reeksen gevonden: radiolijst, eigen overleg met de meeste deelnemers bovenaan, daarna de acties", () => {
    const options = seriesOptions();
    expect(options[0]).toMatchObject({ name: "Productieoverleg", organizer: true });
    expect(options[0].line).toBe("Elke maandag 08:00 · 6 deelnemers");
    let r = respond(start(), { type: "calendar", provider: "outlook", result: { kind: "series", options } }, REF);
    expect(r.state.pending.kind).toBe("pick-meeting");
    expect(r.messages[0].text).toBe(`Ik vond **${options.length} vaste overleggen**. Welk wil je eerst opvolgen?`);
    r = respond(r.state, { type: "pick-meeting", id: "productie" }, REF);
    expect(r.state.meeting).toMatchObject({
      name: "Productieoverleg",
      recurrence: "weekly",
      weekday: 1,
      time: 480,
      proposed: true,
      source: "outlook",
    });
    expect(r.state.meeting.participants.map((p) => p.name)).toContain("Sofie De Smet");
    expect(r.state.meeting.topics.map((t) => t.text)).toEqual(["Orders, stilstanden en planning volgende week"]);
    expect(r.state.step).toBe(2);
    expect(r.state.pending.kind).toBe("notes");

    // Eigenaars komen uit de deelnemers van de agenda.
    r = respond(r.state, { type: "text", text: SAMPLE_NOTES }, REF);
    const sofie = r.state.meeting.participants.find((p) => p.name === "Sofie De Smet");
    expect(r.state.actions.some((a) => a.ownerId === sofie?.id)).toBe(true);
  });

  it("geen reeksen: losse afspraken; het ritme wordt later gevraagd, niet verzonnen", () => {
    const options = appointmentOptions();
    let r = respond(start(), { type: "calendar", provider: "google", result: { kind: "none", options } }, REF);
    expect(r.messages[0].text).toContain("Ik vond geen vaste overleggen in je agenda.");
    r = respond(r.state, { type: "pick-meeting", id: options[0].id }, REF);
    expect(r.state.meeting.recurrence).toBeNull();
    r = respond(r.state, { type: "no-actions" }, REF);
    expect(r.state.pending.kind).toBe("recurrence");
  });

  it.each([
    ["admin", "Je bedrijf moet dit eerst goedkeuren."],
    ["cancelled", "Het koppelen is geannuleerd."],
    ["blocked", "Inloggen met Microsoft lukt niet bij je bedrijf."],
  ] as const)("%s: rustige melding, de andere ingangen blijven", (kind, text) => {
    const r = respond(start(), { type: "calendar", provider: "outlook", result: { kind } }, REF);
    expect(r.messages).toHaveLength(1);
    expect(r.messages[0].text).toBe(`${text} Geen probleem: vertel het me of gebruik notities.`);
    expect(r.state.pending).toEqual({ kind: "entry" });
    expect(r.state.step).toBe(1);
  });
});

describe("Notities uit een bestand", () => {
  it("toont welk bestand en haalt de acties eruit", () => {
    const r = respond(
      start(),
      { type: "notes-file", name: "verslag.docx", text: SAMPLE_NOTES, sample: false, image: false },
      REF,
    );
    expect(r.messages[0].text).toBe("Ik las **verslag.docx**.");
    expect(r.state.step).toBe(2);
    expect(r.state.actions).toHaveLength(3);
    expect(r.state.meeting.name).toBe("Productieoverleg");
  });

  it("een foto: bestandsnaam en de voorbeeldtekst", () => {
    const r = respond(
      start(),
      { type: "notes-file", name: "bord.jpg", text: SAMPLE_NOTES, sample: true, image: true },
      REF,
    );
    expect(r.messages[0].text).toContain("Ik las **bord.jpg**.");
    expect(r.messages[0].text).toContain("voorbeeldnotities");
    expect(r.state.actions).toHaveLength(3);
  });
});
