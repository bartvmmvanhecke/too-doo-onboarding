"use client";

import { PendingFollowUp } from "@/components/meeting/pending-follow-up";
import { MeetingReminderPreview } from "@/components/b/meeting-reminder-preview";
import { closeManually } from "@/lib/meeting-wrap-up";
import { MeetingWrapUp } from "@/components/meeting/meeting-wrap-up";
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
    if (params.get("afronden") !== "1" || !meeting || meeting.wrapUpOpen || meeting.followUpStatus === "sent") return;
    useStore.getState().putMeeting(meeting.endedAt ? { ...meeting, wrapUpOpen: true } : closeManually(meeting));
    router.replace(`/app/overleg/${meeting.id}`);
  }, [meeting, params, router]);

  if (!meeting) return null;
  if (params.get("herinnering") === "1") return <MeetingReminderPreview meeting={meeting} />;
  if (params.get("meldingen") === "1")
    return (
      <section className="rounded-xl border border-line bg-white p-5">
        <h1 className="text-2xl font-bold">Meldingen beheren</h1>
        <p className="mt-3">Meldingsvoorkeuren zijn nog niet beschikbaar in dit prototype.</p>
      </section>
    );
  return (
    <MeetingStartGate meeting={meeting}>
      <div data-meeting-detail className="contents">
        <SavedBanner meeting={meeting} />
        {!meeting.wrapUpOpen && <PendingFollowUp meeting={meeting} />}
        {meeting.wrapUpOpen ? (
          <MeetingWrapUp meeting={meeting} />
        ) : params.get("variant") === "b" && !meeting.run ? (
          <MeetingDetailB meeting={meeting} />
        ) : meeting.run && !meeting.minimized ? (
          <LiveMeeting meeting={meeting} />
        ) : (
          <MeetingOverviewDetail meeting={meeting} />
        )}
      </div>
    </MeetingStartGate>
  );
}
