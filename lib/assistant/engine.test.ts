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
    notesReminderShown: false,
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
  ] as const)("%s: rustige melding, de twee andere keuzes opnieuw", (kind, text) => {
    const asked = respond(start(), { type: "entry", entry: "calendar" }, REF);
    const r = respond(asked.state, { type: "calendar", provider: "outlook", result: { kind } }, REF);
    expect(r.messages).toHaveLength(1);
    expect(r.messages[0].text).toBe(`${text} Geen probleem: vertel het me of gebruik notities.`);
    expect(r.state.pending).toEqual({ kind: "entry", choices: ["notes", "meeting"] });
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

describe("startkeuzes (C1): de details komen pas na de keuze", () => {
  it("agenda: 'Outlook of Google?'", () => {
    const r = respond(start(), { type: "entry", entry: "calendar" }, REF);
    expect(r.messages.map((m) => m.text)).toEqual(["Outlook of Google?"]);
    expect(r.state.pending).toEqual({ kind: "provider", fields: null, resume: { kind: "entry" } });
  });

  it("notities: dropzone en plakken (C1c)", () => {
    const r = respond(start(), { type: "entry", entry: "notes" }, REF);
    expect(r.messages).toEqual([
      {
        from: "assistant",
        text: "Top. Sleep ze hierheen, spreek ze in of plak de tekst. Ik haal de acties en eigenaars eruit.",
        card: "dropzone",
      },
    ]);
    expect(r.state.pending.kind).toBe("notes");
  });

  it("vertellen: één zin (C2)", () => {
    const r = respond(start(), { type: "entry", entry: "meeting" }, REF);
    expect(r.messages[0].text).toBe(
      "Waarover gaat je volgende overleg? Eén zin is genoeg. Wie en wanneer mag erbij, hoeft niet.",
    );
    expect(r.state.pending.kind).toBe("sentence");
  });
});

describe("ingangen blijven bereikbaar", () => {
  const SENTENCE = "productieoverleg elke maandag om 8u met Jan en Sofie";

  it("zinnen als 'koppel mijn agenda' en 'ik heb notities' voeren de actie meteen uit", () => {
    let r = respond(start(), { type: "text", text: "Koppel mijn agenda" }, REF);
    expect(r.state.pending.kind).toBe("provider");
    r = respond(start(), { type: "text", text: "ik heb notities" }, REF);
    expect(r.state.pending.kind).toBe("notes");
    expect(r.messages[0].card).toBe("dropzone");
  });

  it("een lange geplakte tekst: 'Dit lijken notities…', Ja verwerkt ze", () => {
    const { state } = play([{ type: "text", text: SENTENCE }]);
    expect(state.pending.kind).toBe("confirm-meeting");
    let r = respond(state, { type: "text", text: SAMPLE_NOTES }, REF);
    expect(r.messages[0].text).toBe(
      "Dit lijken notities van een vorig overleg. Zal ik er de openstaande acties en agendapunten uit halen?",
    );
    expect(r.state.pending.kind).toBe("paste");
    r = respond(r.state, { type: "paste", process: true }, REF);
    expect(r.state.actions).toHaveLength(3);
    expect(r.state.step).toBe(2);
  });

  it("'Nee, gewoon bericht' behandelt de tekst als gewone zin", () => {
    const { state } = play([{ type: "entry", entry: "meeting" }]);
    const long = `${SENTENCE}, en verder bespreken we de orders, de stilstanden van vorige week, de planning voor de komende weken en alles wat er nog op de werkvloer en in het magazijn speelt.`;
    let r = respond(state, { type: "text", text: long }, REF);
    expect(r.state.pending.kind).toBe("paste");
    r = respond(r.state, { type: "paste", process: false }, REF);
    expect(r.state.actions).toHaveLength(0);
    expect(r.state.meeting.name).toBe("Productieoverleg");
  });

  it("geplakte notities als antwoord op de vraag om notities: geen extra vraag", () => {
    const { state } = play([{ type: "entry", entry: "notes" }]);
    const r = respond(state, { type: "text", text: SAMPLE_NOTES }, REF);
    expect(r.state.pending.kind).not.toBe("paste");
    expect(r.state.actions).toHaveLength(3);
  });

  it("'Uit agenda halen' vult enkel dag en uur, daarna verder waar de assistent was", () => {
    let { state } = play([
      { type: "entry", entry: "meeting" },
      { type: "text", text: "teamoverleg" },
    ]);
    expect(state.pending.kind).toBe("when-who");
    let r = respond(state, { type: "calendar-field", fields: ["when"] }, REF);
    expect(r.messages[0].text).toBe("Outlook of Google?");
    r = respond(
      r.state,
      { type: "calendar", provider: "outlook", result: { kind: "series", options: seriesOptions() } },
      REF,
    );
    r = respond(r.state, { type: "pick-meeting", id: "productie" }, REF);
    state = r.state;
    expect(state.meeting).toMatchObject({ name: "Teamoverleg", weekday: 1, time: 480, recurrence: "weekly" });
    expect(state.meeting.participants).toHaveLength(0);
    expect(state.pending.kind).toBe("participants");
    expect(r.flash).toEqual(["when"]);
  });

  it("de herinnering over notities komt één keer, ook bij een tweede overleg niet opnieuw", () => {
    const { said } = play([
      { type: "text", text: SENTENCE },
      { type: "confirm-meeting" },
      { type: "no-actions" },
      { type: "another-meeting" },
      { type: "text", text: "teamoverleg elke dinsdag om 9u met Els" },
      { type: "confirm-meeting" },
    ]);
    const reminder =
      "**Heb je notities van de vorige keer?** Plak ze hier, dan staan de openstaande acties meteen klaar.";
    expect(said.filter((t) => t === reminder)).toHaveLength(1);
    expect(said.at(-1)).toContain("Staat er nog iets open van de vorige keer?");
  });

  it("geen dubbele vragen over alle ingangen heen", () => {
    const { said } = play([
      { type: "entry", entry: "calendar" },
      { type: "calendar-field", fields: ["when"] },
      { type: "entry", entry: "calendar" },
      { type: "calendar", provider: "outlook", result: { kind: "admin" } },
      { type: "entry", entry: "notes" },
      { type: "entry", entry: "notes" },
      { type: "text", text: "ik heb notities" },
      { type: "text", text: SAMPLE_NOTES },
    ]);
    expectNoRepeatedQuestion(said);
  });
});

describe("welkom (Stap 0) en eerste vraag (C1)", () => {
  it("na de zin: wanneer en wie in één vraag; daarna enkel wat ontbreekt", () => {
    let r = respond(start(), { type: "text", text: "Ons productieoverleg: orders, problemen en planning" }, REF);
    expect(r.messages.map((m) => m.text)).toEqual([
      "Je productieoverleg staat klaar, met een voorstel van agenda. **Wanneer gaat het door en wie zit erbij?**",
    ]);
    expect(r.state.pending.kind).toBe("when-who");
    r = respond(r.state, { type: "text", text: "elke maandag om 8u" }, REF);
    expect(r.state.meeting).toMatchObject({ weekday: 1, time: 480, recurrence: "weekly" });
    expect(r.messages.map((m) => m.text)).toEqual(["Wie zit er meestal bij? Voornamen volstaan."]);
  });

  it("een lege vergadering (C1d): standaardagenda, titel in bewerkmodus, geen herinnering", () => {
    const r = respond(start(), { type: "start-empty" }, REF);
    expect(r.messages.map((m) => m.text)).toEqual(["Zeg het als ik iets kan invullen."]);
    expect(r.state.meeting.name).toBe("Nieuwe vergadering");
    expect(r.state.notesReminderShown).toBe(true);
    expect(r.edit).toBe(true);
  });
});
