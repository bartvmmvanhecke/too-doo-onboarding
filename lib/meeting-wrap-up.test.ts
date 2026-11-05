import { describe, expect, it } from "vitest";
import { newBlock, newItem } from "./agenda";
import type { Meeting } from "./store";
import {
  actualDuration,
  carryForward,
  closeManually,
  effectiveEnd,
  navigateTo,
  nextOpenItem,
  othersOpen,
  plannedEnd,
  unattended,
} from "./meeting-wrap-up";
const min = 60_000;
function fixture(): Meeting {
  return {
    id: "m",
    name: "Comité",
    type: "Management",
    recurrence: "weekly",
    seriesId: "s",
    date: "2026-11-05",
    time: 540,
    duration: 120,
    participants: [],
    actions: [],
    showWelcome: false,
    invited: true,
    held: false,
    blocks: [
      newBlock("topics", {
        title: "Thema",
        items: Array.from({ length: 6 }, (_, i) => newItem(String(i + 1), { id: String(i + 1) })),
      }),
    ],
    startedAt: 1000,
    lastActivityAt: 61 * min,
    run: { startedAt: 1000, stepStartedAt: 1000, currentId: "1", doneIds: [], postponedIds: [], actuals: {} },
  };
}
describe("vergadering afronden", () => {
  it("volgt status bij 1 → 4 → 2 → 5 en heropent", () => {
    let m = fixture();
    for (const id of ["4", "2", "5"]) m = navigateTo(m, id);
    expect(m.run?.doneIds).toEqual(["1", "4", "2"]);
    expect(othersOpen(m, "5").map((i) => i.id)).toEqual(["3", "6"]);
    expect(nextOpenItem(m, "5")?.id).toBe("6");
    m = navigateTo(m, "2");
    expect(othersOpen(m, null).map((i) => i.id)).toEqual(["2", "3", "6"]);
  });
  it("wraps backwards and returns null on the final open item", () => {
    let m = fixture();
    m.blocks[0].items.forEach((i) => (i.runStatus = i.id === "2" ? "open" : "handled"));
    expect(nextOpenItem(m, "6")?.id).toBe("2");
    m = navigateTo(m, "2");
    expect(nextOpenItem(m, "2")).toBeNull();
  });
  it("preserves manual end, clamps automatic end and flags historical outliers", () => {
    const m = fixture();
    expect(effectiveEnd({ ...m, endReason: "manual", endedAt: 200 * min })).toBe(200 * min);
    expect(effectiveEnd({ ...m, endedAt: 900 * min })).toBe(76 * min);
    expect(actualDuration({ ...m, lastActivityAt: undefined, endedAt: 900 * min })).toBeNull();
    m.blocks[0].items[0].entries.push({
      id: "e",
      kind: "note",
      text: "",
      ownerId: null,
      date: "",
      updatedAt: 60 * min,
    });
    expect(effectiveEnd({ ...m, lastActivityAt: undefined, endedAt: 900 * min })).toBe(75 * min);
    expect(actualDuration({ ...m, startedAt: 100 * min, endReason: "manual", endedAt: 90 * min })).toBe(0);
  });
  it("queues one reminder, auto closes from activity and never sends follow-up", () => {
    const m = fixture(),
      end = plannedEnd(m);
    const reminded = unattended(m, end + 16 * min);
    expect(reminded.reminderQueuedAt).toBeDefined();
    expect(unattended(reminded, end + 17 * min).reminderQueuedAt).toBe(reminded.reminderQueuedAt);
    const auto = unattended(reminded, end + 9 * 60 * min);
    expect(auto).toMatchObject({ run: null, endReason: "auto", endedAt: 76 * min, followUpStatus: "pending" });
    expect(unattended({ ...m, lastActivityAt: end + 8 * 60 * min }, end + 9 * 60 * min).run).not.toBeNull();
  });
  it("carries only untreated points once, retaining metadata", () => {
    const m = closeManually(fixture(), 120 * min);
    m.blocks[0].items[1].carry = "drop";
    const next = { ...fixture(), id: "next", date: "2026-11-12", blocks: [] };
    const meetings = carryForward(m, [m, next]);
    expect(meetings[1].blocks[0].title).toBe("Lopende zaken");
    expect(meetings[1].blocks[0].items.map((i) => i.text)).toEqual(["3", "4", "5", "6"]);
    expect(carryForward(m, meetings)[1].blocks[0].items).toHaveLength(4);
  });
  it("verwijdert een eerder automatisch doorgeschoven kopie bij laten vallen", () => {
    const m = fixture();
    const next = { ...fixture(), id: "next", date: "2026-11-12", blocks: [] };
    const auto = unattended(m, plannedEnd(m) + 9 * 60 * min);
    const meetings = carryForward(auto, [auto, next]);
    auto.blocks[0].items[2].carry = "drop";
    expect(carryForward(auto, meetings)[1].blocks[0].items.map((i) => i.text)).not.toContain("3");
  });
  it("bewaart behandelde status na het wissen van de run en respecteert bevestigde eindtijd", () => {
    const m = fixture();
    m.run!.doneIds = ["1"];
    const auto = unattended(m, plannedEnd(m) + 9 * 60 * min);
    expect(othersOpen(auto, null).map((i) => i.id)).not.toContain("1");
    expect(effectiveEnd({ ...auto, endedAt: 100 * min, endTimeConfirmed: true })).toBe(100 * min);
  });
  it("leidt de laatste activiteit ook af uit zelfstandige historische acties", () => {
    const m = {
      ...fixture(),
      lastActivityAt: undefined,
      endedAt: 900 * min,
      actions: [{ id: "a", what: "Opvolgen", ownerId: null, deadline: "", done: false, updatedAt: 105 * min }],
    };
    expect(effectiveEnd(m)).toBe(120 * min);
  });
  it("rekent de resterende tijd vanaf de echte start met de geplande duur", () => {
    const m = fixture();
    const start = new Date("2026-11-05T14:00:00").getTime();
    m.date = "2026-11-12";
    m.time = 540;
    m.duration = 60;
    m.startedAt = start;
    m.run!.startedAt = start;
    expect(plannedEnd(m) - start).toBe(60 * min);
    m.date = "2026-10-29";
    expect(plannedEnd(m) - start).toBe(60 * min);
    expect(plannedEnd({ ...m, run: null, startedAt: undefined })).toBe(new Date("2026-10-29T10:00:00").getTime());
  });
});
