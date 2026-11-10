import type { Meeting } from "./store";
import {
  AUTO_CLOSE_AT,
  REMINDER_FALLBACK_AFTER_MIN,
  REMINDER_MIN_AFTER_END_MIN,
  WORKDAY_END,
  WORKDAY_START,
  PENDING_TO_PAST_DAYS,
  RESUME_SAME_DAY_ONLY,
} from "./meetingWrapUp.config";
import { lastActivity, plannedEnd } from "./meeting-wrap-up";
export interface CalendarAppointment {
  startsAt: number;
  endsAt?: number;
}
/** TODO(api): replace this sole mock boundary with the chair's connected calendar. */
export function chairCalendar(_meeting: Meeting): CalendarAppointment[] {
  void _meeting;
  return [];
}
function clockOn(day: number, clock: string) {
  const date = new Date(day);
  const [hours, minutes] = clock.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}
export function reminderAt(meeting: Meeting, calendar: CalendarAppointment[] = chairCalendar(meeting)) {
  const end = plannedEnd(meeting);
  const late = clockOn(end, "16:00");
  if (end > late) {
    const date = new Date(end);
    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0 || date.getDay() === 6);
    return clockOn(date.getTime(), WORKDAY_START);
  }
  const earliest = end + REMINDER_MIN_AFTER_END_MIN * 60000;
  const next =
    calendar
      .filter((a) => a.startsAt >= end)
      .map((a) => Math.max(a.startsAt, earliest))
      .sort((a, b) => a - b)[0] ?? Infinity;
  return Math.max(earliest, Math.min(next, end + REMINDER_FALLBACK_AFTER_MIN * 60000, clockOn(end, WORKDAY_END)));
}
export const autoCloseAt = (meeting: Meeting) =>
  Math.max(clockOn(plannedEnd(meeting), AUTO_CLOSE_AT), plannedEnd(meeting) + 8 * 3600000);
export function registrationState(
  meeting: Meeting,
  now = Date.now(),
): "recorded" | "empty" | "not_started" | "upcoming" {
  if (meeting.outcome === "held") return "recorded";
  if (!meeting.startedAt && !meeting.run) return now >= plannedEnd(meeting) + 30 * 60000 ? "not_started" : "upcoming";
  const start = meeting.startedAt ?? meeting.run!.startedAt;
  return (lastActivity(meeting) ?? start) > start || meeting.filledAfterwards ? "recorded" : "empty";
}
export const pendingExpired = (meeting: Meeting, now = Date.now()) =>
  now - (meeting.endedAt ?? plannedEnd(meeting)) >= PENDING_TO_PAST_DAYS * 86400000;
export function canResume(meeting: Meeting, now = Date.now()) {
  const end = meeting.endedAt ?? plannedEnd(meeting);
  return (
    meeting.followUpStatus === "pending" &&
    !!meeting.startedAt &&
    (!RESUME_SAME_DAY_ONLY || new Date(end).toDateString() === new Date(now).toDateString())
  );
}
export function resumeMeeting(meeting: Meeting, now = Date.now()): Meeting {
  if (!canResume(meeting, now)) return meeting;
  const items = meeting.blocks.flatMap((b) => b.items);
  const current = items.find((i) => i.runStatus !== "done") ?? items[0];
  return {
    ...meeting,
    endedAt: undefined,
    endReason: undefined,
    autoClosedAt: undefined,
    endTimeConfirmed: undefined,
    reminderQueuedAt: undefined,
    wrapUpOpen: false,
    minimized: false,
    lastActivityAt: now,
    run: {
      startedAt: meeting.startedAt!,
      stepStartedAt: now,
      currentId: current?.id ?? null,
      doneIds: items.filter((i) => i.runStatus === "done").map((i) => i.id),
      postponedIds: [],
      actuals: meeting.run?.actuals ?? {},
    },
  };
}
export function isChair(meeting: Meeting, userId = "jp") {
  return (
    (meeting.attendance?.find((p) => p.role === "Voorzitter")?.personId ??
      meeting.startedBy ??
      meeting.participants[0]) === userId
  );
}
export function pendingForChair(meeting: Meeting, now = Date.now(), userId = "jp") {
  return (
    meeting.outcome !== "not_held" &&
    meeting.followUpStatus !== "sent" &&
    isChair(meeting, userId) &&
    (meeting.followUpStatus === "pending" || registrationState(meeting, now) === "not_started") &&
    !pendingExpired(meeting, now)
  );
}
