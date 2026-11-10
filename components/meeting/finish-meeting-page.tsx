"use client";
import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { closeManually } from "@/lib/meeting-wrap-up";
import { meetingNow } from "@/lib/meeting-clock";
import { MeetingWrapUp } from "./meeting-wrap-up";
export function FinishMeetingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const initialized = useRef(false);
  const meeting = useStore((s) => s.meetings.find((m) => m.id === id));
  useEffect(() => {
    if (!meeting) {
      router.replace("/app");
      return;
    }
    if (meeting.followUpStatus === "sent") {
      router.replace(`/vergaderingen/${id}`);
      return;
    }
    if (!initialized.current) {
      initialized.current = true;
      useStore
        .getState()
        .putMeeting(meeting.endedAt ? { ...meeting, wrapUpOpen: true } : closeManually(meeting, meetingNow(meeting)));
    }
  }, [id, meeting, router]);
  return meeting && meeting.followUpStatus !== "sent" ? <MeetingWrapUp meeting={meeting} /> : null;
}
