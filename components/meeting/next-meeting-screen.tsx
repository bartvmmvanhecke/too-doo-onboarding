"use client";

import { useEffect, useRef, useState } from "react";
import { CircleDot } from "lucide-react";
import { nlBE } from "react-day-picker/locale";
import { Logo } from "@/components/brand";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { formatShortDate, fromISO, today, toISO } from "@/lib/date";
import { meetingNow } from "@/lib/meeting-clock";
import { carryForward, closeManually, nextInSeries } from "@/lib/meeting-wrap-up";
import { useStore, type Meeting } from "@/lib/store";

export function NextMeetingScreen({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
  const ops = useStore();
  const next = nextInSeries(meeting, ops.meetings);
  const [name, setName] = useState(next?.name ?? "");
  const [date, setDate] = useState<Date | undefined>(next?.date ? fromISO(next.date) : today());
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const close = (save: boolean) => {
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    const seriesId = latest.seriesId ?? `series-${latest.id}`;
    if (save && date && name.trim()) {
      if (next) ops.putMeeting({ ...next, name: name.trim(), date: toISO(date) });
      else
        ops.createMeeting(
          {
            name: name.trim(),
            date: toISO(date),
            time: latest.time,
            duration: latest.duration,
            recurrence: latest.recurrence,
          },
          { seriesId, participants: latest.participants, invited: false, showWelcome: false, blocks: [] },
        );
    }
    const closed = {
      ...closeManually(latest, meetingNow(latest)),
      seriesId,
      held: true,
      run: null,
      wrapUpOpen: false,
      minimized: false,
    };
    const meetings = useStore.getState().meetings.map((m) => (m.id === closed.id ? closed : m));
    useStore.setState({ meetings: carryForward(closed, meetings) });
  };

  return (
    <div className="app-theme fixed inset-0 z-40 flex flex-col bg-[linear-gradient(110deg,#2e6090,#73c8fb)] text-ink">
      <header className="flex min-h-16 shrink-0 items-center gap-6 px-3 py-2 text-white sm:px-5">
        <Logo tone="white" href="/app" className="lg:w-[280px]" />
        <span className="text-lg font-bold">{meeting.name}</span>
      </header>
      <main className="ml-2 flex min-h-0 flex-1 flex-col rounded-tl-2xl bg-[#f9f9fc]">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-8 pb-8">
          <div className="mx-auto max-w-[720px]">
            <div className="mb-12 flex flex-col items-center gap-3 text-brand">
              <CircleDot aria-hidden className="size-5" />
              <h1 ref={heading} tabIndex={-1} className="font-bold outline-none">
                Volgende vergadering
              </h1>
            </div>
            <div className="mb-6 rounded-2xl border border-line bg-[#f4f5f9] p-5">
              <span className="inline-block rounded-full bg-[#e2e5ef] px-3 py-1 text-xs font-bold">
                Volgende vergadering
              </span>
              <p className="mt-3 font-bold text-ink-2">
                {next?.date ? `${next.name} · ${formatShortDate(next.date)}` : "Geen volgende vergadering gepland"}
              </p>
            </div>
            <label htmlFor="next-meeting-name" className="mb-2 block text-sm font-bold">
              Vergadertitel
            </label>
            <input
              id="next-meeting-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Voer een vergadertitel in"
              className="mb-6 min-h-11 w-full rounded-lg border border-line bg-transparent px-4 shadow-sm"
            />
            <p id="next-meeting-date" className="mb-2 text-sm font-bold">
              Datum
            </p>
            <Calendar
              aria-labelledby="next-meeting-date"
              mode="single"
              locale={nlBE}
              weekStartsOn={1}
              captionLayout="dropdown"
              selected={date}
              onSelect={setDate}
              defaultMonth={date}
              startMonth={today()}
              endMonth={new Date(today().getFullYear() + 10, 11)}
              disabled={{ before: today() }}
              className="w-full rounded-2xl border border-line bg-transparent [--cell-size:2.5rem] [&_[data-day]]:mx-auto [&_[data-day]]:size-11 [&_[data-day]]:min-w-0 [&_[data-day]]:rounded-full"
              classNames={{
                root: "w-full",
                day: "relative h-11 min-w-0 flex-1 p-0 text-center",
                months: "relative w-full",
                dropdowns: "flex w-full items-center justify-center gap-2",
                dropdown_root: "relative flex-1 rounded-lg border border-line px-3",
              }}
            />
          </div>
        </div>
        <footer className="shrink-0 border-t border-line-faint px-5 py-5">
          <div className="mx-auto flex max-w-[720px] flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={onBack} className="min-h-11 font-bold text-brand">
              Terug naar de vergadering
            </button>
            <div className="ml-auto flex items-center gap-4">
              <button type="button" onClick={() => close(false)} className="min-h-11 font-bold text-brand">
                Sluiten
              </button>
              <Button disabled={!name.trim() || !date} onClick={() => close(true)} className="rounded-full">
                Opslaan &amp; sluiten
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
