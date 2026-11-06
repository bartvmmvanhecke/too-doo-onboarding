"use client";

import Link from "next/link";
import { Archive, Inbox, Mail, Reply, Search, Send, Settings, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { agendaItems, clockTime, lastActivity, othersOpen, plannedEnd } from "@/lib/meeting-wrap-up";
import { usePeople, type Meeting } from "@/lib/store";

export function ReminderMailModal({
  meeting,
  open,
  onOpenChange,
  onFollowUp,
}: {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFollowUp: () => void;
}) {
  const people = usePeople();
  const chair = meeting.attendance?.find((p) => p.role === "Voorzitter")?.personId ?? meeting.startedBy;
  const recipient = people.find((p) => p.id === chair);
  const decisions = agendaItems(meeting)
    .flatMap((i) => i.entries)
    .filter((e) => e.kind === "decision").length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-theme h-[88dvh] max-w-[1440px] gap-0 overflow-hidden rounded-xl bg-[#f3f3f3] p-0 text-[#242424] sm:p-0">
        <DialogTitle className="sr-only">Voorbeeld herinneringsmail in Outlook</DialogTitle>
        <DialogDescription className="sr-only">
          Voorbeeldmail. Sluit dit venster om terug te keren naar je vergadering.
        </DialogDescription>
        <div className="flex min-h-16 shrink-0 items-center gap-8 bg-[#0f6cbd] px-6 pr-20 text-white">
          <span className="text-xl font-semibold">Outlook</span>
          <div
            aria-hidden
            className="hidden h-9 max-w-md flex-1 items-center gap-2 rounded bg-white px-3 text-sm text-[#616161] sm:flex"
          >
            <Search className="size-4" />
            Zoeken
          </div>
          <span className="ml-auto text-xs">Voorbeeldmail</span>
        </div>
        <div
          aria-hidden
          className="flex min-h-14 shrink-0 items-center gap-6 overflow-hidden border-b border-[#ddd] bg-white px-6 text-sm whitespace-nowrap"
        >
          <span className="rounded bg-[#0f6cbd] px-4 py-2 text-white">Nieuwe e-mail</span>
          <span className="flex items-center gap-2">
            <Trash2 className="size-4" />
            Verwijderen
          </span>
          <span className="flex items-center gap-2">
            <Archive className="size-4" />
            Archiveren
          </span>
          <span className="flex items-center gap-2">
            <Reply className="size-4" />
            Beantwoorden
          </span>
          <Settings className="ml-auto size-4" />
        </div>
        <div className="flex min-h-0 flex-1">
          <aside aria-hidden className="hidden w-44 shrink-0 space-y-5 border-r border-[#ddd] p-5 text-sm lg:block">
            <p className="font-semibold">Favorieten</p>
            <p className="flex items-center gap-3 rounded bg-[#dcebf7] p-2 font-semibold text-[#0f6cbd]">
              <Inbox className="size-4" />
              Postvak IN
            </p>
            <p className="flex items-center gap-3 px-2">
              <Send className="size-4" />
              Verzonden
            </p>
            <p className="flex items-center gap-3 px-2">
              <Mail className="size-4" />
              Concepten
            </p>
            <p className="flex items-center gap-3 px-2">
              <Archive className="size-4" />
              Archief
            </p>
          </aside>
          <div aria-hidden className="hidden w-64 shrink-0 border-r border-[#ddd] bg-white xl:block">
            <p className="border-b p-5 font-semibold">
              Prioriteit <span className="ml-4 font-normal text-[#777]">Overige</span>
            </p>
            <div className="border-l-4 border-[#0f6cbd] bg-[#e5eff8] p-5 text-sm">
              <p className="font-bold">too-doo</p>
              <p className="my-2 font-semibold text-[#0f6cbd]">{meeting.name} is nog niet afgerond</p>
              <p className="text-[#666]">Je vergadering staat nog open…</p>
            </div>
          </div>
          <section className="min-w-0 flex-1 overflow-y-auto bg-white">
            <div className="border-b border-[#ddd] px-5 py-4 sm:px-8">
              <h2 className="text-lg font-semibold">{meeting.name} is nog niet afgerond</h2>
              <p className="mt-4 text-sm">
                <strong>too-doo</strong> &lt;meldingen@too-doo.be&gt;
              </p>
              <p className="mt-1 text-xs text-[#666]">
                Aan: {recipient?.name ?? "Voorzitter"}
                {recipient?.email ? ` <${recipient.email}>` : ""}
              </p>
            </div>
            <article className="mx-auto max-w-[720px] space-y-6 px-6 py-8 sm:px-10 sm:py-10">
              <p className="text-3xl font-extrabold text-[#2055e5]">too-doo</p>
              <h3 className="text-2xl font-bold">Je vergadering staat nog open</h3>
              <p>
                {meeting.name} ({clockTime(meeting.startedAt ?? meeting.run?.startedAt ?? 0)}–
                {clockTime(plannedEnd(meeting))}) is gestopt zonder afronden. De opvolging is nog niet verstuurd naar de
                deelnemers.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                {[
                  `${decisions} beslissingen`,
                  `${meeting.actions.length} acties`,
                  `${othersOpen(meeting, meeting.run?.currentId ?? null).length} punten niet voltooid`,
                ].map((text) => (
                  <span key={text} className="rounded-lg bg-[#f0f4fa] px-3 py-2">
                    {text}
                  </span>
                ))}
              </div>
              <p>
                Laatste activiteit om {clockTime(lastActivity(meeting) ?? meeting.run?.startedAt ?? 0)}. Die tijd leggen
                we vast als einde, je kunt ze nog aanpassen.
              </p>
              <Link
                href={`/app/overleg/${meeting.id}?afronden=1`}
                onClick={onFollowUp}
                className="inline-flex min-h-11 items-center rounded-md bg-[#2055e5] px-5 py-3 font-bold text-white hover:bg-[#1948c9]"
              >
                Bekijk &amp; verstuur opvolging
              </Link>
              <p>
                Doe je niets, dan sluiten we de vergadering vanavond automatisch af. De opvolging versturen we dan niet.
                Dat blijft jouw keuze.
              </p>
              <p className="border-t border-[#ddd] pt-5 text-sm text-[#666]">
                Je krijgt deze mail omdat je voorzitter bent van {meeting.name}.
              </p>
            </article>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
