import { directieAgendaItems } from "./meetingFixtures";
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
        items:
          name === "Directieoverleg"
            ? directieAgendaItems()
            : [newItem("Opening en vorige besluiten"), newItem("Voortgang en volgende stappen")],
      }),
    ],
    run: null,
    showWelcome: false,
    invited: true,
    held: completed,
    ...(completed ? { followUpStatus: "sent" as const } : {}),
  });
  const meetings = [
    make("upcoming-1", "Directieoverleg", 3),
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
      actions: [
        { id: "overview-demo-action", what: "Budgetvoorstel bijwerken", ownerId: null, deadline: "", done: false },
      ],
    });
  }
  useStore.setState({ meetings });
}
