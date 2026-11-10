"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { closeManually, clockTime, lastActivity } from "@/lib/meeting-wrap-up";
import { IDLE_BUFFER_MIN } from "@/lib/meetingWrapUp.config";
import { meetingNow } from "@/lib/meeting-clock";
import { useStore, type Meeting } from "@/lib/store";

export function AwayPrompt({ meeting }: { meeting: Meeting }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const tick = useRef(0);
  useEffect(() => {
    tick.current = Date.now();
    const check = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") {
        if (now - tick.current > 15 * 60000) setOpen(true);
        tick.current = now;
      }
    };
    const timer = window.setInterval(check, 30000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  const activity = lastActivity(meeting) ?? meeting.startedAt ?? meeting.run?.startedAt ?? 0;
  const end = Math.min(meetingNow(meeting), activity + IDLE_BUFFER_MIN * 60000);
  return (
    <Dialog open={open && !meeting.endedAt} onOpenChange={setOpen}>
      <DialogContent className="app-theme">
        <DialogTitle>Je was even weg</DialogTitle>
        <DialogDescription>
          De laatste activiteit was om {clockTime(activity)}. Is de vergadering voorbij?
        </DialogDescription>
        <p>Rond je nu af, dan leggen we {clockTime(end)} vast als einde (laatste activiteit + 15 min).</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              useStore.getState().putMeeting({ ...meeting, lastActivityAt: meetingNow(meeting) });
              setOpen(false);
            }}
          >
            Verder vergaderen
          </Button>
          <Button
            onClick={() => {
              useStore.getState().putMeeting(closeManually(meeting, end));
              router.push(`/vergaderingen/${meeting.id}/afronden`);
              setOpen(false);
            }}
          >
            Afronden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
