import type { Meeting } from "./store";
import { actualDuration } from "./meeting-wrap-up";
import { registrationState } from "./meeting-schedule";
export function meetingKpi(meetings: Meeting[], now = Date.now()) {
  const eligible = meetings.filter((m) => m.outcome !== "not_held");
  const closed = eligible.filter((m) => m.endedAt !== undefined || registrationState(m, now) === "not_started");
  const rows = [...new Set(closed.map((m) => m.type))].map((type) => {
    const group = closed.filter((m) => m.type === type);
    const durations = group.map((m) => actualDuration(m, now));
    return {
      type,
      count: group.length,
      scheduled: group.reduce((n, m) => n + m.duration, 0) / 60,
      actual: durations.reduce<number>((n, d) => n + (d ?? 0), 0) / 3600000,
      outliers: durations.filter((d) => d === null).length,
      manual: group.every((m) => m.endReason === "manual"),
      raw:
        group.reduce(
          (n, m) =>
            n +
            Math.max(0, (m.autoClosedAt ?? m.endedAt ?? now) - (m.startedAt ?? m.run?.startedAt ?? m.endedAt ?? now)),
          0,
        ) / 3600000,
      empty: group.filter((m) => registrationState(m, now) === "empty").length,
      notStarted: group.filter((m) => registrationState(m, now) === "not_started").length,
    };
  });
  return {
    total: eligible.length,
    known: eligible.filter((m) => m.endedAt && actualDuration(m, now) !== null).length,
    scheduled: eligible.reduce((n, m) => n + m.duration, 0) / 60,
    actual: rows.reduce((n, r) => n + r.actual, 0),
    automatic: closed.filter((m) => m.endReason === "auto").length,
    pending: eligible.filter((m) => m.followUpStatus === "pending").length,
    empty: eligible.filter((m) => registrationState(m, now) === "empty").length,
    notStarted: eligible.filter((m) => registrationState(m, now) === "not_started").length,
    rows,
  };
}
