import type { Meeting } from "./store";
import { registrationState } from "./meeting-schedule";
import { agendaItems, isHandled, effectiveEnd, lastActivity } from "./meeting-wrap-up";
export function reminderContent(meeting: Meeting, now = Date.now()) {
  const registration = registrationState(meeting, now);
  const items = agendaItems(meeting);
  const done = items.filter((i) => isHandled(meeting, i.id)).length;
  const question = registration === "empty" || registration === "not_started";
  return {
    subject: question
      ? `Is ${meeting.name} doorgegaan?`
      : meeting.wrapUpOpen
        ? "Nog één klik"
        : "Je vergadering staat nog open",
    question,
    description: question
      ? registration === "not_started"
        ? "Deze vergadering werd niet gestart in Too-Doo."
        : "Je startte de vergadering, maar er werd niets vastgelegd."
      : meeting.wrapUpOpen
        ? "Jullie hebben de hele agenda doorlopen. De opvolging staat klaar, maar is nog niet verstuurd."
        : "De opvolging is nog niet verstuurd naar de deelnemers.",
    done,
    open: items.length - done,
    records: items.flatMap((i) => i.entries).filter((e) => e.kind === "action" || e.kind === "decision").length,
    lastActivity: lastActivity(meeting),
    effectiveEnd: effectiveEnd(meeting, now),
    href: `/vergaderingen/${meeting.id}#afronden`,
    yesHref: `/vergaderingen/${meeting.id}?doorgegaan=ja#afronden`,
  };
}
/** TODO(api): server worker and transactional outbox; dedupe by meeting+notification type.
 * TODO(api): bundle multiple unfinished meetings into one end-of-day mail for the chair.
 */
export const startNotification = (meeting: Meeting) => ({
  subject: `${meeting.name} begint nu`,
  agendaCount: agendaItems(meeting).length,
  openActions: meeting.actions.filter((a) => !a.done).length,
  href: `/vergaderingen/${meeting.id}`,
  cancelHref: `/vergaderingen/${meeting.id}?doorgegaan=nee`,
});
