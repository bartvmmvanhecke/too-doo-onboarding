import { createDirectieAgenda, DIRECTIE_PEOPLE } from "./directieMeetingFixture";
import { autoCloseDueAt, unattended } from "@/lib/meeting-wrap-up";
import { newBlock, newItem } from "@/lib/agenda";
import { toISO } from "@/lib/date";
import { isDemoEnvironment } from "@/lib/demo-environment";
import { USER_PERSON_ID } from "@/lib/mock-data";
import { useStore, type Meeting } from "@/lib/store";

export type MeetingsOverviewScenario = "default" | "pending";

/** Replace demo meetings so repeated scenario loads always have the same counts. */
export function loadMeetingsOverviewScenario(scenario: MeetingsOverviewScenario, now = new Date()) {
  if (!isDemoEnvironment()) return;
  const dateAt = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return toISO(date);
  };
  const make = (id: string, name: string, offset: number, completed = false): Meeting => ({
    id: `overview-demo-${id}`,
    name,
    recurrence: "weekly",
    date: dateAt(offset),
    time: 540,
    duration: 60,
    type: "Operationeel overleg",
    participants: [USER_PERSON_ID, "sd"],
    actions: [],
    blocks: [
      newBlock("topics", {
        title: "Lopende zaken",
        items: [newItem("Opening en vorige besluiten"), newItem("Voortgang en volgende stappen")],
      }),
    ],
    run: null,
    showWelcome: false,
    invited: true,
    held: completed,
    ...(completed ? { followUpStatus: "sent" as const } : {}),
  });
  const meetings = [
    {
      ...make("upcoming-1", "Directieoverleg", 3),
      ...createDirectieAgenda(now.getTime()),
      participants: [USER_PERSON_ID, ...DIRECTIE_PEOPLE.map((person) => person.id)],
    },
    make("upcoming-2", "Sync Stijn", 6),
    make("completed-1", "Managementoverleg", -3, true),
    make("completed-2", "Teamoverleg", -7, true),
  ];
  if (scenario === "pending") {
    const end = new Date(now);
    end.setHours(9, 55, 0, 0);
    meetings.unshift({
      ...make("pending", "Directieoverleg", 0),
      startedAt: end.getTime() - 55 * 60000,
      lastActivityAt: end.getTime(),
      endedAt: end.getTime(),
      endReason: "manual",
      startedBy: USER_PERSON_ID,
      followUpStatus: "pending",
      ...createDirectieAgenda(now.getTime()),
      participants: [USER_PERSON_ID, ...DIRECTIE_PEOPLE.map((person) => person.id)],
    });
  }
  useStore.setState({
    meetings,
    extraPeople: [
      ...useStore
        .getState()
        .extraPeople.filter((person) => !DIRECTIE_PEOPLE.some((fixture) => fixture.id === person.id)),
      ...DIRECTIE_PEOPLE,
    ],
  });
}

/** Direct preview without replacing the user's other demo meetings. */
export function loadAutoClosedPreview(now = new Date(), meetingId?: string): string | null {
  if (!isDemoEnvironment()) return null;
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  const startedAt = start.getTime();
  const existing = useStore
    .getState()
    .meetings.find((meeting) => meeting.id === (meetingId ?? "overview-demo-upcoming-1"));
  const id = existing?.id ?? "prototype-auto-closed";
  const running: Meeting = {
    id,
    name: "Directieoverleg",
    type: "Management",
    recurrence: "weekly",
    date: toISO(start),
    time: 540,
    duration: 60,
    participants: [USER_PERSON_ID, "sd"],
    startedBy: USER_PERSON_ID,
    startedAt,
    lastActivityAt: startedAt + 50 * 60_000,
    showWelcome: false,
    invited: true,
    held: false,
    ...createDirectieAgenda(startedAt),
    run: { startedAt, stepStartedAt: startedAt, currentId: null, doneIds: [], postponedIds: [], actuals: {} },
  };
  running.participants = [USER_PERSON_ID, ...DIRECTIE_PEOPLE.map((person) => person.id)];
  running.blocks = running.blocks.map((block) => ({
    ...block,
    items: block.items.map((item, index) => ({
      ...item,
      runStatus: index < 4 ? "done" : "open",
      visitedAt: index < 4 ? startedAt + 50 * 60000 : undefined,
    })),
  }));
  const closed = unattended(running, autoCloseDueAt(running));
  const state = useStore.getState();
  useStore.setState({
    meetings: [...state.meetings.filter((m) => m.id !== id), closed],
    extraPeople: [
      ...state.extraPeople.filter((person) => !DIRECTIE_PEOPLE.some((fixture) => fixture.id === person.id)),
      ...DIRECTIE_PEOPLE,
    ],
  });
  return id;
}

/** Upgrade the original overview demo in place, keeping its identity and any ongoing work. */
export function ensureDirectieExample() {
  if (!isDemoEnvironment()) return;
  const state = useStore.getState();
  const original = state.meetings.find((meeting) => meeting.id === "overview-demo-upcoming-1");
  if (original?.name === "Directieoverleg" && (original.run || original.followUpStatus === "pending")) {
    const topic = original.blocks.flatMap((block) => block.items).find((item) => item.id === "wrap-demo-3");
    if (topic && (topic.runStatus === "done" || original.run?.doneIds.includes(topic.id))) {
      const updated: Meeting = {
        ...original,
        blocks: original.blocks.map((block) => ({
          ...block,
          items: block.items.map((item) =>
            item.id === topic.id ? { ...item, runStatus: "open", handledAt: undefined, visitedAt: undefined } : item,
          ),
        })),
        run: original.run
          ? { ...original.run, doneIds: original.run.doneIds.filter((id) => id !== topic.id) }
          : original.run,
        wrapUpDraft: original.wrapUpDraft
          ? { ...original.wrapUpDraft, decisions: { ...original.wrapUpDraft.decisions, [topic.id]: "next" } }
          : undefined,
      };
      useStore.setState({ meetings: state.meetings.map((meeting) => (meeting.id === updated.id ? updated : meeting)) });
      return;
    }
  }
  if (!original || original.name !== "Productieoverleg") return;
  const meeting =
    original.startedAt || original.endedAt
      ? { ...original, name: "Directieoverleg" }
      : {
          ...original,
          name: "Directieoverleg",
          ...createDirectieAgenda(Date.now()),
          participants: [USER_PERSON_ID, ...DIRECTIE_PEOPLE.map((person) => person.id)],
        };
  useStore.setState({
    meetings: state.meetings.map((item) => (item.id === meeting.id ? meeting : item)),
    extraPeople: [
      ...state.extraPeople.filter((person) => !DIRECTIE_PEOPLE.some((fixture) => fixture.id === person.id)),
      ...DIRECTIE_PEOPLE,
    ],
  });
}
