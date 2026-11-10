import { allItems, newBlock, newItem } from "./agenda";
import { autoCloseAt, reminderAt } from "./meeting-schedule";
import type { Meeting } from "./store";
import { IDLE_BUFFER_MIN, OUTLIER_FACTOR } from "./meetingWrapUp.config";

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
  const start = m.run?.startedAt ?? m.startedAt;
  if (start !== undefined) return start + m.duration * 60_000;
  if (m.date && m.time !== null) return new Date(`${m.date}T00:00:00`).getTime() + (m.time + m.duration) * 60_000;
  return (m.startedAt ?? m.run?.startedAt ?? 0) + m.duration * 60_000;
}
export function lastActivity(m: Meeting) {
  const stamps = [
    m.lastActivityAt,
    ...agendaItems(m).flatMap((i) => [i.visitedAt, i.updatedAt, ...i.entries.map((e) => e.updatedAt ?? e.createdAt)]),
    ...m.actions.map((a) => a.updatedAt),
  ].filter((v): v is number => v !== undefined);
  // TODO(api): fetch historical updatedAt records from the API; use all supplied timestamps locally.
  return stamps.length ? Math.max(...stamps) : undefined;
}
export function effectiveEnd(m: Meeting, now = Date.now()): number | null {
  if (m.outcome === "not_held") return null;
  const historicalStart = m.startedAt ?? m.run?.startedAt;
  if (
    lastActivity(m) === undefined &&
    historicalStart !== undefined &&
    m.endedAt !== undefined &&
    !m.endTimeConfirmed &&
    !m.filledAfterwards &&
    m.endedAt - historicalStart > OUTLIER_FACTOR * m.duration * 60000
  )
    return null;
  const observedStart = m.startedAt ?? m.run?.startedAt;
  if (observedStart !== undefined && lastActivity(m) === observedStart && !m.endTimeConfirmed && !m.filledAfterwards)
    return null;
  if (m.endReason === "manual" || m.endTimeConfirmed) return m.endedAt ?? null;
  const activity = lastActivity(m);
  const startTime = m.startedAt ?? m.run?.startedAt;
  if (activity !== undefined && startTime !== undefined && activity <= startTime) return null;
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
export const isLastOpen = (m: Meeting, currentId: string | null) =>
  !!currentId && othersOpen(m, currentId).length === 0;
export const suggestDecision = (item: import("./agenda").AgendaItem): "done" | "next" =>
  item.visitedAt !== undefined && item.entries.length > 0 ? "done" : "next";
export const needsDecisions = (m: Meeting, meetings: Meeting[] = []) =>
  othersOpen(m, null).length > 0 || m.actions.some((a) => !a.ownerId) || !nextInSeries(m, meetings)?.date;
export function navigateTo(m: Meeting, id: string, now = Date.now()): Meeting {
  if (!m.run || m.run.currentId === id) return m;
  return {
    ...m,
    lastActivityAt: now - (m.lastActivityAt ?? 0) >= 30000 ? now : m.lastActivityAt,
    blocks: m.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) => (i.id === id ? { ...i, visitedAt: i.visitedAt ?? now } : i)),
    })),
    run: {
      ...m.run,
      currentId: id,
      stepStartedAt: now,
      actuals: m.run.currentId
        ? {
            ...m.run.actuals,
            [m.run.currentId]: (m.run.actuals[m.run.currentId] ?? 0) + Math.max(0, now - m.run.stepStartedAt) / 1000,
          }
        : m.run.actuals,
    },
  };
}
export function completeCurrent(m: Meeting, now = Date.now()): Meeting {
  if (!m.run?.currentId) return m;
  const id = m.run.currentId;
  const completed: Meeting = {
    ...m,
    lastActivityAt: now,
    blocks: m.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) =>
        i.id === id ? { ...i, runStatus: "done", doneAt: now, visitedAt: i.visitedAt ?? now } : i,
      ),
    })),
    run: {
      ...m.run,
      doneIds: [...new Set([...m.run.doneIds, id])],
      actuals: { ...m.run.actuals, [id]: (now - m.run.stepStartedAt) / 1000 },
    },
  };
  const next = nextOpenItem(completed, id);
  return { ...completed, run: { ...completed.run!, currentId: next?.id ?? null, stepStartedAt: now } };
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
        isHandled(m, i.id)
          ? { ...i, runStatus: "done" }
          : { ...i, decision: i.decision ?? suggestDecision(i), carry: i.carry ?? "next" },
      ),
    })),
  };
}
/** Pure scheduler transition; actual delivery belongs to a server worker. */
export function unattended(m: Meeting, now: number): Meeting {
  if (m.followUpStatus === "sent" || m.outcome === "not_held") return m;
  if (!m.run && !m.startedAt && !m.endedAt) {
    if (now >= plannedEnd(m) + 30 * 60000 && !m.reminderQueuedAt)
      return { ...m, followUpStatus: "pending", reminderQueuedAt: now };
    return m;
  }
  if (m.endedAt || !m.run) return m;
  const activity = lastActivity(m) ?? m.run.startedAt;
  if (now >= autoCloseAt(m) && now - activity >= IDLE_BUFFER_MIN * 60000) {
    const end = effectiveEnd(m, now);
    return {
      ...m,
      startedAt: m.startedAt ?? m.run.startedAt,
      endedAt: end ?? plannedEnd(m),
      autoClosedAt: now,
      endReason: "auto",
      followUpStatus: "pending",
      run: null,
      minimized: false,
      wrapUpOpen: false,
      held: end !== null,
      reminderQueuedAt: m.reminderQueuedAt ?? now,
      blocks: m.blocks.map((b) => ({
        ...b,
        items: b.items.map((i) =>
          isHandled(m, i.id) ? { ...i, runStatus: "done" } : { ...i, decision: suggestDecision(i) },
        ),
      })),
    };
  }
  if (!m.reminderQueuedAt && now >= reminderAt(m)) return { ...m, reminderQueuedAt: now };
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
  if (m.outcome === "not_held" || (actualDuration(m) === null && !m.filledAfterwards)) return meetings;
  if (!next) return meetings; // TODO(api): persist carry=next in the unassigned "Bewaren voor later" list.
  const dropped = new Set(
    agendaItems(m)
      .filter((i) => i.decision === "drop" || i.decision === "done" || i.carry === "drop")
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
        item.decision === "drop" ||
        item.decision === "done" ||
        blocks.some((b) => b.items.some((i) => i.carriedSourceId === source))
      )
        continue;
      let target =
        blocks.find((b) => b.kind === "topics" && b.title === block.title) ??
        blocks.find((b) => b.kind === "topics" && b.title === "Lopende zaken");
      if (!target) {
        target = newBlock("topics", { title: block.title });
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
