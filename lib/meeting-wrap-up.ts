import { allItems, newBlock, newItem, type AgendaItem } from "./agenda";
import type { Meeting } from "./store";
import { AUTO_CLOSE_IDLE_MIN, IDLE_BUFFER_MIN, OUTLIER_FACTOR, PENDING_TO_PAST_DAYS } from "./meetingWrapUp.config";

export const agendaItems = (m: Meeting) => allItems(m.blocks);
export const isHandled = (m: Meeting, id: string) =>
  agendaItems(m).find((i) => i.id === id)?.runStatus === "done" || !!m.run?.doneIds.includes(id);
export const othersOpen = (m: Meeting, currentId: string | null) =>
  agendaItems(m).filter((i) => i.id !== currentId && !isHandled(m, i.id));
export function nextOpenItem(m: Meeting, currentId: string | null) {
  const items = agendaItems(m),
    index = items.findIndex((i) => i.id === currentId);
  return [...items.slice(index + 1), ...items.slice(0, Math.max(0, index))].find((i) => !isHandled(m, i.id)) ?? null;
}
export function plannedEnd(m: Meeting) {
  if (m.date && m.time !== null) return new Date(`${m.date}T00:00:00`).getTime() + (m.time + m.duration) * 60_000;
  return (m.startedAt ?? m.run?.startedAt ?? 0) + m.duration * 60_000;
}
export const activityStamp = (m: Meeting, now: number) =>
  m.lastActivityAt === undefined || now - m.lastActivityAt >= 30_000 ? now : m.lastActivityAt;
export const isLastOpen = (m: Meeting, currentId: string) => othersOpen(m, currentId).length === 0;
export const suggestDecision = (item: AgendaItem): "done" | "next" =>
  item.visitedAt !== undefined &&
  item.entries.some((e) => ["decision", "action", "note"].includes(e.kind) && e.text.trim())
    ? "done"
    : "next";
export const isChair = (m: Meeting, userId: string) =>
  m.attendance?.some((p) => p.personId === userId && p.role === "Voorzitter") ??
  (!m.startedBy || m.startedBy === userId);
export const isPending = (m: Meeting, now = Date.now()) =>
  m.endedAt !== undefined && m.followUpStatus === "pending" && now - m.endedAt < PENDING_TO_PAST_DAYS * 86_400_000;
export function computeEnd(m: Meeting): { endedAt: number; noActivity: boolean } {
  const start = m.startedAt ?? m.run?.startedAt ?? 0;
  const activity = lastActivity(m);
  const noActivity = activity === undefined || activity <= start;
  return {
    endedAt: noActivity ? plannedEnd(m) : Math.max(plannedEnd(m), activity + IDLE_BUFFER_MIN * 60_000),
    noActivity,
  };
}
export const autoCloseDueAt = (m: Meeting) =>
  Math.max(plannedEnd(m), lastActivity(m) ?? m.startedAt ?? m.run?.startedAt ?? plannedEnd(m)) +
  AUTO_CLOSE_IDLE_MIN * 60_000;

