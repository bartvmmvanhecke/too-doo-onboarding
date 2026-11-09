import { expect, it } from "vitest";
import { newBlock, newItem } from "./agenda";
import type { Meeting } from "./store";
import { initialWrapUpDraft, finishWrapUp, reconcileBacklog, factualSummary } from "./wrap-up-flow";
function meeting(): Meeting {
  return {
    id: "m",
    name: "Vergadering",
    type: "Team",
    date: "2026-11-09",
    time: 540,
    duration: 60,
    recurrence: "weekly",
    seriesId: "s",
    startedBy: "chair",
    startedAt: 1,
    endedAt: 3600001,
    endReason: "manual",
    followUpStatus: "pending",
    participants: ["chair", "p"],
    held: false,
    invited: true,
    showWelcome: false,
    actions: [{ id: "a", what: "Testen", ownerId: null, deadline: "", done: false }],
    blocks: [
      newBlock("topics", {
        title: "Thema",
        items: [
          newItem("Punt", {
            id: "i",
            visitedAt: 2,
            entries: [{ id: "e", kind: "action", actionId: "a", text: "Testen", ownerId: null, date: "" }],
          }),
        ],
      }),
    ],
  };
}
it("initialiseert voorstellen en behoudt een bestaand concept", () => {
  const m = meeting();
  expect(initialWrapUpDraft(m, []).decisions).toEqual({ i: "done" });
  m.wrapUpDraft = { step: 2, summary: "Eigen tekst", recipientIds: [], decisions: { i: "drop" } };
  expect(initialWrapUpDraft(m, [])).toMatchObject(m.wrapUpDraft);
});
it("past keuzes alleen bij bewaren/versturen toe en wijst ontbrekende eigenaar toe", () => {
  const m = meeting();
  m.wrapUpDraft = { decisions: { i: "done" }, summary: "Tekst", recipientIds: ["p"] };
  const [saved] = finishWrapUp(m, [m], "saved", 123);
  expect(m.blocks[0].items[0].runStatus).toBeUndefined();
  expect(saved.followUpStatus).toBe("saved");
  expect(saved.followUpSentAt).toBeUndefined();
  expect(saved.actions[0].ownerId).toBe("chair");
  expect(saved.blocks[0].items[0]).toMatchObject({ runStatus: "done", entries: [{ ownerId: "chair" }] });
  expect(finishWrapUp(m, [m], "sent", 123)[0].followUpSentAt).toBe(123);
});
it("bewaart verplaatste punten en koppelt ze één keer aan een latere vergadering", () => {
  const m = meeting();
  m.wrapUpDraft = { decisions: { i: "next" }, noNext: true };
  const saved = finishWrapUp(m, [m], "saved");
  expect(saved[0].blocks[0].items[0].carry).toBe("next");
  const next = {
    ...meeting(),
    id: "next",
    date: "2026-11-16",
    endedAt: undefined,
    followUpStatus: undefined,
    blocks: [],
  };
  const attached = reconcileBacklog([...saved, next]);
  expect(attached[1].blocks[0].title).toBe("Thema");
  expect(attached[1].blocks[0].items[0].carriedFrom).toBe("2026-11-09");
  expect(reconcileBacklog(attached)).toBe(attached);
});
it("maakt een echte geplande opvolger zonder lopende staat te kopiëren", () => {
  const m = meeting();
  m.wrapUpDraft = { decisions: { i: "next" }, nextDate: "2026-11-16", nextTime: "10:30" };
  const result = finishWrapUp(m, [m], "sent");
  expect(result).toHaveLength(2);
  expect(result[1]).toMatchObject({ date: "2026-11-16", time: 630, run: null, held: false });
  expect(result[1].endedAt).toBeUndefined();
  expect(result[1].blocks.flatMap((b) => b.items)).toHaveLength(1);
});
it("bouwt samenvatting alleen uit vastgelegde inhoud", () => {
  const summary = factualSummary(meeting());
  expect(summary).toContain("Testen");
  expect(summary).toContain("geen beslissingen");
  expect(summary).not.toContain("akkoord");
});
