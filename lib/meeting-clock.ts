import { isDemoEnvironment } from "./demo-environment";
/** Offset is local prototype state, never trusted outside the demo environment. */
export function meetingNow(meeting: { demoTimeOffsetMs?: number }, now = Date.now()) {
  return now + (isDemoEnvironment() ? (meeting.demoTimeOffsetMs ?? 0) : 0);
}

import { plannedEnd } from "./meeting-wrap-up";
import type { Meeting } from "./store";
export const timerEnd = (meeting: Meeting) => Math.max(plannedEnd(meeting), meeting.overtimeUntil ?? 0);
export function elapsedClock(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds <= 3600)
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function remainingLabel(milliseconds: number) {
  return milliseconds <= 60000
    ? `nog ${Math.max(0, Math.ceil(milliseconds / 1000))} s`
    : `${Math.ceil(milliseconds / 60000)} min resterend`;
}
