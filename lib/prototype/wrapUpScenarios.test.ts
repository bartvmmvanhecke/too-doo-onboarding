import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../store";
import { loadWrapUpScenario } from "./wrapUpScenarios";
import { chimeEnabled, useChimePreferences } from "../audio/chime-state";
import { timerEnd, meetingNow } from "../meeting-clock";
import { actualDuration, closeManually, isHandled, nextOpenItem, othersOpen, plannedEnd } from "../meeting-wrap-up";
const now = new Date("2026-11-05T14:00:00").getTime();
let id: string;
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", "");
  useStore.getState().reset();
  id = useStore
    .getState()
    .createMeeting({ name: "Eigen agenda", date: "2026-11-05", time: 840, duration: 60, recurrence: "weekly" });
  useStore.getState().startRun(id);
});
afterEach(() => vi.unstubAllEnvs());
const current = () => useStore.getState().meetings.find((m) => m.id === id)!;
describe("prototypebediening", () => {
  it("start opnieuw bij het eerste punt zonder behandelde punten of opvolging", () => {
    loadWrapUpScenario("jumps", id, now);
    loadWrapUpScenario("start", id, now);
    const m = current();
    expect(m.run?.currentId).toBe("wrap-demo-1");
    expect(m.run?.doneIds).toEqual([]);
    expect(m.blocks[0].items.every((i) => !isHandled(m, i.id) && i.entries.length === 0)).toBe(true);
    expect(m.actions).toEqual([]);
    expect(meetingNow(m, now) - m.startedAt!).toBe(0);
    expect(timerEnd(m) - meetingNow(m, now)).toBe(60 * 60000);
  });
  it("laadt sprongen met gevulde opvolging en volgend punt 6", () => {
    loadWrapUpScenario("jumps", id, now);
    const m = current();
    expect(m.name).toBe("Directieoverleg");
    expect(m.time).toBe(540);
    expect(m.blocks[0].items.filter((i) => isHandled(m, i.id))).toHaveLength(3);
    expect(othersOpen(m, m.run!.currentId).map((i) => i.id)).toEqual(["wrap-demo-3", "wrap-demo-6"]);
    expect(nextOpenItem(m, m.run!.currentId)?.id).toBe("wrap-demo-6");
    expect(meetingNow(m, now) - m.startedAt!).toBe(52 * 60000);
    expect(m.actions).toHaveLength(4);
    expect(m.actions.filter((a) => !a.ownerId)).toHaveLength(1);
    expect(useStore.getState().extraPeople.map((p) => p.name)).toEqual(["Rashmi", "Kelvin", "Florianne"]);
  });
  it("schuift tijd ook zonder scenario en gebruikt die bij afsluiten", () => {
    const before = current();
    loadWrapUpScenario("advance", id, now);
    expect(meetingNow(current(), now)).toBe(now + 5 * 60000);
    expect(current().startedAt).toBe(before.startedAt);
    loadWrapUpScenario("last", id, now);
    loadWrapUpScenario("advance", id, now);
    const m = current(),
      shifted = meetingNow(m, now);
    expect(shifted).toBe(plannedEnd(m));
    expect(othersOpen(m, m.run!.currentId)).toHaveLength(0);
    expect(actualDuration(closeManually(m, shifted))).toBe(60 * 60000);
  });
  it("spoort automatisch af, stuurt geen opvolging en draagt 3 en 6 over", () => {
    loadWrapUpScenario("jumps", id, now);
    loadWrapUpScenario("unattended", id, now);
    const m = current();
    expect(m).toMatchObject({ run: null, endReason: "auto", followUpStatus: "pending", minimized: false });
    expect(m.endedAt! - m.lastActivityAt!).toBe(15 * 60000);
    const next = useStore.getState().meetings.find((n) => n.id !== id)!;
    expect(next.blocks[0].items.map((i) => i.carriedSourceId)).toEqual([`${id}:wrap-demo-3`, `${id}:wrap-demo-6`]);
    // The demo departure ends the discussion of the current point.
  });
  it("reset carry en tijd bij herladen en weigert productie", () => {
    loadWrapUpScenario("jumps", id, now);
    useStore.getState().updateItem(id, "wrap-demo-3", { carry: "drop" });
    loadWrapUpScenario("jumps", id, now);
    expect(current().blocks[0].items[2].carry).toBeUndefined();
    const before = current();
    vi.stubEnv("NODE_ENV", "production");
    expect(loadWrapUpScenario("last", id, now)).toBeNull();
    expect(current()).toBe(before);
    expect(meetingNow({ ...before, demoTimeOffsetMs: 1000000 }, now)).toBe(now);
  });
  it("zet de laatste vijf seconden exact en opnieuw zonder voorbeeldgeluid", () => {
    useChimePreferences.setState({ users: {} });
    loadWrapUpScenario("last", id, now);
    const result = loadWrapUpScenario("last-five", id, now);
    expect(result?.announcement).toBe("Geluid aangezet voor de demo");
    expect(chimeEnabled()).toBe(true);
    expect(timerEnd(current()) - meetingNow(current(), now)).toBe(5000);
    const revision = current().demoScenarioRevision!;
    loadWrapUpScenario("last-five", id, now + 10000);
    expect(current().demoScenarioRevision).toBe(revision + 1);
    expect(timerEnd(current()) - meetingNow(current(), now + 10000)).toBe(5000);
  });
});
