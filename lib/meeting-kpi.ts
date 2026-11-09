import type { Meeting } from "./store";
import { OUTLIER_FACTOR } from "./meetingWrapUp.config";
import { computeEnd, actualDuration } from "./meeting-wrap-up";
export function closureStatus(m: Meeting): "afgerond" | "automatisch" | "geen activiteit" {
  const historicalOutlier =
    !m.endReason &&
    m.endedAt !== undefined &&
    m.startedAt !== undefined &&
    m.endedAt - m.startedAt > OUTLIER_FACTOR * m.duration * 60_000;
  if (m.noActivity || ((m.endReason === "auto" || historicalOutlier) && computeEnd(m).noActivity))
    return "geen activiteit";
  return m.endReason === "auto" ? "automatisch" : "afgerond";
}
export function meetingKpi(meetings: Meeting[]) {
  const closed = meetings.filter((m) => m.endedAt !== undefined);
  const rows = [...new Set(closed.map((m) => m.type))].map((type) => {
    const group = closed.filter((m) => m.type === type);
    const durations = group.map((m) => actualDuration(m));
    return {
      type,
      count: group.length,
      scheduled: group.reduce((n, m) => n + m.duration, 0) / 60,
      actual: durations.reduce<number>((n, d) => n + (d ?? 0), 0) / 3600000,
      outliers: durations.filter((d) => d === null).length,
      manual: group.every((m) => m.endReason === "manual"),
      closures: (["afgerond", "automatisch", "geen activiteit"] as const)
        .map((label) => ({ label, count: group.filter((m) => closureStatus(m) === label).length }))
        .filter((v) => v.count > 0),
      raw:
        group.reduce(
          (n, m) => n + Math.max(0, (m.autoClosedAt ?? m.endedAt!) - (m.startedAt ?? m.run?.startedAt ?? m.endedAt!)),
          0,
        ) / 3600000,
    };
  });
  return {
    total: meetings.length,
    scheduled: meetings.reduce((n, m) => n + m.duration, 0) / 60,
    actual: rows.reduce((n, r) => n + r.actual, 0),
    automatic: closed.filter((m) => m.endReason === "auto").length,
    rows,
  };
}
