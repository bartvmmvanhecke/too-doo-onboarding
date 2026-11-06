"use client";
import { useState } from "react";
import { Check, ChevronDown, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore, type Meeting } from "@/lib/store";
import { agendaItems, clockTime, nextInSeries, othersOpen } from "@/lib/meeting-wrap-up";
import { formatShortDate } from "@/lib/date";
export function PendingFollowUp({ meeting }: { meeting: Meeting }) {
  const [expanded, setExpanded] = useState(true);
  const [preview, setPreview] = useState(false);
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
    <section aria-label="Overzichtsstatus" className="overflow-hidden rounded-[20px] border border-[#e9bd70] bg-white">
      <div className="flex flex-wrap items-center gap-4 bg-[#fffbf3] px-6 py-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="pending-status-details"
          onClick={() => setExpanded(!expanded)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-5 text-left"
        >
          <ChevronDown aria-hidden className={`size-4 shrink-0 text-[#895016] ${expanded ? "" : "-rotate-90"}`} />
          <span>
            <strong className="block">Nog af te ronden · opvolging niet verstuurd</strong>
            <span className="text-sm text-[#895016]">
              {open.length ||
              meeting.actions.some((a) => !a.ownerId) ||
              (meeting.endReason === "auto" && !meeting.endTimeConfirmed)
                ? "Controleer de opvolging"
                : "Klaar om te versturen"}
            </span>
          </span>
        </button>
        <Button variant="outline" onClick={() => setPreview(true)}>
          Voorbeeld
        </Button>
        <Button onClick={() => ops.putMeeting({ ...meeting, wrapUpOpen: true })}>Verstuur opvolging</Button>
      </div>
      {expanded && (
        <div id="pending-status-details" className="space-y-4 border-t border-[#f0e0c3] px-6 py-5">
          <p className="flex items-center gap-5 border-b border-line-faint pb-4">
            {open.length ? (
              <Clock aria-hidden className="size-5 shrink-0 text-warning" />
            ) : (
              <Check aria-hidden className="size-5 shrink-0 text-success" />
            )}
            <span>
              Afgesloten om {clockTime(meeting.endedAt)} ·{" "}
              {open.length ? `${open.length} agendapunten niet voltooid` : "alle agendapunten voltooid"}
            </span>
          </p>
          <p className="flex items-center gap-5 border-b border-line-faint pb-4">
            {meeting.actions.some((a) => !a.ownerId) ? (
              <Clock aria-hidden className="size-5 shrink-0 text-warning" />
            ) : (
              <Check aria-hidden className="size-5 shrink-0 text-success" />
            )}
            <span>
              {decisions} beslissingen en {meeting.actions.length} acties,{" "}
              {meeting.actions.some((a) => !a.ownerId)
                ? `${meeting.actions.filter((a) => !a.ownerId).length} zonder eigenaar`
                : "allemaal met eigenaar"}
            </span>
          </p>
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
          {open.length > 0 && (
            <details className="rounded-xl border border-line bg-white p-4">
              <summary className="cursor-pointer font-bold">
                {next?.date ? `Doorgeschoven naar ${formatShortDate(next.date)}` : "Bewaard voor later"}
              </summary>
              {open.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 border-t border-line py-2">
                  <span>{i.text}</span>
                  <Button size="sm" variant="ghost" onClick={() => drop(i.id)}>
                    Laten vallen
                  </Button>
                </div>
              ))}
            </details>
          )}
          <p className="text-sm text-ink-3">
            Iets aanpassen? Dat doe je gewoon hieronder in de agenda. Verder vergaderen kan via ··· › Vergadering
            hervatten.
          </p>
        </div>
      )}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="app-theme">
          <DialogTitle>Opvolging · {meeting.name}</DialogTitle>
          <DialogDescription>Voorbeeld van de opvolging voor de deelnemers.</DialogDescription>
          <h3 className="font-bold">Beslissingen</h3>
          {agendaItems(meeting)
            .flatMap((i) => i.entries)
            .filter((e) => e.kind === "decision")
            .map((e) => (
              <p key={e.id}>{e.text}</p>
            ))}
          {!decisions && <p>Geen beslissingen genoteerd.</p>}
          <h3 className="font-bold">Acties</h3>
          {meeting.actions.map((a) => (
            <p key={a.id}>{a.what}</p>
          ))}
          {!meeting.actions.length && <p>Geen acties genoteerd.</p>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
