"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useStore, type Meeting } from "@/lib/store";
import { agendaItems } from "@/lib/meeting-wrap-up";
import { registrationState } from "@/lib/meeting-schedule";
import { newBlock, newItem } from "@/lib/agenda";
import { formatShortDate } from "@/lib/date";

export function PreviousFollowUpBanner({ meeting }: { meeting: Meeting }) {
  const meetings = useStore((s) => s.meetings);
  const [hidden, setHidden] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const previous = meetings
    .filter(
      (m) =>
        m.id !== meeting.id &&
        !!meeting.seriesId &&
        m.seriesId === meeting.seriesId &&
        m.date &&
        meeting.date &&
        m.date < meeting.date &&
        m.followUpStatus !== "sent" &&
        m.outcome !== "not_held",
    )
    .sort((a, b) => b.date!.localeCompare(a.date!))[0];
  if (!previous || hidden) return null;
  const missing = ["empty", "not_started"].includes(registrationState(previous));
  const items = agendaItems(previous).filter((i) => i.runStatus !== "done");
  const decisions = agendaItems(previous)
    .flatMap((i) => i.entries)
    .filter((e) => e.kind === "decision").length;
  const take = (ids: string[]) => {
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    const blocks = latest.blocks.map((b) => ({ ...b, items: [...b.items] }));
    for (const original of previous.blocks)
      for (const item of original.items.filter((i) => ids.includes(i.id))) {
        const source = `${previous.id}:${item.id}`;
        if (blocks.some((b) => b.items.some((i) => i.carriedSourceId === source))) continue;
        let target = blocks.find((b) => b.kind === "topics" && b.title === original.title);
        if (!target) {
          target = newBlock("topics", { title: original.title });
          blocks.push(target);
        }
        target.items.push(
          newItem(item.text, {
            ownerIds: [...item.ownerIds],
            purposes: [...item.purposes],
            duration: item.duration,
            carriedSourceId: source,
            carriedFrom: previous.date ?? undefined,
            runStatus: "open",
          }),
        );
      }
    useStore.getState().putMeeting({ ...latest, blocks });
    setHidden(true);
    setChoosing(false);
  };
  return (
    <>
      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning bg-warning-bg p-4 text-ink">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">
            {missing
              ? `De vorige vergadering (${previous.date ? formatShortDate(previous.date) : ""}) werd niet ingevuld`
              : `De opvolging van ${previous.date ? formatShortDate(previous.date) : ""} is nog niet verstuurd`}
          </h2>
          <p className="mt-1 text-sm">
            {missing
              ? `${items.length} agendapunten staan nog open. Neem je ze over in deze vergadering?`
              : `Deelnemers kregen hun ${previous.actions.length} acties en ${decisions} beslissingen nog niet.`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => setHidden(true)}>
          {missing ? "Negeren" : "Overslaan"}
        </Button>
        {missing ? (
          <>
            <Button variant="outline" onClick={() => setChoosing(true)}>
              Kiezen welke
            </Button>
            <Button onClick={() => take(items.map((i) => i.id))}>Alle {items.length} overnemen</Button>
          </>
        ) : (
          <Button asChild>
            <Link href={`/vergaderingen/${previous.id}#afronden`}>Nu versturen</Link>
          </Button>
        )}
      </section>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent className="app-theme">
          <DialogTitle>Agendapunten overnemen</DialogTitle>
          <DialogDescription>Kies de punten voor deze vergadering.</DialogDescription>
          {items.map((i) => (
            <label key={i.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(i.id)}
                onChange={(e) =>
                  setSelected((old) => (e.target.checked ? [...old, i.id] : old.filter((id) => id !== i.id)))
                }
              />
              {i.text}
            </label>
          ))}
          <Button onClick={() => take(selected)}>Overnemen</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
