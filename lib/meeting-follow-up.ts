import { create } from "zustand";
import type { Meeting } from "./store";
import { useStore } from "./store";
import { carryForward, isHandled, suggestDecision } from "./meeting-wrap-up";
import { USER_PERSON_ID } from "./mock-data";

export function prepareFollowUp(meeting: Meeting, now = Date.now()): Meeting {
  const chair =
    meeting.attendance?.find((p) => p.role === "Voorzitter")?.personId ?? meeting.startedBy ?? USER_PERSON_ID;
  return {
    ...meeting,
    outcome: "held",
    followUpStatus: "sent",
    followUpSentAt: now,
    held: true,
    run: null,
    minimized: false,
    wrapUpOpen: false,
    actions: meeting.actions.map((a) => ({ ...a, ownerId: a.ownerId || chair })),
    blocks: meeting.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) => {
        const decision = isHandled(meeting, i.id) ? "done" : (i.decision ?? suggestDecision(i));
        return {
          ...i,
          decision,
          runStatus: decision === "done" ? "done" : "open",
          doneAt: decision === "done" ? (i.doneAt ?? now) : undefined,
          carry: decision === "done" ? undefined : decision,
          entries: i.entries.map((e) => (e.kind === "action" ? { ...e, ownerId: e.ownerId || chair } : e)),
        };
      }),
    })),
  };
}
export const useFollowUpUndo = create<{ meetingId: string | null; before: Meeting[]; expiresAt: number }>(() => ({
  meetingId: null,
  before: [],
  expiresAt: 0,
}));
export function sendFollowUp(id: string, undoable = false, now = Date.now()) {
  const before = useStore.getState().meetings;
  const meeting = before.find((m) => m.id === id);
  if (!meeting) return;
  const prepared = prepareFollowUp(meeting, now);
  // TODO(api): transactional outbox; participant-specific delivery and retraction during the 10-second undo window.
  useStore.setState({
    meetings: carryForward(
      prepared,
      before.map((m) => (m.id === id ? prepared : m)),
    ),
  });
  useFollowUpUndo.setState({ meetingId: undoable ? id : null, before, expiresAt: now + 10000 });
}
export function undoFollowUp(now = Date.now()) {
  const undo = useFollowUpUndo.getState();
  if (!undo.meetingId || now > undo.expiresAt) return false;
  useStore.setState({
    meetings: undo.before.map((m) =>
      m.id === undo.meetingId ? { ...m, wrapUpOpen: true, followUpStatus: "pending", followUpSentAt: undefined } : m,
    ),
  });
  useFollowUpUndo.setState({ meetingId: null, before: [], expiresAt: 0 });
  return true;
}
