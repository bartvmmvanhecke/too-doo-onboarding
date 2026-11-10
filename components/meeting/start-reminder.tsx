"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { startNotification } from "@/lib/meeting-notifications";
import { plannedEnd } from "@/lib/meeting-wrap-up";
import { isChair } from "@/lib/meeting-schedule";
import { useNow } from "./meeting-context";
import { clockTime } from "@/lib/meeting-wrap-up";
export function StartReminder() {
  const meetings = useStore((s) => s.meetings);
  const now = useNow(true);
  const router = useRouter();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const meeting = meetings.find(
    (m) =>
      !m.startedAt &&
      !m.run &&
      !m.outcome &&
      !dismissed.includes(m.id) &&
      isChair(m) &&
      now >= plannedEnd(m) - m.duration * 60000 &&
      now < plannedEnd(m),
  );
  if (!meeting) return null;
  const content = startNotification(meeting);
  // TODO(api): deliver the same start notification through the connected calendar/push service.
  return (
    <aside
      role="status"
      className="fixed right-4 bottom-4 z-30 max-w-[calc(100%-2rem)] rounded-2xl border border-line bg-white p-5 shadow-xl"
    >
      <h2 className="font-bold">{content.subject}</h2>
      <p className="my-3 text-sm text-ink-3">
        {clockTime(plannedEnd(meeting) - meeting.duration * 60000)}–{clockTime(plannedEnd(meeting))} ·{" "}
        {content.agendaCount} agendapunten · {content.openActions} openstaande acties
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            useStore.getState().startRun(meeting.id);
            router.push(content.href);
          }}
        >
          Start vergadering
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            useStore.getState().putMeeting({ ...meeting, followUpStatus: "pending" });
            setDismissed((old) => [...old, meeting.id]);
            router.push(content.cancelHref);
          }}
        >
          Gaat niet door
        </Button>
      </div>
    </aside>
  );
}
