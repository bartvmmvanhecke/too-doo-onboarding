import { describe, expect, it } from "vitest";
import { reminderAt, autoCloseAt, canResume, registrationState } from "./meeting-schedule";
import { effectiveEnd } from "./meeting-wrap-up";
import type { Meeting } from "./store";
const at = (value: string) => new Date(value).getTime();
const meeting = (end = "2026-11-06T10:00:00"): Meeting => ({
  id: "m",
  name: "Test",
  type: "Algemeen",
  date: end.slice(0, 10),
  time: 540,
  recurrence: "weekly",
  duration: 60,
  startedAt: at(end) - 3600000,
  lastActivityAt: at(end) - 1800000,
  blocks: [],
  actions: [],
  participants: [],
  held: false,
  invited: true,
  showWelcome: false,
});
describe("v2 planning", () => {
  it("kiest agenda, 2 uur of werkdageinde met 30 minuten ondergrens", () => {
    const m = meeting();
    expect(reminderAt(m)).toBe(at("2026-11-06T12:00:00"));
    expect(reminderAt(m, [{ startsAt: at("2026-11-06T10:10:00") }])).toBe(at("2026-11-06T10:30:00"));
    expect(reminderAt(meeting("2026-11-06T16:00:00"))).toBe(at("2026-11-06T17:30:00"));
  });
  it("plant na 16 uur de volgende werkdag en sluit niet vóór 22 uur", () => {
    expect(reminderAt(meeting("2026-11-06T16:01:00"))).toBe(at("2026-11-09T08:30:00"));
    expect(autoCloseAt(meeting())).toBe(at("2026-11-06T22:00:00"));
    expect(autoCloseAt(meeting("2026-11-06T20:00:00"))).toBe(at("2026-11-07T04:00:00"));
  });
  it("maakt duur onbekend zonder activiteit en beperkt hervatten tot dezelfde dag", () => {
    const m = meeting();
    m.lastActivityAt = m.startedAt;
    expect(registrationState(m)).toBe("empty");
    expect(effectiveEnd(m)).toBeNull();
    m.endedAt = at("2026-11-06T10:00:00");
    m.followUpStatus = "pending";
    expect(canResume(m, at("2026-11-06T12:00:00"))).toBe(true);
    expect(canResume(m, at("2026-11-07T12:00:00"))).toBe(false);
  });
});

describe("voorzitter en registratie", () => {
 it("toont nooit gestarte vergaderingen pas na 30 minuten als niet gestart", () => {
  const m={...meeting(),startedAt:undefined,lastActivityAt:undefined};
  expect(registrationState(m,at("2026-11-06T10:29:59"))).toBe("upcoming");
  expect(registrationState(m,at("2026-11-06T10:30:00"))).toBe("not_started");
 });
});
