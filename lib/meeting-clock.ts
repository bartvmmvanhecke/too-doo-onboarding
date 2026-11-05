import { isDemoEnvironment } from "./demo-environment";
/** Offset is local prototype state, never trusted outside the demo environment. */
export function meetingNow(meeting: { demoTimeOffsetMs?: number }, now = Date.now()) {
  return now + (isDemoEnvironment() ? (meeting.demoTimeOffsetMs ?? 0) : 0);
}
