"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { agendaItems, nextInSeries, suggestDecision, isHandled } from "@/lib/meeting-wrap-up";
import { formatShortDate } from "@/lib/date";
import { usePeople, useStore, type Meeting } from "@/lib/store";
export function FollowUpPreview({
  meeting,
  open,
  onOpenChange,
  onSend,
}: {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: () => void;
}) {
  const people = usePeople();
  const meetings = useStore((s) => s.meetings);
  const next = nextInSeries(meeting, meetings);
  const chair = people.find(
    (p) => p.id === (meeting.attendance?.find((p) => p.role === "Voorzitter")?.personId ?? meeting.startedBy ?? "jp"),
  );
  const decisions = agendaItems(meeting)
    .flatMap((i) => i.entries)
    .filter((e) => e.kind === "decision");
  const carry = agendaItems(meeting).filter(
    (i) => !isHandled(meeting, i.id) && (i.decision ?? suggestDecision(i)) === "next",
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-theme max-w-[760px]">
        <DialogTitle>
          Opvolging {meeting.name} · {meeting.date ? formatShortDate(meeting.date) : ""}
        </DialogTitle>
        <DialogDescription>Voorbeeld van de mail voor de deelnemers.</DialogDescription>
        <h3 className="font-bold">Beslissingen ({decisions.length})</h3>
        {decisions.map((e) => (
          <p key={e.id}>
            {e.text}
            {e.date && ` · uitvoeren tegen ${e.date}`}
          </p>
        ))}
        <h3 className="font-bold">Acties ({meeting.actions.length})</h3>
        {meeting.actions.map((a) => (
          <p key={a.id}>
            {a.what} ·{" "}
            {a.ownerId
              ? people.find((p) => p.id === a.ownerId)?.name
              : `nog geen eigenaar → ${chair?.name ?? "voorzitter"}`}
            {a.deadline && ` · ${a.deadline}`}
          </p>
        ))}
        <h3 className="font-bold">
          Volgende vergadering · {next?.date ? formatShortDate(next.date) : "Geen volgende vergadering"}
        </h3>
        {carry.map((i) => (
          <p key={i.id}>
            {i.text}
            {!next ? " · Bewaard voor later" : ""}
          </p>
        ))}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Nog aanpassen
          </Button>
          <Button onClick={onSend}>Rond af &amp; verstuur opvolging</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
