"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, usePeople, type Meeting } from "@/lib/store";
import {
  actualDuration,
  agendaItems,
  clockTime,
  nextInSeries,
  othersOpen,
  suggestDecision,
} from "@/lib/meeting-wrap-up";
import { sendFollowUp } from "@/lib/meeting-follow-up";
import { formatShortDate, toISO, today } from "@/lib/date";
import { formatTime } from "@/lib/time";
import { meetingNow } from "@/lib/meeting-clock";
import type { EntryKind } from "@/lib/agenda";
import { FollowUpPreview } from "./follow-up-preview";

export function MeetingWrapUp({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const people = usePeople();
  const router = useRouter();
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    h1.current?.focus();
  }, []);
  const next = nextInSeries(meeting, ops.meetings);
  const open = othersOpen(meeting, null);
  const entries = agendaItems(meeting).flatMap((i) => i.entries);
  const decisions = entries.filter((e) => e.kind === "decision");
  const unowned = meeting.actions.filter((a) => !a.ownerId).length;
  const participants =
    meeting.attendance?.filter((p) => p.present).map((p) => ({ id: p.personId, name: p.name })) ??
    people.filter((p) => meeting.participants.includes(p.id));
  const [text, setText] = useState("");
  const [kind, setKind] = useState<EntryKind>("action");
  const [preview, setPreview] = useState(false);
  const [editingNext, setEditingNext] = useState(false);
  const [nextDate, setNextDate] = useState(next?.date ?? toISO(today()));
  const [nextTime, setNextTime] = useState(formatTime(next?.time ?? meeting.time ?? 540));
  const [noNext, setNoNext] = useState(false);
  const [dateError, setDateError] = useState("");
  const duration = actualDuration(meeting);
  const minutes = duration === null ? null : Math.round(duration / 60000);
  const carry = open.filter((i) => (i.decision ?? suggestDecision(i)) === "next");
  const missing = meeting.filledAfterwards ? open.filter((i) => !i.decision).length : 0;
  const saveNext = () => {
    if (noNext && !next) return true;
    if (!nextDate || !nextTime || (meeting.date && nextDate <= meeting.date)) {
      setDateError("Kies een datum na deze vergadering.");
      return false;
    }
    const [hours, minutes] = nextTime.split(":").map(Number);
    const time = hours * 60 + minutes;
    // TODO(api): update linked Outlook appointment after saving date/time.
    if (next) ops.putMeeting({ ...next, date: nextDate, time });
    else {
      const seriesId = meeting.seriesId ?? `series-${meeting.id}`;
      ops.putMeeting({ ...useStore.getState().meetings.find((m) => m.id === meeting.id)!, seriesId });
      ops.createMeeting(
        { name: meeting.name, date: nextDate, time, duration: meeting.duration, recurrence: meeting.recurrence },
        { seriesId, participants: meeting.participants, showWelcome: false, invited: false, blocks: [] },
      );
    }
    setDateError("");
    setEditingNext(false);
    return true;
  };
  const send = () => {
    if (missing) return;
    if ((!next || editingNext) && !saveNext()) return;
    sendFollowUp(meeting.id, false, meetingNow(meeting));
    router.replace(`/vergaderingen/${meeting.id}`);
  };
  const back = () => {
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    ops.putMeeting({
      ...latest,
      wrapUpOpen: false,
      ...(latest.endReason === "manual" && latest.run
        ? { endedAt: undefined, endReason: undefined, minimized: false }
        : {}),
    });
    router.push(`/vergaderingen/${meeting.id}`);
  };
  const addEntry = () => {
    if (!text.trim()) return;
    let item = agendaItems(meeting)[0]?.id;
    if (!item) {
      const block = meeting.blocks.find((b) => b.kind === "topics")?.id ?? ops.addBlock(meeting.id, "topics");
      item = ops.addAgendaItem(meeting.id, block, "Aanvullingen");
    }
    ops.addEntry(meeting.id, item, { kind, text: text.trim(), ownerId: null, date: "" });
    setText("");
  };
  const card = "mb-5 rounded-2xl border border-line bg-white p-5";
  return (
    <div className="app-theme w-full">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <span className="font-bold">too-doo · {meeting.name} · afronden</span>
        <Button variant="ghost" onClick={back}>
          ← Terug naar vergadering
        </Button>
      </header>
      <main className="mx-auto w-full max-w-[960px] py-4">
        <p className="text-sm text-ink-3">
          Afgesloten om {clockTime(meeting.endedAt ?? 0)} · {minutes === null ? "duur onbekend" : `${minutes} min`}{" "}
          (gepland {meeting.duration})
        </p>
        <h1 ref={h1} tabIndex={-1} className="mt-3 text-3xl font-bold outline-none">
          Vergadering afronden
        </h1>
        <p className="mt-2 mb-6 text-ink-2">
          Kijk na wat er openstaat, bevestig de volgende vergadering en verstuur de opvolging.
        </p>
        {!!open.length && (
          <section className={card}>
            <h2 className="font-bold">Nog open ({open.length})</h2>
            <p className="mt-1 mb-4 text-sm text-ink-3">
              We stelden al een keuze voor. Werd er iets vastgelegd, dan staat het punt op voltooid; anders schuift het
              door.
            </p>
            {open.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3">
                <div>
                  <p className="font-semibold">
                    {agendaItems(meeting).indexOf(i) + 1}. {i.text}
                  </p>
                  <p className="mt-1 text-sm text-ink-3">
                    {i.visitedAt
                      ? i.entries.length
                        ? `besproken · ${i.entries.length} items vastgelegd`
                        : "kort bekeken · niets vastgelegd"
                      : "niet aan bod gekomen"}
                  </p>
                </div>
                <select
                  aria-label={`Wat met dit punt? ${i.text}`}
                  value={i.decision ?? (meeting.filledAfterwards ? "" : suggestDecision(i))}
                  onChange={(e) =>
                    ops.updateItem(meeting.id, i.id, { decision: e.target.value as "done" | "next" | "drop" })
                  }
                  className="min-h-11 min-w-[230px] rounded-lg border border-line bg-white px-3 text-sm font-semibold"
                >
                  <option value="" disabled>
                    Kies…
                  </option>
                  <option value="done">Voltooid</option>
                  <option value="next">
                    {next?.date ? `Naar ${formatShortDate(next.date)}` : "Bewaren voor later"}
                  </option>
                  <option value="drop">Laten vallen</option>
                </select>
              </div>
            ))}
          </section>
        )}
        {!decisions.length && !meeting.actions.length ? (
          <section className={card}>
            <h2 className="font-bold">Geen acties vastgelegd</h2>
            <p className="my-2 text-sm">Iets vergeten? Voeg het nu nog toe.</p>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addEntry();
              }}
            >
              <select
                aria-label="Soort vastlegging"
                value={kind}
                onChange={(e) => setKind(e.target.value as EntryKind)}
                className="min-h-11 rounded-lg border border-line px-2"
              >
                <option value="action">Actie</option>
                <option value="decision">Beslissing</option>
                <option value="note">Notitie</option>
              </select>
              <input
                aria-label="Omschrijving"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-line px-3"
                placeholder="Voeg iets toe…"
              />
              <Button type="submit">Toevoegen</Button>
            </form>
          </section>
        ) : (
          <>
            <section className={card}>
              <h2 className="mb-3 font-bold">Beslissingen ({decisions.length})</h2>
              {decisions.map((e) => (
                <div key={e.id} className="flex flex-wrap justify-between gap-3 border-t border-line py-3 text-sm">
                  <span>{e.text}</span>
                  <span className="text-ink-3">{e.date && `uitvoeren tegen ${e.date}`}</span>
                </div>
              ))}
            </section>
            <section className={card}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="font-bold">Acties ({meeting.actions.length})</h2>
                {!!unowned && (
                  <span className="rounded-md bg-warning-bg px-2 py-1 text-xs font-bold text-warning">
                    {unowned} {unowned === 1 ? "actie" : "acties"} zonder eigenaar
                  </span>
                )}
              </div>
              {meeting.actions.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3 text-sm"
                >
                  <span className="flex-1">{a.what}</span>
                  {a.ownerId ? (
                    <span className="text-ink-3">{people.find((p) => p.id === a.ownerId)?.name}</span>
                  ) : (
                    <label className="flex items-center gap-2 text-ink-3">
                      Eigenaar
                      <select
                        aria-label={`Eigenaar voor ${a.what}`}
                        value=""
                        onChange={(e) => {
                          ops.assignOwner(meeting.id, a.id, e.target.value);
                          const item = agendaItems(meeting).find((i) => i.entries.some((v) => v.actionId === a.id));
                          const entry = item?.entries.find((v) => v.actionId === a.id);
                          if (item && entry)
                            ops.updateEntry(meeting.id, item.id, entry.id, { ownerId: e.target.value });
                        }}
                        className="min-h-11 rounded-lg border border-warning px-3"
                      >
                        <option value="">Kiezen…</option>
                        {participants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <span className="text-ink-3">{a.deadline}</span>
                </div>
              ))}
            </section>
          </>
        )}
        <section className={card}>
          <h2 className="mb-3 font-bold">Volgende vergadering</h2>
          {next && !editingNext ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <div className="flex items-center gap-3">
                <CalendarDays aria-hidden className="size-5 text-ink-3" />
                <div>
                  <p className="font-semibold">
                    {next.date ? formatShortDate(next.date) : "Nog niet ingepland"}
                    {next.time !== null && ` · ${formatTime(next.time)}–${formatTime(next.time + next.duration)}`}
                  </p>
                  <p className="mt-1 text-sm text-ink-3">
                    Vaste reeks · {carry.length} doorgeschoven punten komen op deze agenda
                  </p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setEditingNext(true)}>
                Wijzigen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {!next && (
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" checked={noNext} onChange={(e) => setNoNext(e.target.checked)} />
                  Geen volgende vergadering
                </label>
              )}
              {(!noNext || next) && (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm">
                    Datum
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="mt-1 block min-h-11 rounded-lg border border-line px-3"
                    />
                  </label>
                  <label className="text-sm">
                    Uur
                    <input
                      type="time"
                      value={nextTime}
                      onChange={(e) => setNextTime(e.target.value)}
                      className="mt-1 block min-h-11 rounded-lg border border-line px-3"
                    />
                  </label>
                  <Button variant="outline" onClick={saveNext}>
                    Bewaar
                  </Button>
                </div>
              )}
              {noNext && <p className="text-sm text-ink-3">Doorgeschoven punten worden bewaard voor later.</p>}
              {dateError && (
                <p role="alert" className="text-sm text-danger">
                  {dateError}
                </p>
              )}
            </div>
          )}
        </section>
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-3">
            Opvolging gaat naar {participants.length} deelnemers{missing ? ` · nog ${missing} te kiezen` : ""}
          </p>
          <div className="ml-auto flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={back}>
              Terug naar vergadering
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if ((!next || editingNext) && !saveNext()) return;
                setPreview(true);
              }}
            >
              Voorbeeld
            </Button>
            <Button
              disabled={missing > 0}
              className={ops.demo.wrapUpPrimary ? "bg-[var(--wrap-primary)]" : "bg-danger hover:bg-danger/90"}
              onClick={send}
            >
              {meeting.filledAfterwards ? "Bewaar & verstuur opvolging" : "Rond af & verstuur opvolging"}
            </Button>
          </div>
        </footer>
      </main>
      <FollowUpPreview meeting={meeting} open={preview} onOpenChange={setPreview} onSend={send} />
    </div>
  );
}
