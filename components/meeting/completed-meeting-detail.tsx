"use client";

import type { Meeting } from "@/lib/store";
import { MeetingOverviewDetail } from "./meeting-overview-detail";

export function CompletedMeetingDetail({ meeting }: { meeting: Meeting }) {
  return <MeetingOverviewDetail meeting={meeting} />;
}
