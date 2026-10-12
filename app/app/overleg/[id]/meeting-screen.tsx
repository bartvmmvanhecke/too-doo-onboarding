"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MeetingDetail } from "@/components/meeting/meeting-detail";
import { MeetingDetailB } from "@/components/meeting-detail-b/meeting-detail-b";
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
    <>
      <SavedBanner meeting={meeting} />
      {params.get("variant") === "b" && !meeting.run ? (
        <MeetingDetailB meeting={meeting} />
      ) : (
        <MeetingDetail meeting={meeting} />
      )}
    </>
  );
}
