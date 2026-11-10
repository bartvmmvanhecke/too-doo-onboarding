"use client";

import { DigestPreview } from "@/components/meeting/digest-preview";
import { NotificationSettings } from "@/components/meeting/notification-settings";
import { CompletedMeetingDetail } from "@/components/meeting/completed-meeting-detail";
import { PreviousFollowUp } from "@/components/meeting/previous-follow-up";
import { MeetingStartGate } from "@/components/meeting/meeting-start-gate";
import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LiveMeeting } from "@/components/meeting/live-meeting";
import { MeetingDetailB } from "@/components/meeting-detail-b/meeting-detail-b";
import { MeetingOverviewDetail } from "@/components/meeting/meeting-overview-detail";
import { SavedBanner } from "@/components/probeer/after-save";
import { useStore } from "@/lib/store";

/** Detailpagina van een vergadering: agenda, openstaande acties en de lopende vergadering. */
export function MeetingScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const meeting = useStore((s) => s.meetings.find((m) => m.id === id));

  useEffect(() => {
    if (!meeting) router.replace("/app");
  }, [meeting, router]);

  useEffect(() => {
    if ((params.get("afronden") !== "1" && params.get("bevestigAfronden") !== "1") || !meeting) return;
    if (meeting.endedAt) {
      // Pending links always land on detail. The banner is the explicit wizard entry.
      if (meeting.wrapUpOpen || !meeting.minimized)
        useStore.getState().putMeeting({ ...meeting, wrapUpOpen: false, minimized: true });
      router.replace(`/app/overleg/${meeting.id}`);
    } else if (meeting.minimized) useStore.getState().putMeeting({ ...meeting, minimized: false });
  }, [meeting, params, router]);

  if (!meeting) return null;
  if (params.get("herinnering") === "1") return <DigestPreview />;
  if (params.get("meldingen") === "1") return <NotificationSettings />;
  return (
    <MeetingStartGate meeting={meeting}>
      <div data-meeting-detail className="contents">
        <SavedBanner meeting={meeting} />
        {(!meeting.run || meeting.minimized || meeting.endedAt) && <PreviousFollowUp meeting={meeting} />}
        {meeting.followUpStatus === "sent" || meeting.followUpStatus === "saved" ? (
          <CompletedMeetingDetail meeting={meeting} />
        ) : params.get("variant") === "b" && !meeting.run ? (
          <MeetingDetailB meeting={meeting} />
        ) : meeting.run && !meeting.endedAt && !meeting.minimized ? (
          <LiveMeeting
            meeting={meeting}
            confirmFinish={params.get("bevestigAfronden") === "1" || params.get("afronden") === "1"}
          />
        ) : (
          <MeetingOverviewDetail meeting={meeting} />
        )}
      </div>
    </MeetingStartGate>
  );
}
