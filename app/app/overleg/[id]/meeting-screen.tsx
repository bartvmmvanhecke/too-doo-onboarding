"use client";

import { MeetingStartGate } from "@/components/meeting/meeting-start-gate";
import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MeetingDetail } from "@/components/meeting/meeting-detail";
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

  if (!meeting) return null;
  return (
    <MeetingStartGate meeting={meeting}>
      <div data-meeting-detail className="contents">
        <SavedBanner meeting={meeting} />
        {params.get("variant") === "b" && !meeting.run ? (
          <MeetingDetailB meeting={meeting} />
        ) : meeting.run ? (
          <MeetingDetail meeting={meeting} />
        ) : (
          <MeetingOverviewDetail meeting={meeting} />
        )}
      </div>
    </MeetingStartGate>
  );
}
