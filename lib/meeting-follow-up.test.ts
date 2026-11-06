import { describe, it, expect } from "vitest";
import { newBlock, newItem } from "./agenda";
import { useStore, type Meeting } from "./store";
import { prepareFollowUp, sendFollowUp, undoFollowUp } from "./meeting-follow-up";
const fixture = (): Meeting => ({
  id: "m",
  name: "Vergadering",
  type: "Algemeen",
  date: "2026-11-06",
  time: 540,
  duration: 60,
  recurrence: "weekly",
  seriesId: "s",
  participants: ["jp"],
  actions: [{ id: "a", what: "Actie", ownerId: null, deadline: "", done: false }],
  startedAt: 1,
  endedAt: 60001,
  startedBy: "jp",
  followUpStatus: "pending",
  blocks: [newBlock("topics", { title: "HR", items: [newItem("Punt", { id: "i", visitedAt: 1, decision: "done" })] })],
  held: false,
  showWelcome: false,
  invited: true,
});
describe("opvolging versturen", () => {
  it("past expliciete keuzes toe en maakt de voorzitter eigenaar zonder derde status", () => {
    const result = prepareFollowUp(fixture(), 100);
    expect(result.actions[0].ownerId).toBe("jp");
    expect(result.blocks[0].items[0]).toMatchObject({ runStatus: "done", doneAt: 100 });
    expect(result).toMatchObject({ followUpStatus: "sent", followUpSentAt: 100, run: null });
  });
  it("trekt de hele transactie inclusief doorgeschoven punten terug binnen 10 seconden", () => {
    const m = fixture();
    m.blocks[0].items[0].decision = "next";
    const next = { ...fixture(), id: "n", date: "2026-11-13", blocks: [] };
    useStore.setState({ meetings: [m, next] });
    sendFollowUp("m", true, 100);
    expect(useStore.getState().meetings[1].blocks[0].items).toHaveLength(1);
    expect(undoFollowUp(101)).toBe(true);
    expect(useStore.getState().meetings[1].blocks).toEqual([]);
    expect(useStore.getState().meetings[0].wrapUpOpen).toBe(true);
    sendFollowUp("m", true, 100);
    expect(undoFollowUp(10101)).toBe(false);
  });
});
