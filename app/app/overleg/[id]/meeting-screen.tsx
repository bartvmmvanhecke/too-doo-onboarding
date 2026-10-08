"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MeetingDetail } from "@/components/meeting/meeting-detail";
import { useStore } from "@/lib/store";

/** Detailpagina van een vergadering: agenda, openstaande acties en de lopende vergadering. */
export function MeetingScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const meeting = useStore((s) => s.meetings.find((m) => m.id === id));

  useEffect(() => {
    if (!meeting) router.replace("/app");
  }, [meeting, router]);

  if (!meeting) return null;
  return <MeetingDetail meeting={meeting} />;
}
