import { expect, it } from "vitest";
import { closureStatus, meetingKpi } from "./meeting-kpi";
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
  expect(meetingKpi(data)).toMatchObject({ actual: 6, automatic: 1, total: 3 });
  expect(meetingKpi(data).rows[0]).toMatchObject({ outliers: 0, manual: false });
  expect(closureStatus(data[2])).toBe("geen activiteit");
  expect(closureStatus(data[0])).toBe("automatisch");
});
