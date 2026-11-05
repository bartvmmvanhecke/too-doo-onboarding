"use client";
import { elapsedClock, remainingLabel, timerEnd, meetingNow } from "@/lib/meeting-clock";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { closeManually } from "@/lib/meeting-wrap-up";
import { useNow } from "./meeting-context";
import { Button } from "@/components/ui/button";
export function RunningMeetingPill() {
  const meeting = useStore((s) => s.meetings.find((m) => m.run && !m.endedAt && m.minimized));
  const realNow = useNow(!!meeting, (meeting ? timerEnd(meeting) : 0) - meetingNow(meeting ?? {}, 0));
  const now = meeting ? meetingNow(meeting, realNow) : realNow;
  if (!meeting) return null;
  const over = now >= timerEnd(meeting);
  return (
    <aside
      role="status"
      aria-label="Lopende vergadering"
      className="fixed right-4 bottom-5 z-30 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg"
    >
      <span className={over ? "text-[var(--wrap-amber-ink)]" : "text-brand"}>
        ● {meeting.name} · <span className="tabular-nums">{elapsedClock(now - meeting.run!.startedAt)}</span> ·{" "}
        {over
          ? `${Math.floor((now - timerEnd(meeting)) / 60000)} min over gepland einde`
          : remainingLabel(timerEnd(meeting) - now)}
      </span>
      <Button variant="outline" size="sm" asChild>
        <Link
          href={`/app/overleg/${meeting.id}?afronden=1`}
          onClick={() => useStore.getState().putMeeting(closeManually(meeting, now))}
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
