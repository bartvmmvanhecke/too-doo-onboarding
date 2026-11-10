"use client";
import styles from "./meeting-wrap-up.module.css";
import { Calendar } from "@/components/ui/calendar";
import { nlBE } from "react-day-picker/locale";
import { toISO } from "@/lib/date";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePeople, useStore, type Meeting, type WrapUpDraft } from "@/lib/store";
import { agendaItems, nextInSeries } from "@/lib/meeting-wrap-up";
import { followUpContent } from "@/lib/wrap-up-flow";
import { formatTime } from "@/lib/time";
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
  const selected = draft.nextDate ? new Date(`${draft.nextDate}T12:00:00`) : undefined;
  const [month, setMonth] = useState(() => selected ?? new Date());
  const carried = agendaItems(meeting).filter((i) => draft.decisions?.[i.id] === "next");
  const when = draft.nextDate ? formatShortDate(draft.nextDate) : "Nog niet ingepland";
  const [h, m] = (draft.nextTime || "09:00").split(":").map(Number);
  const end = h * 60 + m + (draft.nextDuration ?? meeting.duration);
  const endTime = `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  return (
    <section className={styles.planning}>
      <p className="text-sm text-ink-2">Optioneel. Verplaatste agendapunten nemen we mee.</p>
      <div className={styles.planningSummary}>
        <span className={styles.summaryLabel}>Volgende vergadering</span>
        <h2 className="font-bold">
          {next ? "Al gepland: " : "Voorstel: "}
          {next
            ? `${formatShortDate(next.date!)}${next.time !== null ? ` · ${formatTime(next.time)}–${formatTime(next.time + next.duration)}` : ""}`
            : draft.noNext
              ? "geen volgende vergadering"
              : `${when}${draft.nextDate ? ` · ${draft.nextTime}–${endTime}` : ""}`}
        </h2>
      </div>
      <p className="text-sm text-ink-2">
        {next
          ? `Je past de bestaande vergadering van ${next.date ? formatShortDate(next.date) : "deze reeks"} aan. We bewaren de wijzigingen zodra je de afronding voltooit.`
          : draft.noNext
            ? "Er wordt geen volgende vergadering gepland. Verplaatste punten bewaren we voor later."
            : "We plannen deze vergadering zodra je de afronding voltooit. Zonder datum plannen we nog geen vergadering."}
      </p>
      {!next && (
        <fieldset className="flex flex-wrap gap-x-6">
          <legend className="sr-only">Volgende vergadering plannen</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="next-planning"
              checked={!draft.noNext}
              onChange={() => patch({ noNext: false })}
            />
            Volgende vergadering plannen
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="next-planning"
              checked={!!draft.noNext}
              onChange={() => patch({ noNext: true })}
            />
            Geen volgende vergadering plannen
          </label>
        </fieldset>
      )}
      {!draft.noNext && (
        <>
          <label className="flex flex-col gap-2 text-sm font-bold">
            Naam van de volgende vergadering
            <input
              className={field}
              value={draft.nextName ?? ""}
              onChange={(e) => patch({ nextName: e.target.value })}
            />
          </label>
          <div>
            <label id="wrap-calendar-label" className="mb-2 block text-sm font-bold">
              Datum
            </label>
            <Calendar
              className={styles.calendar}
              mode="single"
              locale={nlBE}
              weekStartsOn={1}
              fixedWeeks
              captionLayout="dropdown"
              aria-labelledby="wrap-calendar-label"
              selected={selected}
              month={month}
              onMonthChange={setMonth}
              startMonth={new Date(new Date().getFullYear() - 1, 0)}
              endMonth={new Date(new Date().getFullYear() + 10, 11)}
              disabled={meeting.date ? { before: new Date(`${meeting.date}T00:00:00`) } : undefined}
              onSelect={(date) => {
                if (date) patch({ nextDate: toISO(date), noNext: false });
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-bold">
              Starttijd
              <input
                className={field}
                type="time"
                value={draft.nextTime ?? "09:00"}
                onChange={(e) => patch({ nextTime: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold">
              Duur (minuten)
              <input
                className={field}
                type="number"
                min={5}
                max={1440}
                step={1}
                value={draft.nextDuration ?? meeting.duration}
                onChange={(e) => patch({ nextDuration: Number(e.target.value) })}
              />
            </label>
          </div>
        </>
      )}
      {!draft.noNext && !draft.nextDate && (
        <p className="text-sm text-ink-3">Geen datum gekozen? Dan plannen we nog geen volgende vergadering.</p>
      )}
      <div className="border-t border-line pt-5">
        <p className="font-semibold">
          {carried.length} verplaatste punten
          {draft.noNext || !draft.nextDate ? " worden bewaard voor later" : " komen op deze agenda"}
        </p>
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
            ? `${content.nextName} · ${formatShortDate(content.nextDate)} · ${content.nextTime} · ${content.nextDuration} min`
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
}: {
  meeting: Meeting;
  draft: WrapUpDraft;
  patch: (p: Partial<WrapUpDraft>) => void;
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
      <section className="border-t border-line py-8 text-ink-2">
        <h2 className="mb-4 text-3xl font-bold text-ink">Vergaderscore</h2>
        <p className="mb-6 max-w-3xl text-sm leading-relaxed">
          De vergaderscore helpt om de algemene tevredenheid over vergaderingen binnen het bedrijf op te volgen.
        </p>
        <label className="mb-6 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold">
          <input
            className="size-5 shrink-0 accent-brand"
            type="checkbox"
            checked={draft.askScore ?? false}
            onChange={(e) => patch({ askScore: e.target.checked })}
          />
          Scoreaanvraag individueel naar deelnemers versturen
        </label>
        <div role="group" aria-label="Vergaderingsscore" className={styles.scoreScale}>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
            <button
              type="button"
              key={score}
              aria-label={`Score ${score}`}
              aria-pressed={draft.score === score}
              onClick={() => patch({ score: draft.score === score ? undefined : score })}
              className={styles.scoreOption}
            >
              {score}
            </button>
          ))}
        </div>
        <label className="mt-7 block text-sm font-bold">
          Feedback
          <textarea
            placeholder="Aa"
            className="mt-3 min-h-44 w-full rounded-xl border border-line bg-white p-4 font-normal"
            value={draft.feedback ?? ""}
            onChange={(e) => patch({ feedback: e.target.value })}
          />
        </label>
        <p className="mt-3 text-xs text-ink-3">Optioneel. De scoreaanvraag gaat mee in de opvolgingsmail.</p>
      </section>
    </div>
  );
}
