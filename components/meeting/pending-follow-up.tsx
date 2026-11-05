"use client";
import { useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, type Meeting } from "@/lib/store";
import { agendaItems, clockTime, nextInSeries, othersOpen } from "@/lib/meeting-wrap-up";
import { formatShortDate } from "@/lib/date";
export function PendingFollowUp({ meeting }: { meeting: Meeting }) {
  const [timeError, setTimeError] = useState("");
  const [editing, setEditing] = useState(false);
  const [endTime, setEndTime] = useState("");
  const ops = useStore();
  if (!meeting.endedAt || meeting.followUpStatus !== "pending") return null;
  const next = nextInSeries(meeting, ops.meetings);
  const open = othersOpen(meeting, null).filter((i) => i.carry !== "drop");
  const decisions = agendaItems(meeting)
    .flatMap((i) => i.entries)
    .filter((e) => e.kind === "decision").length;
  const confirm = (endedAt = meeting.endedAt) => ops.putMeeting({ ...meeting, endedAt, endTimeConfirmed: true });
  const drop = (id: string) => {
    const source = `${meeting.id}:${id}`;
    // Remove just this transferred copy, keeping the original report.
    useStore.setState({
      meetings: ops.meetings.map((m) =>
        m.id === meeting.id
          ? {
              ...m,
              blocks: m.blocks.map((b) => ({
                ...b,
                items: b.items.map((i) => (i.id === id ? { ...i, carry: "drop" } : i)),
              })),
            }
          : {
              ...m,
              blocks: m.blocks.map((b) => ({ ...b, items: b.items.filter((i) => i.carriedSourceId !== source) })),
            },
      ),
    });
  };
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-[var(--wrap-amber-bg)] px-3 py-1 text-sm font-bold text-[var(--wrap-amber-ink)]">
          Nog af te ronden
        </span>
        <Link className="text-sm text-brand underline" href={`/app/overleg/${meeting.id}?herinnering=1`}>
          Herinneringsmail bekijken
        </Link>
      </div>
      {meeting.endReason === "auto" && !meeting.endTimeConfirmed && (
        <section role="status" className="rounded-[14px] border border-[var(--wrap-line)] bg-white p-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Clock aria-hidden className="size-5" />
            Automatisch afgesloten om {clockTime(meeting.endedAt)}
          </h2>
          <p className="my-2 text-sm">Op basis van de laatste activiteit. Klopt die eindtijd?</p>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const date = new Date(meeting.endedAt!);
                const [h, m] = endTime.split(":").map(Number);
                date.setHours(h, m, 0, 0);
                if (date.getTime() >= (meeting.startedAt ?? 0)) {
                  setTimeError("");
                  confirm(date.getTime());
                } else setTimeError("De eindtijd mag niet vóór de starttijd liggen.");
              }}
              className="flex flex-wrap items-center gap-3"
            >
              <label className="flex items-center gap-2 text-sm">
                Eindtijd
                <input
                  required
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="min-h-11 rounded-lg border border-line px-3"
                />
              </label>
              <Button size="sm" type="submit">
                Tijd bewaren
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Annuleren
              </Button>
            </form>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEndTime(clockTime(meeting.endedAt!));
                  setEditing(true);
                }}
              >
                Tijd aanpassen
              </Button>
              <Button size="sm" onClick={() => confirm()}>
                Klopt
              </Button>
            </div>
          )}
          {timeError && (
            <p role="alert" className="mt-3 text-sm text-[var(--wrap-amber-ink)]">
              {timeError}
            </p>
          )}
        </section>
      )}
      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="font-bold">Opvolging nog niet verstuurd</h2>
        <div className="my-4 grid gap-2 sm:grid-cols-3">
          <p className="rounded-xl bg-app p-3">{decisions} beslissingen</p>
          <p className="rounded-xl bg-app p-3">
            {meeting.actions.length} acties{" "}
            <span className="block text-sm text-[var(--wrap-amber-ink)]">
              {meeting.actions.filter((a) => !a.ownerId).length} zonder eigenaar
            </span>
          </p>
          <p className="rounded-xl bg-[var(--wrap-amber-bg)] p-3 text-[var(--wrap-amber-ink)]">
            {open.length} punten doorgeschoven
          </p>
        </div>
        <Button onClick={() => ops.putMeeting({ ...meeting, wrapUpOpen: true })}>
          Bekijk &amp; verstuur opvolging
        </Button>
      </section>
      {open.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-3 font-bold">
            {next?.date ? `Doorgeschoven naar ${formatShortDate(next.date)}` : "Bewaard voor later"}
          </h2>
          {open.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 border-t border-line py-2">
              <span>{i.text}</span>
              <Button size="sm" variant="ghost" onClick={() => drop(i.id)}>
                Laten vallen
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
