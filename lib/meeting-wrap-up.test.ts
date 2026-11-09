import { describe, expect, it } from "vitest";
import { newBlock, newItem } from "./agenda";
import type { Meeting } from "./store";
import {
  activityStamp,
  actualDuration,
  autoCloseDueAt,
  carryForward,
  closeManually,
  computeEnd,
  effectiveEnd,
  isLastOpen,
  navigateTo,
  nextOpenItem,
  othersOpen,
  plannedEnd,
  suggestDecision,
  unattended,
} from "./meeting-wrap-up";
const min = 60_000;
const start = new Date("2026-11-09T09:00:00").getTime();
export function fixture(): Meeting {
  return {
    id: "m",
    name: "Comité",
    type: "Management",
    recurrence: "weekly",
    seriesId: "s",
    date: "2026-11-09",
    time: 540,
    duration: 60,
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
    startedAt: start,
    lastActivityAt: start,
    run: { startedAt: start, stepStartedAt: start, currentId: "1", doneIds: [], postponedIds: [], actuals: {} },
  };
}
describe("vergadering afronden v3", () => {
  it.each([
    [40, 60],
    [50, 65],
    [80, 95],
  ])("activiteit op minuut %i geeft eindminuut %i", (activity, end) => {
    expect(computeEnd({ ...fixture(), lastActivityAt: start + activity * min })).toEqual({
      endedAt: start + end * min,
      noActivity: false,
    });
  });
  it("gebruikt gepland einde zonder activiteit, ook na een late start", () => {
    expect(computeEnd({ ...fixture(), lastActivityAt: undefined })).toEqual({
      endedAt: start + 60 * min,
      noActivity: true,
    });
    expect(computeEnd({ ...fixture(), startedAt: start + 30 * min, lastActivityAt: start + 30 * min }).endedAt).toBe(
      start + 60 * min,
    );
  });
  it("navigeren laat punten open, bewaart done en registreert bezoek", () => {
    let m = fixture();
    m.blocks[0].items[0].runStatus = "done";
    for (const id of ["4", "2", "5"]) m = navigateTo(m, id, start + 10 * min);
    expect(m.run?.doneIds).toEqual([]);
    expect(othersOpen(m, "5").map((i) => i.id)).toEqual(["2", "3", "4", "6"]);
    expect(m.blocks[0].items[1].visitedAt).toBeDefined();
    expect(nextOpenItem(m, "5")?.id).toBe("6");
  });
  it("herkent laatste open punt midden in de lijst", () => {
    const m = fixture();
    m.blocks[0].items.forEach((i) => (i.runStatus = i.id === "3" ? "open" : "done"));
    expect(isLastOpen(m, "3")).toBe(true);
    expect(nextOpenItem(m, "3")).toBeNull();
  });
  it("stelt alleen voltooien voor bij bezocht én inhoud", () => {
    const item = newItem("Punt");
    expect(suggestDecision(item)).toBe("next");
    item.entries.push({ id: "e", kind: "note", text: "Vastgelegd", ownerId: null, date: "" });
    expect(suggestDecision(item)).toBe("next");
    item.visitedAt = start;
    expect(suggestDecision(item)).toBe("done");
  });
  it("sluit op de exacte deadline, zonder herinnering of overdracht", () => {
    const m = { ...fixture(), lastActivityAt: start + 40 * min };
    const due = autoCloseDueAt(m);
    expect(due).toBe(start + 180 * min);
    expect(unattended(m, due - 1)).toBe(m);
    const closed = unattended(m, due);
    expect(closed).toMatchObject({
      run: null,
      endedAt: start + 60 * min,
      endReason: "auto",
      endTimeConfirmed: false,
      followUpStatus: "pending",
    });
    expect(closed.reminderQueuedAt).toBeUndefined();
    expect(closed.blocks[0].items.every((i) => i.carry === undefined)).toBe(true);
    expect(unattended(closed, due + min)).toBe(closed);
    expect(autoCloseDueAt({ ...m, lastActivityAt: start + 80 * min })).toBe(start + 200 * min);
  });
  it("handmatig afsluiten voltooit niets en bewaart de echte eindtijd", () => {
    const m = closeManually(fixture(), start + 45 * min);
    expect(othersOpen(m, null)).toHaveLength(6);
    expect(effectiveEnd(m)).toBe(start + 45 * min);
    expect(actualDuration(m)).toBe(45 * min);
  });
  it("corrigeert historische uitschieters met gepland einde als ondergrens", () => {
    const m = { ...fixture(), lastActivityAt: undefined, endedAt: start + 900 * min };
    expect(effectiveEnd(m)).toBe(start + 60 * min);
    expect(effectiveEnd({ ...m, endTimeConfirmed: true })).toBe(m.endedAt);
    m.blocks[0].items[0].updatedAt = start + 80 * min;
    expect(effectiveEnd(m)).toBe(start + 95 * min);
  });
  it("draagt alleen gekozen open punten één keer over in hetzelfde blok", () => {
    const m = closeManually(fixture(), start + 60 * min);
    m.blocks[0].items[0].runStatus = "done";
    m.blocks[0].items[1].carry = "drop";
    const next = { ...fixture(), id: "next", date: "2026-11-16", blocks: [] };
    const meetings = carryForward(m, [m, next]);
    expect(meetings[1].blocks[0].title).toBe("Thema");
    expect(meetings[1].blocks[0].items.map((i) => i.text)).toEqual(["3", "4", "5", "6"]);
    expect(carryForward(m, meetings)[1].blocks[0].items).toHaveLength(4);
    expect(plannedEnd(m)).toBe(start + 60 * min);
  });
});

it("vindt de volgende vergadering ook op dezelfde dag", async () => {
  const { nextInSeries } = await import("./meeting-wrap-up");
  const m = fixture();
  expect(nextInSeries(m, [m, { ...m, id: "next", time: 660 }])?.id).toBe("next");
});

it("registreert de eerste activiteit na de start meteen en begrenst daarna tot eens per 30 s", () => {
  const m = fixture();
  const first = activityStamp(m, start + 5_000);
  expect(first).toBe(start + 5_000);
  expect(activityStamp({ ...m, lastActivityAt: first }, start + 10_000)).toBe(first);
  expect(activityStamp({ ...m, lastActivityAt: first }, start + 35_000)).toBe(start + 35_000);
});
