import { createDirectieAgenda, DIRECTIE_PEOPLE } from "./directieMeetingFixture";
import { newBlock } from "../agenda";
import { autoCloseDueAt, unattended } from "../meeting-wrap-up";
import { chimeEnabled, setChimeEnabled } from "../audio/chime-state";
import { timerEnd, meetingNow } from "../meeting-clock";
import { isDemoEnvironment } from "../demo-environment";
import { USER_PERSON_ID } from "../mock-data";
import { useStore, type Meeting } from "../store";

export type WrapUpScenario = "start" | "jumps" | "last" | "last-middle" | "advance" | "last-five" | "unattended";
/** All prototype mutations and fixture data live here. No API or backend calls. */
export function loadWrapUpScenario(kind: WrapUpScenario, meetingId: string, realNow = Date.now()) {
  if (!isDemoEnvironment()) return null;
  const state = useStore.getState();
  const current = state.meetings.find((m) => m.id === meetingId);
  if (!current?.run || current.endedAt || current.minimized || current.wrapUpOpen) return null;
  if (kind === "last-five") {
    const wasEnabled = chimeEnabled();
    if (!wasEnabled) setChimeEnabled(true);
    const meeting = {
      ...current,
      demoTimeOffsetMs: timerEnd(current) - 5000 - realNow,
      demoScenarioRevision: (current.demoScenarioRevision ?? 0) + 1,
    };
    useStore.setState({ meetings: state.meetings.map((m) => (m.id === meetingId ? meeting : m)) });
    return { announcement: wasEnabled ? "Laatste 5 seconden gestart" : "Geluid aangezet voor de demo", preview: false };
  }
  if (kind === "advance") {
    const meeting = { ...current, demoTimeOffsetMs: (current.demoTimeOffsetMs ?? 0) + 5 * 60000 };
    useStore.setState({ meetings: state.meetings.map((m) => (m.id === meetingId ? meeting : m)) });
    return { announcement: "Tijd 5 minuten vooruitgezet", preview: false };
  }
  if (kind === "unattended") {
    const now = meetingNow(current, realNow);
    const activity: Meeting = { ...current, lastActivityAt: now };
    const closed = unattended(activity, autoCloseDueAt(activity));
    const meeting: Meeting = { ...closed, demoTimeOffsetMs: current.demoTimeOffsetMs ?? 0 };
    useStore.setState({ meetings: state.meetings.map((m) => (m.id === meetingId ? meeting : m)) });
    return { announcement: "Gebruiker vertrokken: vergadering automatisch afgesloten", preview: false };
  }
  const elapsed = kind === "start" ? 0 : kind === "jumps" ? 52 : 55;
  const day = new Date(realNow);
  day.setHours(9, 0, 0, 0);
  const start = day.getTime();
  const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const { blocks, actions } = createDirectieAgenda(start, elapsed);
  const fixturePeople = DIRECTIE_PEOPLE;
  const handled =
    kind === "start" ? [] : kind === "jumps" ? [1, 4] : kind === "last-middle" ? [1, 2, 4, 5, 6] : [1, 2, 3, 4, 5];
  const seriesId = `wrap-demo-series-${meetingId}`;
  const meeting: Meeting = {
    ...current,
    seriesId,
    name: "Directieoverleg",
    date,
    time: 540,
    duration: 60,
    startedAt: start,
    lastActivityAt: start + elapsed * 60000,
    demoTimeOffsetMs: start + elapsed * 60000 - realNow,
    demoScenarioRevision: (current.demoScenarioRevision ?? 0) + 1,
    overtimeUntil: undefined,
    endedAt: undefined,
    autoClosedAt: undefined,
    endReason: undefined,
    endTimeConfirmed: undefined,
    reminderQueuedAt: undefined,
    followUpStatus: "pending",
    wrapUpOpen: false,
    minimized: false,
    held: false,
    privateNotes: [],
    wrapUpDraft: undefined,
    noActivity: undefined,
    startedBy: USER_PERSON_ID,
    participants: [USER_PERSON_ID, ...fixturePeople.map((p) => p.id)],
    attendance: undefined,
    actions,
    blocks: blocks.map((block) => ({
      ...block,
      items: block.items.map((item, i) => ({
        ...item,
        runStatus: handled.includes(i + 1) ? "done" : "open",
        visitedAt:
          handled.includes(i + 1) ||
          (kind === "jumps" && [2, 5].includes(i + 1)) ||
          (kind === "last-middle" && i === 2) ||
          (kind === "last" && i === 5)
            ? start + elapsed * 60000
            : undefined,
        handledAt: handled.includes(i + 1) ? start + elapsed * 60000 : undefined,
      })),
    })),
    run: {
      startedAt: start,
      stepStartedAt: start + elapsed * 60000,
      currentId: `wrap-demo-${kind === "start" ? 1 : kind === "jumps" ? 5 : kind === "last-middle" ? 3 : 6}`,
      doneIds: handled.map((n) => `wrap-demo-${n}`),
      postponedIds: [],
      actuals: {},
    },
  };
  // Reset fixture transfers from previous scenario demonstrations as well.
  const clean = state.meetings.map((m) => ({
    ...m,
    blocks: m.blocks.map((b) => ({
      ...b,
      items: b.items.filter((i) => !i.carriedSourceId?.startsWith(`${meetingId}:wrap-demo-`)),
    })),
  }));
  const nextDate = new Date(day);
  nextDate.setDate(nextDate.getDate() + 7);
  const nextId = `${meetingId}-wrap-demo-next`;
  const next: Meeting = {
    ...meeting,
    id: nextId,
    date: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`,
    run: null,
    startedAt: undefined,
    lastActivityAt: undefined,
    demoTimeOffsetMs: undefined,
    demoScenarioRevision: undefined,
    followUpStatus: undefined,
    actions: [],
    blocks: [newBlock("topics", { title: "Lopende zaken" })],
  };
  useStore.setState({
    meetings: [...clean.filter((m) => m.id !== nextId).map((m) => (m.id === meetingId ? meeting : m)), next],
    extraPeople: [...state.extraPeople.filter((p) => !fixturePeople.some((f) => f.id === p.id)), ...fixturePeople],
  });
  return { announcement: `Scenario geladen: ${handled.length} van 6 behandeld`, preview: false };
}
