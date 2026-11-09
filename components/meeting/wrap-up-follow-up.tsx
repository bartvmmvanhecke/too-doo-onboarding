"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePeople, useStore, type Meeting, type WrapUpDraft } from "@/lib/store";
import { agendaItems, nextInSeries } from "@/lib/meeting-wrap-up";
import { followUpContent } from "@/lib/wrap-up-flow";
import { formatShortDate } from "@/lib/date";

const field = "min-h-11 rounded-lg border border-line bg-white px-3 text-sm";
export function WrapUpPlanning({
  meeting,
  draft,
  patch,
}: {
  meeting: Meeting;
  draft: WrapUpDraft;
  patch: (p: Partial<WrapUpDraft>) => void;
}) {
  const meetings = useStore((s) => s.meetings);
  const next = nextInSeries(meeting, meetings);
  const [editing, setEditing] = useState(!next);
  const carried = agendaItems(meeting).filter((i) => draft.decisions?.[i.id] === "next");
  const when = draft.nextDate ? formatShortDate(draft.nextDate) : "Nog niet ingepland";
  const [h, m] = (draft.nextTime || "09:00").split(":").map(Number);
  const end = h * 60 + m + meeting.duration;
  const endTime = `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">
          Volgende vergadering:{" "}
          {draft.noNext ? "niet gepland" : `${when}${draft.nextDate ? ` · ${draft.nextTime}–${endTime}` : ""}`}
        </h2>
        <Button variant="ghost" onClick={() => setEditing(!editing)}>
          Wijzigen
        </Button>
      </div>
      {editing && (
        <div className="flex flex-wrap gap-5">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Datum
            <input
              className={field}
              type="date"
              value={draft.nextDate ?? ""}
              min={meeting.date ?? undefined}
              onChange={(e) => patch({ nextDate: e.target.value, noNext: false })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Begintijd
            <input
              className={field}
              type="time"
              value={draft.nextTime ?? "09:00"}
              onChange={(e) => patch({ nextTime: e.target.value })}
            />
          </label>
          <p className="self-end py-3 text-sm text-ink-3">Duur: {meeting.duration} min</p>
        </div>
      )}
      {!next && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={draft.noNext ?? false}
            onChange={(e) => patch({ noNext: e.target.checked })}
          />
          Geen volgende vergadering plannen
        </label>
      )}
      <div className="border-t border-line pt-5">
        <p className="font-semibold">{carried.length} verplaatste punten komen op deze agenda</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          {carried.map((i) => (
            <li key={i.id}>{i.text}</li>
          ))}
        </ul>
        {(draft.noNext || !draft.nextDate) && carried.length > 0 && (
          <p role="status" className="mt-5 rounded-xl bg-brand-soft p-4 text-sm text-ink-2">
            De verplaatste punten gaan naar “Bewaard voor later”. Ze komen automatisch op de agenda zodra er een
            volgende vergadering in de reeks gepland wordt.
          </p>
        )}
      </div>
    </section>
  );
}
export function FollowUpPreview({ meeting }: { meeting: Meeting }) {
  const meetings = useStore((s) => s.meetings);
  const people = usePeople();
  const content = followUpContent(meeting, meetings, Object.fromEntries(people.map((p) => [p.id, p.name])));
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h2 className="mb-2 font-bold">Beslissingen</h2>
        {content.decisions.length ? (
          <ul className="list-disc space-y-2 pl-5">
            {content.decisions.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-3">Geen beslissingen vastgelegd.</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-bold">Acties</h2>
        {content.actions.length ? (
          <ul className="list-disc space-y-2 pl-5">
            {content.actions.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-3">Geen acties vastgelegd.</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-bold">Volgende vergadering</h2>
        <p>
          {content.nextDate
            ? `${formatShortDate(content.nextDate)} · ${content.nextTime}`
            : "Geen volgende vergadering gepland"}
        </p>
        {content.carried.length > 0 && (
          <>
            <p className="mt-2 text-ink-3">{content.nextDate ? "Verplaatste punten" : "Bewaard voor later"}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {content.carried.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          </>
        )}
      </section>
      {content.askScore && (
        <section>
          <h2 className="mb-2 font-bold">Hoe liep deze vergadering?</h2>
          <p>Geef een score van 1 tot 5.</p>
        </section>
      )}
    </div>
  );
}
export function WrapUpFollowUp({
  meeting,
  draft,
  patch,
  finish,
}: {
  meeting: Meeting;
  draft: WrapUpDraft;
  patch: (p: Partial<WrapUpDraft>) => void;
  finish: (status: "sent" | "saved") => void;
}) {
  const people = usePeople();
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const recipients = draft.recipientIds ?? [];
  const ids = [...new Set([...(meeting.attendance?.map((p) => p.personId) ?? meeting.participants), ...recipients])];
  return (
    <div className="mt-6 space-y-6">
      <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-7">
        <div>
          <label htmlFor="wrap-summary" className="block text-lg font-bold">
            Samenvatting
          </label>
          <p id="summary-help" className="mt-1 text-sm text-ink-3">
            Gegenereerd met AI · je kunt alles aanpassen
          </p>
        </div>
        <textarea
          id="wrap-summary"
          aria-describedby="summary-help"
          className="min-h-40 w-full rounded-xl border border-line p-4 text-sm leading-relaxed"
          value={draft.summary ?? ""}
          onChange={(e) => patch({ summary: e.target.value })}
        />
        <div className="border-t border-line pt-5">
          <FollowUpPreview meeting={meeting} />
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p>Wordt verstuurd naar {recipients.length} deelnemers</p>
          <Button variant="ghost" aria-expanded={recipientsOpen} onClick={() => setRecipientsOpen(!recipientsOpen)}>
            Aanpassen
          </Button>
        </div>
        {recipientsOpen && (
          <fieldset className="mt-3">
            <legend className="sr-only">Ontvangers</legend>
            {ids.map((id) => (
              <label key={id} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={recipients.includes(id)}
                  onChange={(e) =>
                    patch({ recipientIds: e.target.checked ? [...recipients, id] : recipients.filter((v) => v !== id) })
                  }
                />
                {people.find((p) => p.id === id)?.name ??
                  meeting.attendance?.find((p) => p.personId === id)?.name ??
                  id}
              </label>
            ))}
          </fieldset>
        )}
      </section>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => finish("sent")}>Verstuur opvolging</Button>
        <Button variant="outline" onClick={() => finish("saved")}>
          Opslaan zonder versturen
        </Button>
      </div>
      <section className="border-t border-line py-5 text-sm text-ink-2">
        <h2 className="mb-3 font-semibold">Hoe liep deze vergadering?</h2>
        <div role="group" aria-label="Vergaderingsscore" className="flex gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              type="button"
              key={score}
              aria-label={`Score ${score}`}
              aria-pressed={draft.score === score}
              onClick={() => patch({ score })}
              className={`size-11 rounded-full border font-semibold ${draft.score === score ? "border-brand bg-brand-soft text-brand" : "border-line bg-white"}`}
            >
              {score}
            </button>
          ))}
        </div>
        {draft.score && (
          <label className="mt-4 block max-w-lg">
            Feedback
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-line bg-white p-3"
              value={draft.feedback ?? ""}
              onChange={(e) => patch({ feedback: e.target.value })}
            />
          </label>
        )}
        <label className="mt-3 flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={draft.askScore ?? false}
            onChange={(e) => patch({ askScore: e.target.checked })}
          />
          Vraag ook de deelnemers om een score
        </label>
      </section>
    </div>
  );
}
