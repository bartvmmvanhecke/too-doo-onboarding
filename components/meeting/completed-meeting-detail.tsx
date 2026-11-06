"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { usePeople, useStore, type Meeting } from "@/lib/store";
import { actualDuration, agendaItems, isHandled, nextInSeries } from "@/lib/meeting-wrap-up";
import { formatShortDate } from "@/lib/date";
import { formatTime } from "@/lib/time";

export function CompletedMeetingDetail({ meeting }: { meeting: Meeting }) {
  const meetings = useStore((s) => s.meetings);
  const people = usePeople();
  const next = nextInSeries(meeting, meetings);
  const items = agendaItems(meeting);
  const participants = meeting.attendance?.filter((p) => p.present).length ?? meeting.participants.length;
  const minutes = Math.round((actualDuration(meeting) ?? 0) / 60000);
  return (
    <div data-meeting-detail className="flex flex-col gap-6">
      <Link href="/app" className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-brand">
        <ArrowLeft aria-hidden className="size-4" />
        Vergaderingen
      </Link>
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold">{meeting.name}</h1>
          <span className="rounded-full bg-success-bg px-3 py-1 text-sm font-bold text-success-ink">Afgerond</span>
        </div>
        <p className="mt-3 text-sm text-ink-3">
          {meeting.date ? formatShortDate(meeting.date) : ""}
          {meeting.time !== null
            ? ` · ${formatTime(meeting.time)}–${formatTime(meeting.time + meeting.duration)}`
            : ""}{" "}
          · {minutes} min (gepland {meeting.duration}) · {participants} deelnemers
        </p>
      </header>
      <section
        role="status"
        className="flex flex-wrap items-start gap-3 rounded-2xl bg-success-bg p-5 text-success-ink"
      >
        <CheckCircle2 aria-hidden className="size-6 shrink-0" />
        <div className="flex-1">
          <p className="font-bold">Opvolging verstuurd naar {participants} deelnemers</p>
          {next?.date && (
            <p className="mt-1">
              Volgende vergadering: {formatShortDate(next.date)}
              {next.time !== null ? ` · ${formatTime(next.time)}–${formatTime(next.time + next.duration)}` : ""}.
            </p>
          )}
        </div>
        {next && (
          <Link
            href={`/app/overleg/${next.id}`}
            className="inline-flex min-h-11 items-center font-bold text-brand underline"
          >
            Bekijk volgende vergadering
          </Link>
        )}
      </section>
      <h2 className="text-3xl font-semibold">Agenda</h2>
      <div className="rounded-2xl border border-line bg-white px-5 py-2">
        {items.map((item, index) => (
          <details key={item.id} className="border-b border-line-faint last:border-0">
            <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-3 py-3">
              <span className="min-w-0 flex-1 font-semibold">
                {index + 1}. {item.text}
              </span>
              {!!item.entries.length && (
                <span className="text-sm text-ink-3">
                  {item.entries.length} {item.entries.length === 1 ? "item" : "items"}
                </span>
              )}
              <span
                className={`min-w-28 rounded-md px-3 py-1 text-center text-xs font-bold ${isHandled(meeting, item.id) ? "bg-success-bg text-success-ink" : "bg-warning-bg text-warning"}`}
              >
                {isHandled(meeting, item.id)
                  ? "voltooid"
                  : item.carry === "drop"
                    ? "laten vallen"
                    : "bewaard voor later"}
              </span>
            </summary>
            <div className="space-y-3 pb-4 text-sm">
              {item.entries.length ? (
                item.entries.map((entry) => (
                  <p key={entry.id}>
                    <span className="font-semibold">
                      {entry.kind === "decision"
                        ? "Beslissing"
                        : entry.kind === "action"
                          ? "Actie"
                          : entry.kind === "note"
                            ? "Notitie"
                            : "Document"}
                      :{" "}
                    </span>
                    {entry.text}
                    {entry.ownerId && ` · ${people.find((p) => p.id === entry.ownerId)?.name ?? ""}`}
                    {entry.date && ` · ${entry.date}`}
                  </p>
                ))
              ) : (
                <p className="text-ink-3">Geen vastleggingen bij dit agendapunt.</p>
              )}
            </div>
          </details>
        ))}
        {!items.length && <p className="py-4 text-sm text-ink-3">Geen agendapunten.</p>}
      </div>
    </div>
  );
}
