"use client";
import Link from "next/link";
import { reminderContent } from "@/lib/meeting-notifications";
import { clockTime } from "@/lib/meeting-wrap-up";
import { meetingNow } from "@/lib/meeting-clock";
import type { Meeting } from "@/lib/store";
export function ReminderMailBody({ meeting, onNavigate }: { meeting: Meeting; onNavigate?: () => void }) {
  const content = reminderContent(meeting, meetingNow(meeting));
  return (
    <article className="mx-auto max-w-[720px] space-y-6 px-6 py-8 sm:px-10 sm:py-10">
      <p className="text-3xl font-extrabold text-brand">too-doo</p>
      <h3 className="text-2xl font-bold">{content.subject}</h3>
      <p>{content.description}</p>
      {!content.question && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              `${content.done} voltooid`,
              `${content.open} niet voltooid`,
              `${content.records} acties/beslissingen`,
            ].map((text) => (
              <span key={text} className="rounded-lg bg-app px-3 py-2">
                {text}
              </span>
            ))}
          </div>
          <p>
            {content.lastActivity !== undefined ? `Laatste activiteit om ${clockTime(content.lastActivity)}. ` : ""}
            {content.effectiveEnd !== null
              ? `We leggen ${clockTime(content.effectiveEnd)} vast als einde; je kunt dat nog aanpassen.`
              : "Er is geen activiteit geregistreerd; de duur is onbekend."}
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <Link
          href={content.question ? content.yesHref : content.href}
          onClick={onNavigate}
          className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 py-3 font-bold text-white hover:bg-brand/90"
        >
          {content.question
            ? meeting.startedAt
              ? "Ja, opvolging toevoegen"
              : "Ja, achteraf invullen"
            : "Bekijk & verstuur opvolging"}
        </Link>
        {content.question && (
          <Link
            href={`/vergaderingen/${meeting.id}?doorgegaan=nee`}
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-4 font-bold"
          >
            Nee, niet doorgegaan
          </Link>
        )}
      </div>
      <p>
        Doe je niets, dan sluiten we de vergadering vanavond automatisch af. De opvolging versturen we dan niet. Dat
        blijft jouw keuze.
      </p>
      <p className="border-t border-line pt-5 text-sm text-ink-3">
        Je krijgt deze mail omdat je voorzitter bent van {meeting.name}.
      </p>
    </article>
  );
}
