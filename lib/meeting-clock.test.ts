import { expect, it } from "vitest";
import { elapsedClock, remainingLabel, timerEnd } from "./meeting-clock";
import type { Meeting } from "./store";
it("formatteert seconden, uurgrens en afgeronde resterende tijd", () => {
  expect(elapsedClock(3595000)).toBe("59:55");
  expect(elapsedClock(3600000)).toBe("60:00");
  expect(elapsedClock(3601000)).toBe("1:00:01");
  expect(remainingLabel(5000)).toBe("nog 5 s");
  expect(remainingLabel(61000)).toBe("2 min resterend");
  expect(timerEnd({ startedAt: 1000, duration: 60, overtimeUntil: 4501000 } as Meeting)).toBe(4501000);
});