export function lastActivity(m: Meeting) {
  if (m.lastActivityAt !== undefined) return m.lastActivityAt;
  const stamps = [
    ...agendaItems(m).flatMap((i) => [i.updatedAt, ...i.entries.map((e) => e.updatedAt ?? e.createdAt)]),
    ...m.actions.map((a) => a.updatedAt),
  ].filter((v): v is number => v !== undefined);
  // TODO(api): fetch historical updatedAt records from the API; use all supplied timestamps locally.
  return stamps.length ? Math.max(...stamps) : undefined;
}
export function effectiveEnd(m: Meeting, now = Date.now()): number | null {
  if (m.endReason === "manual" || m.endTimeConfirmed) return m.endedAt ?? null;
  if (m.endReason === "auto") return computeEnd(m).endedAt;
  const activity = lastActivity(m);
  const start = m.startedAt ?? m.run?.startedAt;
  if (start === undefined) return null;
  if (activity !== undefined || (m.endedAt ?? now) - start > OUTLIER_FACTOR * m.duration * 60_000)
    return computeEnd(m).endedAt;
  return m.endedAt ?? null;
}
/** Milliseconds; null means historical outlier / insufficient data. */
export function actualDuration(m: Meeting, now = Date.now()) {
  const start = m.startedAt ?? m.run?.startedAt,
    end = effectiveEnd(m, now);
  return start === undefined || end === null ? null : Math.max(0, end - start);
}
export function navigateTo(m: Meeting, id: string, now = Date.now()): Meeting {
  if (!m.run || m.run.currentId === id) return m;
  return {
    ...m,
    lastActivityAt: activityStamp(m, now),
    blocks: m.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) => (i.id === id ? { ...i, visitedAt: i.visitedAt ?? now } : i)),
    })),
    run: { ...m.run, currentId: id, stepStartedAt: now },
  };
}
export function closeManually(m: Meeting, now = Date.now()): Meeting {
  return {
    ...m,
    startedAt: m.startedAt ?? m.run?.startedAt,
    endedAt: now,
    endReason: "manual",
    endTimeConfirmed: true,
    followUpStatus: "pending",
    wrapUpOpen: true,
    wrapUpDraft: { ...m.wrapUpDraft, entry: "live" },
  };
}
/** Pure scheduler transition; no mail or agenda transfers before the chair finishes. */
export function unattended(m: Meeting, now: number): Meeting {
  if (!m.run || m.endedAt !== undefined || now < autoCloseDueAt(m)) return m;
  return {
    ...m,
    ...computeEnd(m),
    startedAt: m.startedAt ?? m.run.startedAt,
    autoClosedAt: now,
    endReason: "auto",
    endTimeConfirmed: false,
    followUpStatus: "pending",
    run: null,
    minimized: false,
    wrapUpOpen: false,
    held: true,
    blocks: m.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) => (isHandled(m, i.id) ? { ...i, runStatus: "done" } : i)),
    })),
  };
}
export function nextInSeries(m: Meeting, meetings: Meeting[]) {
  if (!m.seriesId || !m.date) return null;
  return (
    meetings
      .filter(
        (n) =>
          n.id !== m.id &&
          n.seriesId === m.seriesId &&
          n.date &&
          (n.date > m.date! || (n.date === m.date && (n.time ?? 0) > (m.time ?? 0))),
      )
      .sort((a, b) => a.date!.localeCompare(b.date!) || (a.time ?? 0) - (b.time ?? 0))[0] ?? null
  );
}
/** Idempotent transfer; originals remain available in the report. */
export function carryForward(m: Meeting, meetings: Meeting[]): Meeting[] {
  const next = nextInSeries(m, meetings);
  if (!next) return meetings; // TODO(api): persist carry=next in the unassigned "Bewaard voor later" list.
  const dropped = new Set(
    agendaItems(m)
      .filter((i) => i.carry === "drop")
      .map((i) => `${m.id}:${i.id}`),
  );
  const blocks = next.blocks.map((b) => ({
    ...b,
    items: b.items.filter((i) => !i.carriedSourceId || !dropped.has(i.carriedSourceId)),
  }));
  for (const block of m.blocks)
    for (const item of block.items) {
      const source = `${m.id}:${item.id}`;
      if (
        isHandled(m, item.id) ||
        item.carry === "drop" ||
        blocks.some((b) => b.items.some((i) => i.carriedSourceId === source))
      )
        continue;
      let target =
        blocks.find((b) => b.kind === block.kind && b.title === block.title) ??
        blocks.find((b) => b.kind === "topics" && b.title === "Lopende zaken");
      if (!target) {
        target = newBlock(block.kind, { title: block.title });
        blocks.push(target);
      }
      target.items.push(
        newItem(item.text, {
          ownerIds: [...item.ownerIds],
          purposes: [...item.purposes],
          duration: item.duration,
          runStatus: "open",
          carriedFrom: m.date ?? undefined,
          carriedSourceId: source,
        }),
      );
    }
  return meetings.map((n) => (n.id === next.id ? { ...next, blocks } : n));
}
export const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
