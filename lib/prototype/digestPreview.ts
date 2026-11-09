import { USER_PERSON_ID } from "../mock-data";
import type { Meeting } from "../store";
import { newBlock, newItem } from "../agenda";
/** All digest preview fixtures stay behind this function. TODO(api): load preview data for the authenticated user. */
export function digestPreviewData(now = Date.now()): Meeting[] {
  const date = new Date(now).toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" });
  return [
    {
      id: "digest-demo",
      name: "Directievergadering",
      type: "Management",
      date,
      time: 540,
      duration: 60,
      recurrence: "weekly",
      participants: [USER_PERSON_ID],
      startedBy: USER_PERSON_ID,
      startedAt: now - 3600000,
      endedAt: now - 1,
      lastActivityAt: now - 900000,
      endReason: "auto",
      followUpStatus: "pending",
      held: true,
      invited: true,
      showWelcome: false,
      blocks: [newBlock("topics", { items: [newItem("Budget", { runStatus: "done" }), newItem("Planning")] })],
      actions: [
        { id: "digest-action", what: "Budgetvoorstel bijwerken", ownerId: USER_PERSON_ID, deadline: date, done: false },
      ],
    },
  ];
}
