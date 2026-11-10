"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, type Meeting } from "@/lib/store";
import { agendaItems, clockTime, nextInSeries, othersOpen, lastActivity } from "@/lib/meeting-wrap-up";
import { formatShortDate, today, toISO } from "@/lib/date";
import { FollowUpPreview } from "./follow-up-preview";
import { AfterwardsFields } from "./registration-question";
import { meetingNow } from "@/lib/meeting-clock";
import { sendFollowUp } from "@/lib/meeting-follow-up";
export function PendingFollowUp({ meeting }: { meeting: Meeting }) {
  const [expanded, setExpanded] = useState(true);
  const [preview, setPreview] = useState(false);
  const [editing, setEditing] = useState(false);
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [nextDate, setNextDate] = useState("");
  const ops = useStore();
  const router = useRouter();
  if (!meeting.endedAt || meeting.followUpStatus !== "pending") return null;
  const items = agendaItems(meeting);
  const open = othersOpen(meeting, null);
  const unowned = meeting.actions.filter((a) => !a.ownerId).length;
  const next = nextInSeries(meeting, ops.meetings);
  const missing = meeting.filledAfterwards ? open.filter((i) => !i.decision).length : 0;
  const send = () => {
    if (missing) return;
    sendFollowUp(meeting.id, false, meetingNow(meeting));
    router.replace(`/vergaderingen/${meeting.id}`);
  };
  const show = (owners: boolean) => {
    const matches = owners ? items.filter((i) => i.entries.some((e) => e.kind === "action" && !e.ownerId)) : open;
    for (const item of matches) {
      const row = document.getElementById(`agenda-item-${item.id}`);
      if (row) {
        row.dataset.attention = "true";
        const parents = row.closest("details");
        if (parents) parents.open = true;
      }
    }
    document.getElementById(`agenda-item-${matches[0]?.id}`)?.scrollIntoView({ block: "center" });
  };
  return (
    <section
      id="afronden"
      aria-label="Overzichtsstatus"
      className="overflow-hidden rounded-[20px] border border-[var(--wrap-status-line)] bg-white"
    >
      <div className="flex flex-wrap items-center gap-4 bg-[var(--wrap-status-bg)] px-6 py-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="pending-status-details"
          onClick={() => setExpanded(!expanded)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-5 text-left"
        >
          <ChevronDown aria-hidden className={`size-4 shrink-0 text-warning ${expanded ? "" : "-rotate-90"}`} />
          <span>
            <strong className="block">Nog af te ronden · opvolging niet verstuurd</strong>
            <span className="text-sm text-warning">
              {open.length || unowned
                ? `Nog te doen: ${open.length} keuzes · ${unowned} zonder eigenaar`
                : "Klaar om te versturen"}
              {missing ? ` · nog ${missing} te kiezen` : ""}
            </span>
          </span>
        </button>
        <Button variant="outline" onClick={() => setPreview(true)}>
          Voorbeeld
        </Button>
        <Button disabled={missing > 0} onClick={send}>
          {meeting.filledAfterwards ? "Bewaar & verstuur opvolging" : "Verstuur opvolging"}
        </Button>
      </div>
      {expanded && (
        <div id="pending-status-details" className="space-y-4 border-t border-[var(--wrap-status-line)] px-6 py-5">
          {meeting.endReason === "auto" && !meeting.endTimeConfirmed ? (
            <div className="space-y-3 border-b border-line-faint pb-4">
              <p className="flex items-start gap-3">
                <Clock aria-hidden className="size-5 shrink-0 text-warning" />
                <span>
                  Automatisch afgesloten om {clockTime(meeting.autoClosedAt ?? meeting.endedAt)} · eindtijd{" "}
                  {clockTime(meeting.endedAt)} (laatste activiteit {clockTime(lastActivity(meeting) ?? 0)} + 15 min).
                  Klopt dit?
                </span>
              </p>
              {editing ? (
                <form
                  className="flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const end = new Date(meeting.endedAt!);
                    const [h, m] = endTime.split(":").map(Number);
                    end.setHours(h, m, 0, 0);
                    if (end.getTime() < (meeting.startedAt ?? 0)) {
                      setError("De eindtijd mag niet vóór de starttijd liggen.");
                      return;
                    }
                    ops.putMeeting({ ...meeting, endedAt: end.getTime(), endTimeConfirmed: true });
                    setEditing(false);
                  }}
                >
                  <label className="text-sm">
                    Eindtijd
                    <input
                      required
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="ml-3 min-h-11 rounded-lg border border-line px-3"
                    />
                  </label>
                  <Button type="submit">Bewaar</Button>
                </form>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEndTime(clockTime(meeting.endedAt!));
                      setEditing(true);
                    }}
                  >
                    Aanpassen
                  </Button>
                  <Button onClick={() => ops.putMeeting({ ...meeting, endTimeConfirmed: true })}>Klopt</Button>
                </div>
              )}
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-3 border-b border-line-faint pb-4">
              <Check aria-hidden className="size-5 text-success" />
              Afgesloten om {clockTime(meeting.endedAt)} ·{" "}
              {open.length ? `${open.length} agendapunten niet voltooid` : "alle agendapunten voltooid"}
            </p>
          )}
          {!!open.length && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-faint pb-3">
              <p>
                {open.length} van {items.length} agendapunten: kies wat ermee gebeurt
              </p>
              <Button variant="ghost" onClick={() => show(false)}>
                Toon
              </Button>
            </div>
          )}
          {!!unowned && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-faint pb-3">
              <p>
                {unowned} {unowned === 1 ? "actie" : "acties"} zonder eigenaar · versturen kan,{" "}
                {unowned === 1 ? "ze komt" : "ze komen"} dan bij jou
              </p>
              <Button variant="ghost" onClick={() => show(true)}>
                Toon
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span>Volgende vergadering: {next?.date ? formatShortDate(next.date) : "Nog niet gepland"}</span>
            <label className="text-sm">
              {next ? "Wijzigen" : "Datum"}
              <input
                type="date"
                value={nextDate || next?.date || ""}
                min={meeting.date ?? toISO(today())}
                onChange={(e) => setNextDate(e.target.value)}
                className="ml-3 min-h-11 rounded-lg border border-line px-3"
              />
            </label>
            <Button
              variant="outline"
              disabled={!nextDate || (!!meeting.date && nextDate <= meeting.date)}
              onClick={() => {
                if (next) ops.putMeeting({ ...next, date: nextDate });
                else {
                  const seriesId = meeting.seriesId ?? `series-${meeting.id}`;
                  ops.putMeeting({ ...meeting, seriesId });
                  ops.createMeeting(
                    {
                      name: meeting.name,
                      date: nextDate,
                      time: meeting.time,
                      duration: meeting.duration,
                      recurrence: meeting.recurrence,
                    },
                    { seriesId, participants: meeting.participants, showWelcome: false, invited: false, blocks: [] },
                  );
                }
              }}
            >
              Bewaar
            </Button>
          </div>
          {meeting.outcome === "held" && <AfterwardsFields meeting={meeting} />}
          <p className="text-sm text-ink-3">
            Iets aanpassen? Dat doe je gewoon hieronder in de agenda. Verder vergaderen kan via ⋯ › Vergadering
            hervatten.
          </p>
        </div>
      )}
      <FollowUpPreview
        meeting={meeting}
        open={preview}
        onOpenChange={setPreview}
        onSend={send}
        disabled={missing > 0}
      />
    </section>
  );
}
