"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useAppUi } from "@/components/app/app-ui";
import { Button } from "@/components/ui/button";
import { scheduleLine } from "@/lib/meeting";
import { useStore } from "@/lib/store";

/** /app met vergaderingen: de lijst; de detailpagina opent per vergadering. */
export function MeetingsList() {
  const meetings = useStore((s) => s.meetings);
  const { setAddMeetingsOpen } = useAppUi();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[30px] leading-tight font-bold">Vergaderingen</h1>
        <Button variant="outline" size="sm" onClick={() => setAddMeetingsOpen(true)}>
          <Plus className="size-4" strokeWidth={1.6} aria-hidden />
          Vergaderingen toevoegen
        </Button>
      </div>
      <ul className="flex flex-col overflow-hidden rounded-[14px] border border-line-soft bg-white">
        {meetings.map((m) => {
          const open = m.actions.filter((a) => !a.done).length;
          return (
            <li key={m.id} className="border-t border-line-faint first:border-t-0">
              <Link
                href={`/app/overleg/${m.id}`}
                className="flex min-h-14 items-center gap-3 px-5 py-3 text-ink no-underline hover:bg-row-hover hover:text-ink"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">{m.name}</span>
                  <span className="truncate text-[13px] text-ink-3">{scheduleLine(m)}</span>
                </span>
                {open > 0 && <span className="text-[13px] text-ink-3">{open} open</span>}
                <ChevronRight className="size-4 text-ink-subtle" strokeWidth={1.6} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
