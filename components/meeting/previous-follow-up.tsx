"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore, type Meeting } from "@/lib/store";
import { formatShortDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
export function PreviousFollowUp({ meeting }: { meeting: Meeting }) {
  const meetings = useStore((s) => s.meetings);
  const [skipped, setSkipped] = useState(false);
  const previous = meetings
    .filter(
      (m) =>
        m.id !== meeting.id &&
        m.seriesId &&
        m.seriesId === meeting.seriesId &&
        m.date &&
        meeting.date &&
        m.date < meeting.date,
    )
    .sort((a, b) => b.date!.localeCompare(a.date!))[0];
  if (skipped || previous?.followUpStatus !== "pending" || !previous.endedAt) return null;
  return (
    <section
      role="status"
      className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-[var(--wrap-amber-bg)] p-4 text-[var(--wrap-amber-ink)]"
    >
      <p className="flex-1 text-sm">De opvolging van {formatShortDate(previous.date!)} is nog niet verstuurd.</p>
      <Button variant="ghost" onClick={() => setSkipped(true)}>
        Overslaan
      </Button>
      <Button variant="outline" asChild>
        <Link href={`/app/overleg/${previous.id}`}>Nu afronden</Link>
      </Button>
    </section>
  );
}
