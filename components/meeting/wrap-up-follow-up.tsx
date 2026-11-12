"use client";
import styles from "./meeting-wrap-up.module.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { nlBE } from "react-day-picker/locale";
import { ChevronDown, CalendarDays, List } from "lucide-react";
import { usePeople, useStore, type Meeting, type WrapUpDraft } from "@/lib/store";
import { agendaItems, nextInSeries } from "@/lib/meeting-wrap-up";
import { followUpContent } from "@/lib/wrap-up-flow";
import { formatTime } from "@/lib/time";
import { toISO, formatShortDate } from "@/lib/date";

const field = "min-h-11 rounded-lg border border-line bg-white px-3 text-sm";
export function WrapUpPlanning({
  meeting,
  draft,
  patch,
  compact = false,
  nameError,
}: {
  meeting: Meeting;
  draft: WrapUpDraft;
  patch: (p: Partial<WrapUpDraft>) => void;
  compact?: boolean;
  nameError: boolean;
}) {
  const meetings = useStore((s) => s.meetings);
  const next = nextInSeries(meeting, meetings);
  const editing = !!draft.beforeNextEdit;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const carried = agendaItems(meeting).filter((item) => draft.decisions?.[item.id] === "next");
  const proposedDate = new Date(`${meeting.date || toISO(new Date())}T12:00:00`);
  proposedDate.setDate(proposedDate.getDate() + 7);
  const planningName = draft.nextName ?? meeting.name;
  const planningDate = draft.nextDate || next?.date || "";
  const suggestionTime = formatTime(meeting.time ?? 540);
  const originalTime = next ? formatTime(next.time ?? meeting.time ?? 540) : "";
  const planningTime = draft.nextTime ?? originalTime;
  const planningDuration = draft.nextDuration ?? next?.duration ?? meeting.duration;
  const changed =
    next &&
    (planningName !== next.name ||
      planningDate !== next.date ||
      (planningTime || originalTime) !== originalTime ||
      planningDuration !== next.duration);
  const when = planningDate ? formatShortDate(planningDate) : "";
  const [hour, minute] = (planningTime || originalTime || suggestionTime).split(":").map(Number);
  const endTime = formatTime(hour * 60 + minute + planningDuration);
  const openEditor = () =>
    patch({
      beforeNextEdit: {
        nextName: draft.nextName,
        nextDate: draft.nextDate,
        nextTime: draft.nextTime,
        nextDuration: draft.nextDuration,
        noNext: draft.noNext,
      },
      noNext: false,
    });
  return (
    <div className="mt-3 space-y-4">
      {!compact && <p className="text-sm text-ink-2">Hier komen de verplaatste punten terecht.</p>}
      <section
        className={`${styles.finalCard} rounded-2xl border p-5 ${!editing && next ? "border-brand" : "border-line"}`}
      >
        {editing || !next ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold">{next ? "Deze vergadering verplaatsen" : "Volgende vergadering plannen"}</h2>
                <p className="mt-1 text-sm text-ink-3">
                  {next
                    ? `Je wijzigt de bestaande vergadering van ${formatShortDate(next.date!)}. Er komt geen tweede bij, en de rest van de reeks blijft zoals ze is.`
                    : planningDate
                      ? "Er komt een nieuwe vergadering bij in de agenda."
                      : "Optioneel. Laat leeg als je later wilt plannen."}
                </p>
              </div>
              {next && (
                <Button
                  variant="link"
                  className="min-h-11"
                  onClick={() => {
                    patch({ ...draft.beforeNextEdit, beforeNextEdit: undefined });
                  }}
                >
                  Annuleren
                </Button>
              )}
            </div>
            <>
              <div
                id="next-meeting-fields"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_1fr]"
              >
                <label className="flex min-w-0 flex-col gap-2 text-sm font-bold">
                  Naam
                  <input
                    className={`${field} min-w-0 w-full font-normal`}
                    value={planningName}
                    placeholder={`Bijvoorbeeld: ${meeting.name}`}
                    aria-invalid={nameError || undefined}
                    aria-describedby={nameError ? "next-name-error" : undefined}
                    onChange={(event) => patch({ nextName: event.target.value })}
                  />
                  {nameError && (
                    <span id="next-name-error" role="alert" className="font-normal text-destructive">
                      Geef de vergadering een naam, of annuleer.
                    </span>
                  )}
                </label>
                <div className="flex min-w-0 flex-col gap-2 text-sm font-bold">
                  <label id="next-date-label" htmlFor="next-date-trigger">
                    Datum
                  </label>
                  <div className="relative">
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          id="next-date-trigger"
                          type="button"
                          aria-labelledby="next-date-label next-date-value"
                          className={`${field} flex w-full items-center justify-between gap-2 pr-10 text-left font-normal`}
                        >
                          <span id="next-date-value">
                            {planningDate
                              ? new Date(`${planningDate}T12:00:00`).toLocaleDateString("nl-BE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "dd/mm/yyyy"}
                          </span>
                          {!planningDate && <CalendarDays aria-hidden className="absolute right-3 size-4 text-ink-3" />}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="app-theme w-[var(--radix-popover-trigger-width)] min-w-60 max-w-[calc(100vw-2rem)] border-line bg-white p-2"
                      >
                        <Calendar
                          className={styles.datePicker}
                          mode="single"
                          locale={nlBE}
                          weekStartsOn={1}
                          fixedWeeks
                          selected={planningDate ? new Date(`${planningDate}T12:00:00`) : undefined}
                          defaultMonth={planningDate ? new Date(`${planningDate}T12:00:00`) : proposedDate}
                          disabled={meeting.date ? { before: new Date(`${meeting.date}T00:00:00`) } : undefined}
                          onSelect={(date) => {
                            if (!date) return;
                            patch({ nextDate: toISO(date), noNext: false });
                            setCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {!next && planningDate && (
                    <Button
                      variant="link"
                      className="min-h-11 self-start px-0"
                      onClick={() => patch({ nextDate: "", noNext: true })}
                    >
                      Datum wissen
                    </Button>
                  )}
                </div>
                <label className="flex min-w-0 flex-col gap-2 text-sm font-bold">
                  Starttijd
                  <input
                    className={`${field} min-w-0 w-full font-normal`}
                    type="time"
                    value={planningTime}
                    onChange={(event) => patch({ nextTime: event.target.value })}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-sm font-bold">
                  Duur (minuten)
                  <input
                    className={`${field} min-w-0 w-full font-normal`}
                    type="number"
                    min={5}
                    max={1440}
                    value={planningDuration || ""}
                    onChange={(event) => patch({ nextDuration: Number(event.target.value) })}
                    onBlur={() => {
                      if (!Number.isInteger(planningDuration) || planningDuration < 5 || planningDuration > 1440) {
                        patch({ nextDuration: next?.duration ?? meeting.duration });
                      }
                    }}
                  />
                </label>
              </div>
              {!next && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-3">
                  <span>Suggesties:</span>
                  {[7, 14].map((days) => {
                    const date = new Date(proposedDate);
                    date.setDate(date.getDate() + days - 7);
                    const value = toISO(date);
                    return (
                      <Button
                        key={days}
                        variant="outline"
                        size="sm"
                        className="h-auto min-h-11 flex-wrap rounded-full px-4 py-2 font-normal text-ink-3"
                        onClick={() =>
                          patch({
                            nextDate: value,
                            nextTime: suggestionTime,
                            noNext: false,
                          })
                        }
                      >
                        <span className="font-bold text-brand">
                          {formatShortDate(value)} · {suggestionTime}
                        </span>
                        <span>· {days === 7 ? "zelfde tijd volgende week" : "over 2 weken"}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-xl bg-brand-soft px-3 py-2 text-center font-bold text-brand">
              <span className="block text-xs uppercase">
                {new Date(`${planningDate}T12:00:00`).toLocaleDateString("nl-BE", { month: "short" })}
              </span>
              <span>{Number(planningDate.slice(-2))}</span>
            </div>
            <div className="min-w-0 flex-1 basis-60">
              <h2 className="font-bold">{changed ? "Gewijzigd · uit de reeks" : "Al gepland · uit de reeks"}</h2>
              <p className="mt-1 text-sm text-ink-2">
                {planningName} · {when} · {planningTime || originalTime}–{endTime}
              </p>
            </div>
            <Button variant="link" className="min-h-11 text-brand" onClick={openEditor}>
              Datum of tijd wijzigen
            </Button>
          </div>
        )}
      </section>
      <section className={`${styles.finalCard} rounded-2xl border border-line p-5`}>
        {carried.length ? (
          <>
            <h2 className="text-sm font-bold">
              {planningDate ? `Schuift door naar ${when}` : 'Gaat naar "Bewaard voor later"'}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-2">
              {carried.map((item) => (
                <li key={item.id}>→ {item.text}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-ink-3">Geen verplaatste punten.</p>
        )}
      </section>
    </div>
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
  compact = false,
}: {
  meeting: Meeting;
  draft: WrapUpDraft;
  patch: (p: Partial<WrapUpDraft>) => void;
  compact?: boolean;
}) {
  const [overviewOpen, setOverviewOpen] = useState(false);
  const meetings = useStore((state) => state.meetings);
  const people = usePeople();
  const content = followUpContent(
    { ...meeting, wrapUpDraft: draft },
    meetings,
    Object.fromEntries(people.map((person) => [person.id, person.name])),
  );
  return (
    <div className="mt-6 space-y-6">
      <section className={`${styles.finalCard} rounded-2xl border border-line p-6 text-ink-2`}>
        <div className={compact ? "mb-3 flex flex-wrap items-center justify-between gap-x-4" : undefined}>
          <h2 className="mb-2 text-xl font-bold text-ink">
            {compact ? "Hoe liep deze vergadering?" : "Vergaderscore"}{" "}
            <span className="text-base font-normal text-ink-3">{compact ? "· één klik" : "(optioneel)"}</span>
          </h2>
          {!compact && (
            <p className="mb-3 max-w-3xl text-sm leading-relaxed">
              De vergaderscore helpt om de algemene tevredenheid over vergaderingen binnen het bedrijf op te volgen.
            </p>
          )}
          <label
            className={`${compact ? "" : "mb-3"} flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold`}
          >
            <input
              className="size-5 shrink-0 accent-brand"
              type="checkbox"
              checked={draft.askScore ?? false}
              onChange={(e) => patch({ askScore: e.target.checked })}
            />
            {compact ? "Vraag ook de deelnemers om een score" : "Scoreaanvraag individueel naar deelnemers versturen"}
          </label>
        </div>
        <div role="group" aria-label="Score van 1 tot 10" className={styles.scoreScale}>
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
        {(!compact || draft.score !== undefined) && (
          <label className="mt-4 block text-sm font-bold">
            {compact ? "Feedback (optioneel)" : "Feedback"}
            <textarea
              placeholder={compact ? "Wat ging goed, wat kan beter?" : "Aa"}
              className="mt-2 min-h-28 w-full rounded-xl border border-line bg-white p-4 font-normal"
              value={draft.feedback ?? ""}
              onChange={(e) => patch({ feedback: e.target.value })}
            />
          </label>
        )}
        {!compact && <p className="mt-3 text-xs text-ink-3">Optioneel.</p>}
      </section>
      {!compact && (
        <section className={`${styles.finalCard} overflow-hidden rounded-2xl border border-line`}>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 p-6">
            <List aria-hidden className="size-5 text-ink-2" />
            <h2 className="text-lg font-bold">Wat er vastligt</h2>

            <Button
              variant="link"
              className="rounded-none text-brand"
              aria-expanded={overviewOpen}
              aria-controls="wrap-final-overview"
              onClick={() => setOverviewOpen(!overviewOpen)}
            >
              {overviewOpen ? "Verberg overzicht" : "Bekijk overzicht"}
              <ChevronDown aria-hidden className={`size-4 ${overviewOpen ? "rotate-180" : ""}`} />
            </Button>
            <p className="col-span-2 col-start-2 overflow-x-auto text-sm whitespace-nowrap text-ink-2">
              <span>{content.decisions.length} beslissingen</span>
              <span aria-hidden className="mx-2">
                ·
              </span>
              <span>{content.actions.length} acties</span>
              <span aria-hidden className="mx-2">
                ·
              </span>
              <span className="font-bold text-brand">
                {content.carried.length} {content.carried.length === 1 ? "punt verplaatst" : "punten verplaatst"}
              </span>
              <span aria-hidden className="mx-2">
                ·
              </span>
              <span>
                {content.nextDate
                  ? `volgende vergadering ${formatShortDate(content.nextDate)}`
                  : "geen volgende vergadering gepland"}
              </span>
            </p>
          </div>
          {overviewOpen && (
            <div id="wrap-final-overview" className="space-y-5 border-t border-line-soft p-6">
              <div>
                <label htmlFor="wrap-summary" className="block font-bold">
                  Samenvatting
                </label>
                <p id="summary-help" className="mt-1 text-sm text-ink-3">
                  Gegenereerd met AI · 2–3 zinnen, geen opsomming · je kunt alles aanpassen
                </p>
                <textarea
                  id="wrap-summary"
                  aria-describedby="summary-help"
                  className="mt-2 min-h-28 w-full rounded-xl border border-line bg-white p-4 text-sm leading-relaxed"
                  value={draft.summary ?? ""}
                  onChange={(event) => patch({ summary: event.target.value })}
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <section>
                  <h3 className="mb-2 font-bold">Beslissingen</h3>
                  {content.decisions.length ? (
                    <ul className="space-y-2 text-sm text-ink-2">
                      {content.decisions.map((text, index) => (
                        <li key={index}>{text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-3">Geen beslissingen vastgelegd.</p>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 font-bold">Acties</h3>
                  {content.actions.length ? (
                    <ul className="space-y-2 text-sm text-ink-2">
                      {content.actions.map((text, index) => (
                        <li key={index}>{text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-3">Geen acties vastgelegd.</p>
                  )}
                </section>
              </div>
              <p className="text-sm text-ink-3">Wijzigen doe je in de stap waar het thuishoort.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
