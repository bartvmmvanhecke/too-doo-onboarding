import { newBlock } from "@/lib/agenda";
import { formatTime } from "@/lib/time";
import { toISO } from "@/lib/date";
import { isDemoEnvironment } from "@/lib/demo-environment";
import { useStore, type Meeting } from "@/lib/store";
import { initialWrapUpDraft } from "@/lib/wrap-up-flow";

/** Isolated demo series; leaves other appointments intact when switching scenarios. */
export function loadPlanningScenario(meetingId: string, scheduled: boolean) {
  if (!isDemoEnvironment()) return;
  const state = useStore.getState();
  const current = state.meetings.find((meeting) => meeting.id === meetingId);
  if (!current) return;
  const date = new Date(`${current.date || toISO(new Date())}T12:00:00`);
  date.setDate(date.getDate() + 7);
  const seriesId = `planning-preview-${meetingId}`;
  const nextId = `${seriesId}-next`;
  const next: Meeting = {
    id: nextId,
    seriesId,
    name: current.name,
    type: current.type,
    recurrence: current.recurrence,
    date: toISO(date),
    time: current.time ?? 540,
    duration: current.duration,
    participants: current.participants,
    actions: [],
    blocks: [newBlock("topics", { title: "Lopende zaken" })],
    run: null,
    held: false,
    invited: true,
    showWelcome: false,
  };
  const draft = initialWrapUpDraft(current, state.meetings);
  const updated: Meeting = {
    ...current,
    seriesId,
    wrapUpDraft: {
      ...draft,
      nextDate: scheduled ? next.date! : "",
      nextTime: scheduled ? formatTime(next.time!) : "",
      nextName: current.name,
      nextDuration: current.duration,
      noNext: false,
    },
  };
  useStore.setState({
    meetings: [
      ...state.meetings
        .filter((meeting) => meeting.id !== nextId)
        .map((meeting) => (meeting.id === meetingId ? updated : meeting)),
      ...(scheduled ? [next] : []),
    ],
  });
}
