import { newBlock, newItem, type Entry } from "../agenda";
import { autoCloseDueAt, unattended } from "../meeting-wrap-up";
import { chimeEnabled, setChimeEnabled } from "../audio/chime-state";
import { timerEnd, meetingNow } from "../meeting-clock";
import { isDemoEnvironment } from "../demo-environment";
import { AVATAR_COLORS, USER_PERSON_ID, type Person } from "../mock-data";
import { useStore, type Meeting, type Action } from "../store";

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
  const fixturePeople: Person[] = ["Rashmi", "Kelvin", "Florianne"].map((name, i) => ({
    id: `wrap-demo-${i}`,
    name,
    initials: name.slice(0, 2).toUpperCase(),
    color: AVATAR_COLORS[i],
  }));
  const entry = (id: string, kind: Entry["kind"], text: string, ownerId: string | null, date: string): Entry => ({
    id,
    kind,
    text,
    ownerId,
    date,
    createdAt: start + elapsed * 60000,
    ...(kind === "action" ? { actionId: `action-${id}` } : {}),
  });
  const entries: Record<number, Entry[]> =
    kind === "start"
      ? {}
      : {
          2: [entry("budget", "action", "Budgetvoorstel Q1 bijwerken", fixturePeople[0].id, "18 nov")],
          4: [
            entry("audit", "decision", "Veiligheidsaudit uitbesteden aan externe partner", null, "15 dec"),
            entry("offertes", "action", "Offertes externe auditors opvragen", fixturePeople[1].id, "20 nov"),
          ],
          5: [
            entry("opleiding", "decision", "Opleidingsbudget Q4 vrijgeven", null, "30 nov"),
            entry(
              "inschrijvingen",
              "action",
              "Inschrijvingen opleiding verzamelen per afdeling",
              fixturePeople[2].id,
              "20 nov",
            ),
            entry("communicatie", "action", "Communicatie naar teams over audit", null, "25 nov"),
          ],
          6: [entry("kerst", "note", "Kerstdrink valt in week 51", null, "")],
        };
  const titles = [
    "Opening en vorige besluiten",
    "Budgetvoorstel Q1",
    "Strategische prioriteiten",
    "Veiligheidsaudit",
    "Opleidingsbudget Q4",
    "Varia",
  ];
  const handled =
    kind === "start" ? [] : kind === "jumps" ? [1, 4] : kind === "last-middle" ? [1, 2, 4, 5, 6] : [1, 2, 3, 4, 5];
  const actions: Action[] = Object.values(entries)
    .flat()
    .filter((e) => e.kind === "action")
    .map((e) => ({ id: e.actionId!, what: e.text, ownerId: e.ownerId, deadline: e.date, done: false }));
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
    blocks: [
      newBlock("topics", {
        id: "wrap-demo-block",
        title: "Lopende zaken",
        items: titles.map((text, i) =>
          newItem(text, {
            id: `wrap-demo-${i + 1}`,
            duration: 10,
            ownerIds: [],
            runStatus: handled.includes(i + 1) ? "done" : "open",
            visitedAt:
              handled.includes(i + 1) ||
              (kind === "jumps" && [2, 5].includes(i + 1)) ||
              (kind === "last-middle" && i === 2) ||
              (kind === "last" && i === 5)
                ? start + elapsed * 60000
                : undefined,
            handledAt: handled.includes(i + 1) ? start + elapsed * 60000 : undefined,
            entries: entries[i + 1] ?? [],
          }),
        ),
      }),
    ],
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
