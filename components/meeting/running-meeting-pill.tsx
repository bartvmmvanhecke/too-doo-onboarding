"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { closeManually, plannedEnd } from "@/lib/meeting-wrap-up";
import { useNow } from "./meeting-context";
import { Button } from "@/components/ui/button";
export function RunningMeetingPill() {
  const meeting = useStore((s) => s.meetings.find((m) => m.run && !m.endedAt && m.minimized));
  const now = useNow(!!meeting);
  if (!meeting) return null;
  const over = now >= plannedEnd(meeting);
  return (
    <aside
      role="status"
      aria-label="Lopende vergadering"
      className="fixed right-4 bottom-5 z-30 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg"
    >
      <span className={over ? "text-[var(--wrap-amber-ink)]" : "text-brand"}>
        ● {meeting.name} ·{" "}
        {over ? `${Math.floor((now - plannedEnd(meeting)) / 60000)} min over gepland einde` : "Vergadering bezig"}
      </span>
      <Button variant="outline" size="sm" asChild>
        <Link
          href={`/app/overleg/${meeting.id}?afronden=1`}
          onClick={() => useStore.getState().putMeeting(closeManually(meeting))}
        >
          Afronden
        </Link>
      </Button>
      <Button size="sm" asChild>
        <Link
          href={`/app/overleg/${meeting.id}`}
          onClick={() => useStore.getState().putMeeting({ ...meeting, minimized: false })}
        >
          Terug naar vergadering →
        </Link>
      </Button>
    </aside>
  );
}
