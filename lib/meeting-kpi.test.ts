import { expect, it } from "vitest";
import { meetingKpi } from "./meeting-kpi";
import type { Meeting } from "./store";
import { newBlock, newItem } from "./agenda";
it("corrigeert 75 en 146 uur, sluit ontbrekende historie uit en telt automatisch", () => {
  const base = {
    id: "a",
    type: "Management",
    name: "Comité",
    duration: 120,
    startedAt: 0,
    blocks: [],
    actions: [],
    participants: [],
  } as unknown as Meeting;
  const data = [
    { ...base, endedAt: 75 * 3600000, lastActivityAt: 105 * 60000, endReason: "auto" as const },
    {
      ...base,
      id: "b",
      endedAt: 146 * 3600000,
      blocks: [newBlock("topics", { items: [newItem("Punt", { updatedAt: 105 * 60000 })] })],
    },
    { ...base, id: "c", endedAt: 75 * 3600000 },
  ];
  expect(meetingKpi(data)).toMatchObject({ actual: 4, automatic: 1, total: 3 });
  expect(meetingKpi(data).rows[0]).toMatchObject({ outliers: 1, manual: false });
});

it("sluit niet doorgegane vergaderingen uit en telt ontbrekende registratie apart", () => {
  const base: Meeting = {
    id: "no",
    name: "Test",
    type: "Algemeen",
    date: "2026-11-06",
    time: 540,
    duration: 60,
    recurrence: "once",
    participants: [],
    actions: [],
    blocks: [],
    held: false,
    invited: true,
    showWelcome: false,
  };
  const kpi = meetingKpi(
    [
      { ...base, outcome: "not_held" },
      { ...base, id: "never" },
      {
        ...base,
        id: "empty",
        startedAt: new Date("2026-11-06T09:00:00").getTime(),
        lastActivityAt: new Date("2026-11-06T09:00:00").getTime(),
        endedAt: new Date("2026-11-06T10:00:00").getTime(),
        endReason: "auto",
      },
    ],
    new Date("2026-11-06T12:00:00").getTime(),
  );
  expect(kpi.total).toBe(2);
  expect(kpi.notStarted).toBe(1);
  expect(kpi.empty).toBe(1);
  expect(kpi.actual).toBe(0);
});
