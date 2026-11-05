import { allItems, newBlock, newItem } from "./agenda";
import type { Meeting } from "./store";
import { AUTO_CLOSE_AFTER_HOURS, IDLE_BUFFER_MIN, OUTLIER_FACTOR, REMINDER_AFTER_MIN } from "./meetingWrapUp.config";

export const agendaItems = (m: Meeting) => allItems(m.blocks);
export const isHandled = (m: Meeting, id: string) =>
  agendaItems(m).find((i) => i.id === id)?.runStatus === "handled" || !!m.run?.doneIds.includes(id);
export const othersOpen = (m: Meeting, currentId: string | null) =>
  agendaItems(m).filter((i) => i.id !== currentId && !isHandled(m, i.id));
export function nextOpenItem(m: Meeting, currentId: string | null) {
  const items = agendaItems(m),
    index = items.findIndex((i) => i.id === currentId);
  return [...items.slice(index + 1), ...items.slice(0, Math.max(0, index))].find((i) => !isHandled(m, i.id)) ?? null;
}
export function plannedEnd(m: Meeting) {
  const start = m.run?.startedAt ?? m.startedAt;
  if (start !== undefined) return start + m.duration * 60_000;
  if (m.date && m.time !== null) return new Date(`${m.date}T00:00:00`).getTime() + (m.time + m.duration) * 60_000;
  return (m.startedAt ?? m.run?.startedAt ?? 0) + m.duration * 60_000;
}
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
  const activity = lastActivity(m);
  if (activity === undefined) {
    const start = m.startedAt ?? m.run?.startedAt;
    if (start === undefined || m.endedAt === undefined || m.endedAt - start > OUTLIER_FACTOR * m.duration * 60_000)
      return null;
    return m.endedAt;
  }
  return Math.min(m.endedAt ?? now, activity + IDLE_BUFFER_MIN * 60_000);
}
/** Milliseconds; null means historical outlier / insufficient data. */
export function actualDuration(m: Meeting, now = Date.now()) {
  const start = m.startedAt ?? m.run?.startedAt,
    end = effectiveEnd(m, now);
  return start === undefined || end === null ? null : Math.max(0, end - start);
}
export function navigateTo(m: Meeting, id: string, now = Date.now()): Meeting {
  if (!m.run || m.run.currentId === id) return m;
  const current = m.run.currentId;
  return {
    ...m,
    lastActivityAt: now,
    blocks: m.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) =>
        i.id === id
          ? { ...i, runStatus: "open", handledAt: undefined }
          : i.id === current
            ? { ...i, runStatus: "handled", handledAt: now }
            : i,
      ),
    })),
    run: {
      ...m.run,
      currentId: id,
      stepStartedAt: now,
      doneIds: [...new Set([...m.run.doneIds, ...(current ? [current] : [])])].filter((v) => v !== id),
    },
  };
}
export function closeManually(m: Meeting, now = Date.now()): Meeting {
  return {
    ...m,
    startedAt: m.startedAt ?? m.run?.startedAt,
    endedAt: now,
    endReason: "manual",
    followUpStatus: "pending",
    wrapUpOpen: true,
    blocks: m.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) =>
        i.id === m.run?.currentId
          ? { ...i, runStatus: "handled", handledAt: now }
          : isHandled(m, i.id)
            ? { ...i, runStatus: "handled" }
            : { ...i, carry: i.carry ?? "next" },
      ),
    })),
  };
}
/** Pure scheduler transition; actual delivery belongs to a server worker. */
export function unattended(m: Meeting, now: number): Meeting {
  if (!m.run || m.endedAt || m.followUpStatus === "sent") return m;
  const activity = lastActivity(m) ?? m.run.startedAt;
  const idle = now - activity;
  if (now > plannedEnd(m) + AUTO_CLOSE_AFTER_HOURS * 3_600_000 && idle > AUTO_CLOSE_AFTER_HOURS * 3_600_000) {
    return {
      ...m,
      startedAt: m.startedAt ?? m.run.startedAt,
      endedAt: activity + IDLE_BUFFER_MIN * 60_000,
      autoClosedAt: now,
      lastActivityAt: activity,
      endReason: "auto",
      followUpStatus: "pending",
      run: null,
      minimized: false,
      wrapUpOpen: false,
      held: true,
      blocks: m.blocks.map((b) => ({
        ...b,
        items: b.items.map((i) => (isHandled(m, i.id) ? { ...i, runStatus: "handled" } : { ...i, carry: "next" })),
      })),
    };
  }
  if (!m.reminderQueuedAt && now > plannedEnd(m) + REMINDER_AFTER_MIN * 60_000 && idle > REMINDER_AFTER_MIN * 60_000)
    return { ...m, reminderQueuedAt: now };
  return m;
}
export function nextInSeries(m: Meeting, meetings: Meeting[]) {
  if (!m.seriesId || !m.date) return null;
  return (
    meetings
      .filter((n) => n.id !== m.id && n.seriesId === m.seriesId && n.date && n.date > m.date!)
      .sort((a, b) => a.date!.localeCompare(b.date!) || (a.time ?? 0) - (b.time ?? 0))[0] ?? null
  );
}
/** Idempotent transfer; originals remain available in the report. */
export function carryForward(m: Meeting, meetings: Meeting[]): Meeting[] {
  const next = nextInSeries(m, meetings);
  if (!next) return meetings; // TODO(api): persist carry=next in the unassigned "Bewaren voor later" list.
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
        blocks.find((b) => b.kind === "topics" && b.title === block.title) ??
        blocks.find((b) => b.kind === "topics" && b.title === "Lopende zaken");
      if (!target) {
        target = newBlock("topics", { title: "Lopende zaken" });
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
