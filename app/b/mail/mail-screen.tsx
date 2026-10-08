"use client";

import { MailPreview } from "@/components/b/mail-preview";
import { weekdayLong } from "@/lib/date";
import { USER_PERSON_ID } from "@/lib/mock-data";
import { usePeople, useStore } from "@/lib/store";
import { mailData } from "@/lib/variant-b";

/** /b/mail: de mail voor de eerste actie met eigenaar uit de state, anders de voorbeelddata. */
export function MailScreen() {
  const meetings = useStore((s) => s.meetings);
  const targetId = useStore((s) => s.b.targetMeetingId);
  const people = usePeople();
  // Het opgevolgde overleg eerst, dan de andere.
  const ordered = [...meetings.filter((m) => m.id === targetId), ...meetings.filter((m) => m.id !== targetId)];
  const actions = ordered.flatMap((m) => m.actions.map((a) => ({ ...a, meeting: m })));
  const first = actions.find((a) => a.ownerId && a.ownerId !== USER_PERSON_ID);
  return <MailPreview data={mailData(actions, first?.meeting, people, weekdayLong)} />;
}
