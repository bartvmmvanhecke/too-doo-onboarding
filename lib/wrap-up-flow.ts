import { agendaItems, carryForward, isHandled, nextInSeries, suggestDecision } from "./meeting-wrap-up";
import { newBlock } from "./agenda";
import type { Meeting, WrapUpDraft } from "./store";
import { USER_PERSON_ID } from "./mock-data";
import { formatTime } from "./time";

export function initialWrapUpDraft(m: Meeting, meetings: Meeting[]): WrapUpDraft {
  const next = nextInSeries(m, meetings);
  return {
    step: 0,
    entry: "later",
    decisions: Object.fromEntries(
      agendaItems(m)
        .filter((i) => !isHandled(m, i.id))
        .map((i) => [i.id, suggestDecision(i)]),
    ),
    nextName: next?.name ?? m.name,
    nextDuration: next?.duration ?? m.duration,
    nextDate: next?.date ?? "",
    nextTime: next ? formatTime(next.time ?? m.time ?? 540) : "",
    noNext: false,
    summary: factualSummary(m),
    recipientIds: m.attendance?.filter((p) => p.present).map((p) => p.personId) ?? m.participants,
    ...m.wrapUpDraft,
  };
}
/** Local factual fallback; every sentence refers only to recorded content. TODO(api): grounded AI summary generation. */
export function factualSummary(m: Meeting) {
  const entries = agendaItems(m).flatMap((i) => i.entries);
  const decisions = entries.filter((e) => e.kind === "decision" && e.text.trim());
  const notes = entries.filter((e) => e.kind === "note" && e.text.trim());
  return [
    decisions.length
      ? `Beslissingen: ${decisions.map((e) => e.text).join("; ")}.`
      : "Er zijn geen beslissingen vastgelegd.",
    m.actions.length ? `Acties: ${m.actions.map((a) => a.what).join("; ")}.` : "Er zijn geen acties vastgelegd.",
    notes.length ? `Notities: ${notes.map((e) => e.text).join("; ")}.` : "Er zijn geen notities vastgelegd.",
  ].join(" ");
}
export function assignMissingOwners(m: Meeting): Meeting {
  const chair = m.attendance?.find((p) => p.role === "Voorzitter")?.personId ?? m.startedBy ?? USER_PERSON_ID;
  const missing = new Set(m.actions.filter((a) => !a.ownerId).map((a) => a.id));
  return {
    ...m,
    actions: m.actions.map((a) => (missing.has(a.id) ? { ...a, ownerId: chair } : a)),
    blocks: m.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) => ({
        ...i,
        entries: i.entries.map((e) => (e.actionId && missing.has(e.actionId) ? { ...e, ownerId: chair } : e)),
      })),
    })),
  };
}
export function applyDraft(m: Meeting): Meeting {
  const draft = m.wrapUpDraft;
  return {
    ...assignMissingOwners(m),
    blocks: assignMissingOwners(m).blocks.map((b) => ({
      ...b,
      items: b.items.map((i) => {
        const choice = draft?.decisions?.[i.id];
        return choice === "done"
          ? { ...i, runStatus: "done" as const, carry: undefined }
          : choice
            ? { ...i, runStatus: "open" as const, carry: choice }
            : i;
      }),
    })),
  };
}
export function planningError(draft: WrapUpDraft): string | null {
  if (draft.noNext || !draft.nextDate) return null;
  if (!draft.nextName?.trim()) return "Vul een naam voor de volgende vergadering in.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.nextTime ?? "")) return "Kies een geldige starttijd.";
  if (!Number.isInteger(draft.nextDuration) || draft.nextDuration! < 5 || draft.nextDuration! > 1440)
    return "Kies een duur tussen 5 en 1440 minuten.";
  return null;
}
/** One pure transaction. TODO(api): persist atomically and enqueue follow-up only for an explicit send click. */
export function finishWrapUp(m: Meeting, meetings: Meeting[], status: "sent" | "saved", now = Date.now()): Meeting[] {
  const draft = initialWrapUpDraft(m, meetings);
  const error = planningError(draft);
  if (error) throw new Error(error);
  let updated = applyDraft({ ...m, wrapUpDraft: draft });
  let result = meetings.map((n) => (n.id === m.id ? updated : n));
  let next = nextInSeries(m, result);
  if (!draft.noNext && draft.nextDate) {
    const [hour, minute] = (draft.nextTime ?? "09:00").split(":").map(Number);
    if (next) {
      next = {
        ...next,
        name: draft.nextName!.trim(),
        duration: draft.nextDuration!,
        date: draft.nextDate,
        time: hour * 60 + minute,
      };
      result = result.map((n) => (n.id === next!.id ? next! : n));
    } else {
      next = {
        ...m,
        id: `${m.id}-volgende-${draft.nextDate}`,
        name: draft.nextName!.trim(),
        duration: draft.nextDuration!,
        seriesId: m.seriesId ?? m.id,
        date: draft.nextDate,
        time: hour * 60 + minute,
        startedAt: undefined,
        endedAt: undefined,
        lastActivityAt: undefined,
        autoClosedAt: undefined,
        endReason: undefined,
        noActivity: undefined,
        endTimeConfirmed: undefined,
        followUpStatus: undefined,
        followUpSentAt: undefined,
        run: null,
        held: false,
        minimized: false,
        wrapUpOpen: false,
        wrapUpDraft: undefined,
        demoTimeOffsetMs: undefined,
        demoScenarioRevision: undefined,
        privateNotes: [],
        attendance: undefined,
        actions: [],
        blocks: [newBlock("topics", { title: "Lopende zaken" })],
      };
      updated = { ...updated, seriesId: next.seriesId };
      result = [...result.map((n) => (n.id === updated.id ? updated : n)), next];
    }
  }
  // Without a next appointment, the original carry=next records form the persisted "Bewaard voor later" list.
  // TODO(api): use a standalone backlog collection; reconcile these records when a next appointment is created.
  if (!draft.noNext && next) result = carryForward(updated, result);
  return result.map((n) =>
    n.id === m.id
      ? {
          ...updated,
          followUpStatus: status,
          followUpSentAt: status === "sent" ? now : undefined,
          held: true,
          run: null,
          minimized: false,
          wrapUpOpen: false,
          wrapUpDraft: { ...draft, entry: "later" },
        }
      : n,
  );
}
export function followUpContent(m: Meeting, meetings: Meeting[], names: Record<string, string>) {
  const draft = initialWrapUpDraft(m, meetings);
  const next = nextInSeries(m, meetings);
  return {
    summary: draft.summary ?? "",
    decisions: agendaItems(m)
      .flatMap((i) => i.entries)
      .filter((e) => e.kind === "decision")
      .map((e) => e.text),
    actions: m.actions.map(
      (a) =>
        `${a.what} · ${names[a.ownerId ?? m.startedBy ?? USER_PERSON_ID] ?? "Voorzitter"} · ${a.deadline || "Geen datum"}`,
    ),
    nextDate: draft.noNext ? "" : (draft.nextDate ?? next?.date ?? ""),
    nextTime: draft.nextTime ?? "",
    nextName: draft.nextName ?? "",
    nextDuration: draft.nextDuration ?? m.duration,
    carried: agendaItems(m)
      .filter((i) => draft.decisions?.[i.id] === "next" || (!isHandled(m, i.id) && i.carry === "next"))
      .map((i) => i.text),
    recipientIds: draft.recipientIds ?? [],
    askScore: draft.askScore ?? false,
  };
}
/** Reattach saved points when a new appointment in the series becomes available. */
export function reconcileBacklog(meetings: Meeting[]): Meeting[] {
  let result = meetings;
  for (const m of meetings) {
    if (m.followUpStatus !== "sent" && m.followUpStatus !== "saved") continue;
    const next = nextInSeries(m, result);
    if (!next) continue;
    const missing = agendaItems(m).filter(
      (i) =>
        i.carry === "next" &&
        !isHandled(m, i.id) &&
        !agendaItems(next).some((n) => n.carriedSourceId === `${m.id}:${i.id}`),
    );
    if (missing.length) result = carryForward(m, result);
  }
  return result;
}
