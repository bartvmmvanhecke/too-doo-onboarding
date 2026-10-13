import { describe, expect, it } from "vitest";
import { emptyMeeting, respond } from "@/lib/assistant/engine";
import { goalFromText, MEETING_GOALS, scale, totalMinutes } from "@/lib/assistant/goals";
import type { AssistantInput, AssistantState } from "@/lib/assistant/types";
import { SAMPLE_NOTES } from "@/lib/extract";

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

/** "Wekelijks productieoverleg": te vaag, dus de doelvraag. */
function vague(): AssistantState {
  return respond(start(), { type: "text", text: "Wekelijks productieoverleg" }, REF).state;
}

function play(inputs: AssistantInput[], from = vague()) {
  let state = from;
  const said: string[] = [];
  let flash: string[] = [];
  for (const input of inputs) {
    const r = respond(state, input, REF);
    state = r.state;
    flash = r.flash;
    said.push(...r.messages.map((m) => m.text));
  }
  return { state, said, flash };
}

describe("doelvraag (C0j–C0m)", () => {
  it("vier doelen, in deze volgorde", () => {
    expect(MEETING_GOALS.map((g) => g.label)).toEqual([
      "Afspraken worden echt uitgevoerd",
      "Korter en gerichter",
      "Weten waar iedereen mee bezig is",
      "Niet steeds hetzelfde bespreken",
    ]);
  });

  it("een te vage zin: de doelvraag met chips, naam in kleine letters", () => {
    const r = respond(start(), { type: "text", text: "Wekelijks productieoverleg" }, REF);
    expect(r.messages.map((m) => m.text)).toEqual([
      "Je productieoverleg staat klaar. Pas het links aan zoals je wil. **Of zeg wat er beter kan, dan stem ik het af.**",
    ]);
    expect(r.state.pending).toEqual({ kind: "goal", followUp: null });
    expect(r.state.goalChips).toBe(true);
  });

  it("a) afspraken: vervolgvraag, en het antwoord gaat door de notities-extractie", () => {
    const { state, said } = play([{ type: "goal", goal: "follow-through" }]);
    expect(state.meeting.goals).toEqual(["follow-through"]);
    expect(said).toEqual([
      "Dan komen de openstaande acties voortaan eerst. **Wat staat er nog open van vorige keer?** Plak je notities of typ het kort.",
    ]);
    const r = respond(state, { type: "text", text: SAMPLE_NOTES }, REF);
    expect(r.state.actions.length).toBeGreaterThan(0);
    // Een lange tekst als antwoord is geen "Dit lijken notities…".
    expect(r.state.pending.kind).not.toBe("paste");
  });

  it("b) korter: elk thema een duur en een doel, samen 60 min; een snelkeuze herverdeelt proportioneel", () => {
    const { state, said } = play([{ type: "goal", goal: "focus" }]);
    expect(said[0]).toContain("Ik ging uit van 1 uur. **Hoeveel tijd hebben jullie meestal?**");
    expect(totalMinutes(state.meeting)).toBe(60);
    expect(state.meeting.actionsDuration).toBe(10);
    for (const t of state.meeting.topics) {
      expect(t.duration).toBeGreaterThan(0);
      expect(t.purposes?.length).toBe(1);
    }
    const r = respond(state, { type: "goal-duration", minutes: 30 }, REF);
    expect(totalMinutes(r.state.meeting)).toBe(30);
    expect(r.state.meeting.duration).toBe(30);
    const typed = respond(state, { type: "text", text: "we hebben meestal 40 minuten" }, REF);
    expect(totalMinutes(typed.state.meeting)).toBe(40);
  });

  it("c) iedereen: een nieuw rondje onder Openstaande acties; elke naam wordt deelnemer én punt", () => {
    const { state, said } = play([{ type: "goal", goal: "status" }]);
    const round = state.meeting.topics[0];
    expect(round).toMatchObject({ text: "Rondje per persoon", isNew: true, round: true });
    expect(round.items).toEqual([]);
    expect(said[0]).toContain("**Wie zit erbij?** Voornamen volstaan.");
    const r = respond(state, { type: "text", text: "Sofie, Jan en Tania" }, REF);
    expect(r.state.meeting.participants.map((p) => p.name)).toEqual(["Sofie", "Jan", "Tania"]);
    expect(r.state.meeting.topics[0].items?.map((i) => [i.text, i.duration])).toEqual([
      ["Sofie", 3],
      ["Jan", 3],
      ["Tania", 3],
    ]);
  });

  it("d) niet hetzelfde: de regel over Beslissen, en het antwoord wordt een punt met doel Beslissen", () => {
    const { state } = play([{ type: "goal", goal: "decide" }]);
    expect(state.meeting.topics[0].subtitle).toContain("**Beslissen**");
    const r = respond(state, { type: "text", text: "kiezen we een andere staal-leverancier?" }, REF);
    const items = r.state.meeting.topics.flatMap((t) => t.items ?? []);
    expect(items).toContainEqual(
      expect.objectContaining({ text: "Kiezen we een andere staal-leverancier?", purposes: ["decide"] }),
    );
  });

  it("twee doelen na elkaar; dezelfde chip twee keer doet niets", () => {
    const { state, said } = play([
      { type: "goal", goal: "focus" },
      { type: "goal", goal: "focus" },
      { type: "goal", goal: "decide" },
    ]);
    expect(state.meeting.goals).toEqual(["focus", "decide"]);
    expect(said).toHaveLength(2);
    expect(state.pending).toEqual({ kind: "goal", followUp: "decide" });
  });

  it("vrije tekst wordt aan het dichtstbijzijnde doel gekoppeld, en typen verbergt de chips", () => {
    expect(goalFromText("het loopt altijd uit")).toBe("focus");
    expect(goalFromText("we bespreken steeds hetzelfde")).toBe("decide");
    expect(goalFromText("niemand weet waar iedereen mee bezig is")).toBe("status");
    expect(goalFromText("de afspraken worden niet uitgevoerd")).toBe("follow-through");
    const { state } = play([{ type: "text", text: "het loopt altijd uit" }]);
    expect(state.meeting.goals).toEqual(["focus"]);
    expect(state.goalChips).toBe(false);
  });

  it("proportioneel schalen houdt het totaal", () => {
    expect(scale([10, 20, 15, 15], 45).reduce((a, b) => a + b, 0)).toBe(45);
    expect(scale([10, 20, 15, 15], 90).reduce((a, b) => a + b, 0)).toBe(90);
  });
});
