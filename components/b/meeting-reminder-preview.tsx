"use client";
import { ReminderMailBody } from "@/components/meeting/reminder-mail-body";
import type { Meeting } from "@/lib/store";
export function MeetingReminderPreview({ meeting }: { meeting: Meeting }) {
  return (
    <div className="rounded-2xl border border-line bg-white">
      <p className="px-6 pt-5 text-sm text-ink-3">Voorbeeld herinneringsmail</p>
      <ReminderMailBody meeting={meeting} />
    </div>
  );
}
