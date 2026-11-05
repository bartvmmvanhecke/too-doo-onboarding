"use client";
import Link from "next/link";
import type { Meeting } from "@/lib/store";
import { usePeople } from "@/lib/store";
import { agendaItems, clockTime, lastActivity, othersOpen, plannedEnd } from "@/lib/meeting-wrap-up";
import { Button } from "@/components/ui/button";

export function MeetingReminderPreview({meeting}:{meeting:Meeting}) {
  const people = usePeople();
  const chair = meeting.attendance?.find(p=>p.role === "Voorzitter")?.personId ?? meeting.startedBy;
  const recipient = people.find(p=>p.id===chair);
  const decisions = agendaItems(meeting).flatMap(i=>i.entries).filter(e=>e.kind === "decision").length;
  return <div className="mx-auto max-w-[680px] space-y-5">
    <p className="text-sm text-ink-3">Voorbeeld herinneringsmail · Aan: {recipient?.name ?? "Voorzitter"}{recipient?.email ? ` (${recipient.email})` : ""}</p>
    <p className="font-bold">Onderwerp: {meeting.name} is nog niet afgerond</p>
    <article className="space-y-5 rounded-2xl border border-line bg-white p-6">
      <h1 className="text-3xl font-bold">Je vergadering staat nog open</h1>
      <p>{meeting.name} ({clockTime(meeting.startedAt ?? meeting.run?.startedAt ?? 0)}–{clockTime(plannedEnd(meeting))}) is gestopt zonder afronden. De opvolging is nog niet verstuurd naar de deelnemers.</p>
      <div className="grid grid-cols-3 gap-2 text-sm"><p className="rounded-xl bg-app p-3">{decisions} beslissingen</p><p className="rounded-xl bg-app p-3">{meeting.actions.length} acties</p><p className="rounded-xl bg-[var(--wrap-amber-bg)] p-3 text-[var(--wrap-amber-ink)]">{othersOpen(meeting,null).length} punten niet behandeld</p></div>
      <p>Laatste activiteit om {clockTime(lastActivity(meeting) ?? meeting.run?.startedAt ?? 0)}. Die tijd leggen we vast als einde, je kunt ze nog aanpassen.</p>
      <Button asChild><Link href={`/app/overleg/${meeting.id}?afronden=1`}>Bekijk &amp; verstuur opvolging</Link></Button>
      <p>Doe je niets, dan sluiten we de vergadering vanavond automatisch af. De opvolging versturen we dan niet. Dat blijft jouw keuze.</p>
      <p className="border-t border-line pt-4 text-sm text-ink-3">Je krijgt deze mail omdat je voorzitter bent van {meeting.name}. <Link href={`/app/overleg/${meeting.id}?meldingen=1`}>Meldingen beheren</Link></p>
      {/* TODO(api): connect the notification-preferences link and deliver only to the chair/start user. */}
    </article>
  </div>;
}
