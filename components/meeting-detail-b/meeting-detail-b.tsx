"use client";
import { MeetingDetail } from "@/components/meeting/meeting-detail";
import type { Meeting } from "@/lib/store";
/** Variant B wordt in de volgende stap opgebouwd; de routekeuze is al deelbaar. */
export function MeetingDetailB({ meeting }: { meeting: Meeting }) {
  return <MeetingDetail meeting={meeting} />;
}
