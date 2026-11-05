"use client";
import { useEffect } from "react";
import { useStore, type Meeting } from "@/lib/store";
import { meetingNow, timerEnd } from "@/lib/meeting-clock";
import { CHIME_DEFAULT_ON } from "@/lib/meetingWrapUp.config";
import { getChimeContext, useAudioRuntime, useChimePreferences } from "@/lib/audio/chime-state";
import { playChime } from "@/lib/audio/chime";

/** Lives in the app shell so minimizing/navigating does not cancel the alarm. */
export function ChimeScheduler() {
  const meetings = useStore((s) => s.meetings);
  return (
    <>
      {meetings
        .filter((m) => m.run && !m.endedAt && !m.wrapUpOpen)
        .map((m) => (
          <MeetingAlarm key={m.id} meeting={m} />
        ))}
    </>
  );
}
function MeetingAlarm({ meeting }: { meeting: Meeting }) {
  const user = useStore((s) => s.user?.email.toLowerCase() ?? "guest");
  const enabled = useChimePreferences((s) => s.users[user] ?? CHIME_DEFAULT_ON);
  const running = useAudioRuntime((s) => s.running);
  const end = timerEnd(meeting),
    offset = meetingNow(meeting, 0),
    revision = meeting.demoScenarioRevision;
  useEffect(() => {
    if (!enabled || !running) return;
    const ctx = getChimeContext();
    if (!ctx || ctx.state !== "running") return;
    let scheduled: ReturnType<typeof playChime> | undefined;
    let fired = false;
    let scheduledWhen = Infinity;
    const cancel = () => {
      if (scheduled && ctx.currentTime >= scheduledWhen) fired = true;
      scheduled?.cancel();
      scheduled = undefined;
    };
    const schedule = () => {
      if (scheduled && ctx.currentTime >= scheduledWhen) {
        fired = true;
        return;
      }
      cancel();
      const remaining = (end - Date.now() - offset) / 1000;
      // Never catch up an expired deadline after reload / returning to the tab.
      if (fired || remaining <= 0 || remaining > 600 || ctx.state !== "running") return;
      scheduledWhen = ctx.currentTime + remaining;
      scheduled = playChime(ctx, scheduledWhen);
    };
    const visible = () => {
      cancel();
      schedule();
    };
    schedule();
    // Only waits for the ten-minute scheduling window. Sound itself uses the audio clock.
    const interval = window.setInterval(() => {
      if (!scheduled) schedule();
    }, 60000);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      cancel();
    };
  }, [enabled, running, end, offset, revision]);
  return null;
}
