"use client";
import styles from "./meeting-wrap-up.module.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, List } from "lucide-react";
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
}: {
  meeting: Meeting;
  draft: WrapUpDraft;
  patch: (p: Partial<WrapUpDraft>) => void;
}) {
  const meetings = useStore((s) => s.meetings);
  const next = nextInSeries(meeting, meetings);
  const [editing, setEditing] = useState(false);
  const [planningCollapsed, setPlanningCollapsed] = useState(false);
  const [beforeEdit, setBeforeEdit] = useState<Partial<WrapUpDraft>>({});
  const carried = agendaItems(meeting).filter((item) => draft.decisions?.[item.id] === "next");
  const proposedDate = new Date(`${meeting.date || toISO(new Date())}T12:00:00`);
  proposedDate.setDate(proposedDate.getDate() + 7);
  const planningName = !next && !draft.nextDate ? "" : (draft.nextName ?? "");
  const planningDate = draft.nextDate || toISO(proposedDate);
  const scheduled = !draft.noNext && !!draft.nextDate && !!planningName.trim();
  const when = scheduled ? formatShortDate(draft.nextDate!) : "";
  const openEditor = () => {
    setBeforeEdit({
      nextName: draft.nextName,
      nextDate: draft.nextDate,
      nextTime: draft.nextTime,
      noNext: draft.noNext,
    });
    setEditing(true);
    if (!scheduled) {
      const date = new Date(`${meeting.date || new Date().toISOString().slice(0, 10)}T12:00:00`);
      date.setDate(date.getDate() + 7);
      patch({ nextDate: toISO(date), nextName: meeting.name, noNext: false });
    }
  };
  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-ink-2">Optioneel. Hier komen de verplaatste punten terecht.</p>
      <section
        className={`${styles.finalCard} rounded-2xl border p-5 ${scheduled && !editing && next ? "border-brand" : "border-line"} ${!scheduled && !editing && next ? "border-dashed" : ""}`}
      >
        {editing || !next ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold">
                  {next ? "Deze vergadering verplaatsen" : "Nog geen volgende vergadering ingepland"}
                </h2>
                <p className="mt-1 text-sm text-ink-3">
                  {next
                    ? "Je wijzigt de bestaande vergadering. Er komt geen tweede bij, en de rest van de reeks blijft zoals ze is."
                    : "Plan optioneel je volgende vergadering. Heb je nog geen vervolgmoment in gedachten, klik dan op ‘Ik weet het nog niet’."}
                </p>
              </div>
              {!next && (
                <Button
                  variant="link"
                  className="shrink-0 text-brand"
                  aria-expanded={!planningCollapsed}
                  aria-controls="next-meeting-fields"
                  onClick={() => {
                    const collapsed = !planningCollapsed;
                    setPlanningCollapsed(collapsed);
                    patch({ noNext: collapsed || !planningName.trim() });
                  }}
                >
                  {planningCollapsed ? "Plan volgende vergadering" : "Ik weet het nog niet"}
                </Button>
              )}
              {next && (
                <Button
                  variant="link"
                  onClick={() => {
                    patch(beforeEdit);
                    setEditing(false);
                  }}
                >
                  Annuleren
                </Button>
              )}
            </div>
            {(!planningCollapsed || next) && (
              <div id="next-meeting-fields" className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-bold">
                  Naam
                  <input
                    className={field}
                    value={planningName}
                    placeholder={`Bijvoorbeeld: ${meeting.name}`}
                    onChange={(event) =>
                      patch({
                        nextName: event.target.value,
                        nextDate: planningDate,
                        noNext: !event.target.value.trim(),
                      })
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-bold">
                  Datum
                  <input
                    className={field}
                    type="date"
                    min={meeting.date || undefined}
                    value={planningDate}
                    onChange={(event) =>
                      patch({ nextDate: event.target.value, nextName: planningName, noNext: !planningName.trim() })
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-bold">
                  Tijd
                  <input
                    className={field}
                    type="time"
                    value={draft.nextTime ?? "09:00"}
                    onChange={(event) => patch({ nextTime: event.target.value })}
                  />
                </label>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            {scheduled && (
              <div className="rounded-xl bg-brand-soft px-3 py-2 text-center font-bold text-brand">
                <span className="block text-xs uppercase">
                  {new Date(`${draft.nextDate}T12:00:00`).toLocaleDateString("nl-BE", { month: "short" })}
                </span>
                <span>{Number(draft.nextDate!.slice(-2))}</span>
              </div>
            )}
            <div className="min-w-0 flex-1 basis-60">
              <h2 className="font-bold">
                {scheduled
                  ? next
                    ? "Al gepland · uit de reeks"
                    : "Volgende vergadering gepland"
                  : "Nog geen volgende vergadering gepland"}
              </h2>
              <p className="mt-1 text-sm text-ink-2">
                {scheduled
                  ? `${draft.nextName || meeting.name} · ${when} · ${draft.nextTime || "09:00"}–${formatTime(Number((draft.nextTime || "09:00").split(":")[0]) * 60 + Number((draft.nextTime || "09:00").split(":")[1]) + (draft.nextDuration ?? meeting.duration))}`
                  : "Je kunt gewoon verder. Verplaatste punten gaan dan naar “Bewaard voor later”."}
              </p>
            </div>
            <Button variant="link" className="text-brand" onClick={openEditor}>
              {scheduled ? "Datum of tijd wijzigen" : "+ Volgende vergadering plannen"}
            </Button>
          </div>
        )}
      </section>
      <section className={`${styles.finalCard} rounded-2xl border border-line p-5`}>
        <h2 className="text-sm font-bold">
          {scheduled ? `Schuift door naar ${when}` : "Gaat naar “Bewaard voor later”"}
        </h2>
        {carried.length ? (
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            {carried.map((item) => (
              <li key={item.id}>→ {item.text}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-3">Geen verplaatste punten.</p>
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
}: {
  meeting: Meeting;
  draft: WrapUpDraft;
  patch: (p: Partial<WrapUpDraft>) => void;
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
        <h2 className="mb-2 text-xl font-bold text-ink">
          Vergaderscore <span className="text-base font-normal text-ink-3">(optioneel)</span>
        </h2>
        <p className="mb-3 max-w-3xl text-sm leading-relaxed">
          De vergaderscore helpt om de algemene tevredenheid over vergaderingen binnen het bedrijf op te volgen.
        </p>
        <label className="mb-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold">
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
        <label className="mt-4 block text-sm font-bold">
          Feedback
          <textarea
            placeholder="Aa"
            className="mt-2 min-h-28 w-full rounded-xl border border-line bg-white p-4 font-normal"
            value={draft.feedback ?? ""}
            onChange={(e) => patch({ feedback: e.target.value })}
          />
        </label>
        <p className="mt-3 text-xs text-ink-3">Optioneel.</p>
      </section>
      <section className={`${styles.finalCard} overflow-hidden rounded-2xl border border-line`}>
        <div className="flex flex-wrap items-center gap-5 p-6">
          <List aria-hidden className="size-5 shrink-0 text-ink-2" />
          <div className="min-w-0 flex-1 basis-80">
            <h2 className="mb-2 text-lg font-bold">Wat er vastligt</h2>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2">
              <span>{content.decisions.length} beslissingen</span>
              <span aria-hidden>·</span>
              <span>{content.actions.length} acties</span>
              <span aria-hidden>·</span>
              <span className="font-bold text-brand">
                {content.carried.length} {content.carried.length === 1 ? "punt verplaatst" : "punten verplaatst"}
              </span>
              <span aria-hidden>·</span>
              <span className="font-bold text-brand">
                {content.nextDate
                  ? `volgende vergadering ${formatShortDate(content.nextDate)}`
                  : "geen volgende vergadering gepland"}
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full text-brand"
            aria-expanded={overviewOpen}
            aria-controls="wrap-final-overview"
            onClick={() => setOverviewOpen(!overviewOpen)}
          >
            {overviewOpen ? "Verberg overzicht" : "Bekijk overzicht"}
            <ChevronDown aria-hidden className={`size-4 ${overviewOpen ? "rotate-180" : ""}`} />
          </Button>
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
    </div>
  );
}
