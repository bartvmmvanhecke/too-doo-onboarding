import { describe, expect, it } from "vitest";
import { parsePastedLines } from "./meeting-document";
import { suggestFromLine } from "./meeting-suggestions";
import { PEOPLE } from "./mock-data";
import { newBlock, newItem } from "./agenda";
import { useStore, type Meeting } from "./store";
const context = { participants: PEOPLE.filter((p) => ["jp", "sd"].includes(p.id)), meetingDate: "2026-10-19" };
describe("agenda als document", () => {
  it("herkent twee afzonderlijke acties met deelnemer en alleen de expliciete termijn", () => {
    const result = suggestFromLine(
      "Sofie belt de leverancier opnieuw. Jan maakt de nieuwe offerte voor vrijdag.",
      context,
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ kind: "action", title: "Bel de leverancier opnieuw", ownerId: "sd", date: "" });
    expect(result[1]).toMatchObject({
      kind: "action",
      title: "Maak de nieuwe offerte voor vrijdag",
      ownerId: "jp",
      date: "2026-10-23",
      dateLabel: "vrijdag",
    });
  });
  it("vult geen onbekende eigenaar of ontbrekende termijn in", () => {
    expect(suggestFromLine("Piet belt de leverancier", context)[0]).toMatchObject({ ownerId: null, date: "" });
    expect(suggestFromLine("Staal-leverancier opnieuw te laat", context)).toEqual([]);
  });
  it("herkent beslissingstaal en termijnen tegen 20 okt", () => {
    expect(suggestFromLine("Beslissen welke orders deze week voorrang krijgen", context)[0].kind).toBe("decision");
    expect(suggestFromLine("We kiezen voor leverancier B", context)[0].kind).toBe("decision");
    expect(suggestFromLine("Jan stuurt de offerte tegen 20 okt", context)[0].date).toBe("2026-10-20");
    expect(suggestFromLine("Jan stuurt de offerte tegen 31 feb", context)[0].date).toBe("");
  });
  it("stript opsommingstekens en bewaart inspringing", () => {
    expect(parsePastedLines("- Punt één\n  • Notitie\n* Punt twee\n1. Punt drie\n\n")).toEqual([
      { text: "Punt één", indented: false },
      { text: "Notitie", indented: true },
      { text: "Punt twee", indented: false },
      { text: "Punt drie", indented: false },
    ]);
  });
  it("gekoppelde acties blijven open bij de volgende vergadering en undo verwijdert de koppeling", () => {
    const item = newItem("Offerte");
    const meeting: Meeting = {
      id: "document-test",
      name: "Productie",
      recurrence: "weekly",
      date: "2026-10-19",
      time: 480,
      duration: 60,
      participants: ["jp", "sd"],
      actions: [],
      blocks: [newBlock("topics", { items: [item] })],
      type: "",
      showWelcome: false,
      held: false,
      invited: true,
    };
    useStore.setState({ meetings: [meeting] });
    const ops = useStore.getState();
    const entryId = ops.addEntry(meeting.id, item.id, {
      kind: "action",
      text: "Maak de offerte",
      ownerId: "jp",
      date: "2026-10-23",
    });
    const actionId = useStore.getState().meetings[0].actions[0].id;
    expect(useStore.getState().meetings[0].blocks[0].items[0].entries[0].actionId).toBe(actionId);
    ops.startRun(meeting.id);
    ops.endRun(meeting.id);
    expect(useStore.getState().meetings[0]).toMatchObject({ actions: [{ id: actionId, done: false }] });
    ops.startRun(meeting.id);
    expect(useStore.getState().meetings[0].actions[0].id).toBe(actionId);
    // Undo vóór afronding verwijdert zowel de entry als de gekoppelde actie.
    useStore.setState({ meetings: [meeting] });
    ops.addEntry(meeting.id, item.id, { kind: "action", text: "Maak de offerte", ownerId: "jp", date: "" });
    const currentId = useStore.getState().meetings[0].blocks[0].items[0].entries[0].id;
    expect(entryId).toBeTruthy();
    ops.removeEntry(meeting.id, item.id, currentId);
    expect(useStore.getState().meetings[0].actions).toEqual([]);
  });
});
