"use client";
import { useEffect, useRef, useState } from "react";
import { NextMeetingScreen } from "./next-meeting-screen";
import { formatTime } from "@/lib/time";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, usePeople, type Meeting } from "@/lib/store";
import {
  actualDuration,
  isHandled,
  carryForward,
  agendaItems,
  clockTime,
  nextInSeries,
  othersOpen,
} from "@/lib/meeting-wrap-up";
import { formatShortDate } from "@/lib/date";
import type { EntryKind } from "@/lib/agenda";

export function MeetingWrapUp({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const people = usePeople();
  const h1 = useRef<HTMLHeadingElement>(null);
  const sent = meeting.followUpStatus === "sent";
  useEffect(() => {
    h1.current?.focus();
  }, [sent]);
  const next = nextInSeries(meeting, ops.meetings);
  const open = othersOpen(meeting, null);
  const entries = agendaItems(meeting).flatMap((i) => i.entries.map((e) => ({ ...e, itemId: i.id })));
  const decisions = entries.filter((e) => e.kind === "decision");
  const actions = meeting.actions;
  const unowned = actions.filter((a) => !a.ownerId).length;
  const participants =
    meeting.attendance?.filter((p) => p.present) ??
    meeting.participants.map((personId) => ({
      personId,
      name: people.find((p) => p.id === personId)?.name ?? personId,
    }));
  const [planningNext, setPlanningNext] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<EntryKind>("action");
  const minutes = Math.round((actualDuration(meeting) ?? 0) / 60000);
  const carry = open.filter((i) => i.carry !== "drop");
  const back = () => ops.putMeeting({ ...meeting, wrapUpOpen: false });
  const send = () => {
    // TODO(api): send participant-specific follow-up through the mail API; local prototype records intent only.
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    const forwarded = carryForward(latest, useStore.getState().meetings);
    // One persisted transaction: transferring points and recording follow-up cannot diverge.
    useStore.setState({
      meetings: forwarded.map((m) =>
        m.id === latest.id
          ? {
              ...latest,
              blocks: latest.blocks.map((b) => ({
                ...b,
                items: b.items.map((i) => (isHandled(latest, i.id) ? { ...i, runStatus: "handled" as const } : i)),
              })),
              followUpStatus: "sent",
              held: true,
              run: null,
              minimized: false,
              wrapUpOpen: false,
            }
          : m,
      ),
    });
  };
  const addEntry = () => {
    if (!text.trim()) return;
    const item = agendaItems(meeting).find((i) => i.id === meeting.run?.currentId) ?? agendaItems(meeting)[0];
    if (item) ops.addEntry(meeting.id, item.id, { kind, text: text.trim(), ownerId: null, date: "" });
    else {
      const block = meeting.blocks.find((b) => b.kind === "topics")?.id ?? ops.addBlock(meeting.id, "topics");
      const id = ops.addAgendaItem(meeting.id, block, "Aanvullingen");
      ops.addEntry(meeting.id, id, { kind, text: text.trim(), ownerId: null, date: "" });
      ops.updateItem(meeting.id, id, { runStatus: "handled" });
    }
    setText("");
  };
  if (planningNext) return <NextMeetingScreen meeting={meeting} onBack={() => setPlanningNext(false)} />;
  return (
    <div className="app-theme w-full">
      <main className="mx-auto w-full max-w-[960px] py-4">
        {sent ? (
          <>
            <CheckCircle2 aria-hidden className="mb-4 size-12 text-[var(--wrap-handled)]" />
            <h1 ref={h1} tabIndex={-1} className="text-3xl font-bold outline-none">
              Vergadering afgerond
            </h1>
            <p className="mt-3">Opvolging verstuurd naar {participants.length} deelnemers.</p>
            {carry.length > 0 && (
              <p className="mt-2">
                Punt {carry.map((i) => agendaItems(meeting).indexOf(i) + 1).join(" en ")}{" "}
                {next?.date ? `staan op de agenda van ${formatShortDate(next.date)}.` : "zijn bewaard voor later."}
              </p>
            )}
            <p className="my-5">Duur vastgelegd: {minutes} min.</p>
            <Button onClick={() => ops.putMeeting({ ...meeting, wrapUpOpen: false })}>Naar vergadering</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-3">
              Afgesloten om {clockTime(meeting.endedAt ?? 0)} · {minutes} min (gepland {meeting.duration})
            </p>
            <h1 ref={h1} tabIndex={-1} className="mt-3 text-3xl font-bold outline-none">
              Vergadering afronden
            </h1>
            <p className="mt-2 mb-6 text-ink-2">
              Kijk na wat er openstaat, bevestig de volgende vergadering en verstuur de opvolging.
            </p>
            {open.length > 0 && (
              <section className="mb-5 rounded-2xl border border-line bg-white p-5">
                <h2 className="font-bold">Nog open ({open.length})</h2>
                <p className="mt-1 mb-4 text-sm text-ink-3">
                  We stellen al een keuze voor. Controleer welke punten je wilt doorschuiven of laten vallen.
                </p>
                {open.map((i) => (
                  <div
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-3"
                  >
                    <span className="font-semibold">
                      {agendaItems(meeting).indexOf(i) + 1}. {i.text}
                    </span>
                    <select
                      aria-label={`Opvolging voor ${i.text}`}
                      value={i.carry ?? "next"}
                      onChange={(event) =>
                        ops.updateItem(meeting.id, i.id, { carry: event.target.value as "next" | "drop" })
                      }
                      className="min-h-11 min-w-[230px] rounded-lg border border-line bg-white px-3 text-sm font-semibold"
                    >
                      <option value="next">
                        {next?.date ? `Naar ${formatShortDate(next.date)}` : "Bewaren voor later"}
                      </option>
                      <option value="drop">Laten vallen</option>
                    </select>
                  </div>
                ))}
              </section>
            )}
            {decisions.length === 0 && actions.length === 0 ? (
              <section className="mb-5 rounded-2xl border border-line bg-white p-5">
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
                  <Button type="submit" size="sm">
                    Toevoegen
                  </Button>
                </form>
              </section>
            ) : (
              <>
                <section className="mb-5 rounded-2xl border border-line bg-white p-5">
                  <h2 className="mb-3 font-bold">Beslissingen ({decisions.length})</h2>
                  {decisions.map((e) => (
                    <div key={e.id} className="flex flex-wrap justify-between gap-3 border-t border-line py-3 text-sm">
                      <span>{e.text}</span>
                      <span className="text-ink-3">
                        {participants.find((p) => p.personId === e.ownerId)?.name}
                        {e.date && ` · uitvoeren tegen ${e.date}`}
                      </span>
                    </div>
                  ))}
                </section>
                <section className="mb-5 rounded-2xl border border-line bg-white p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">Acties ({actions.length})</h2>
                    {unowned > 0 && (
                      <span className="rounded-md bg-[var(--wrap-amber-bg)] px-2 py-1 text-xs font-bold text-[var(--wrap-amber-ink)]">
                        {unowned} {unowned === 1 ? "actie" : "acties"} zonder eigenaar
                      </span>
                    )}
                  </div>
                  {actions.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3 text-sm"
                    >
                      <span className="flex-1">{a.what}</span>
                      <select
                        aria-label={`Eigenaar voor ${a.what}`}
                        value={a.ownerId ?? ""}
                        onChange={(e) => {
                          ops.assignOwner(meeting.id, a.id, e.target.value);
                          const entry = entries.find((v) => v.actionId === a.id);
                          if (entry)
                            ops.updateEntry(meeting.id, entry.itemId, entry.id, { ownerId: e.target.value || null });
                        }}
                        className={`min-h-11 rounded-lg border px-3 ${a.ownerId ? "border-line" : "border-[var(--wrap-amber-ink)]"}`}
                      >
                        <option value="">Kiezen…</option>
                        {participants.map((p) => (
                          <option key={p.personId} value={p.personId}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-ink-3">{a.deadline}</span>
                    </div>
                  ))}
                </section>
              </>
            )}
            {next && (
              <section className="mb-5 rounded-2xl border border-line bg-white p-5">
                <h2 className="mb-3 font-bold">Volgende vergadering</h2>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays aria-hidden className="size-5 shrink-0 text-ink-3" />
                    <div>
                      <p className="font-semibold">
                        {next.date ? formatShortDate(next.date) : "Nog niet ingepland"}
                        {next.time !== null
                          ? ` · ${formatTime(next.time)}–${formatTime(next.time + next.duration)}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-ink-3">
                        Vaste reeks ·{" "}
                        {carry.length
                          ? `${carry.length} doorgeschoven ${carry.length === 1 ? "punt komt" : "punten komen"} op deze agenda`
                          : "geen doorgeschoven punten"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setPlanningNext(true)}>
                    Wijzigen
                  </Button>
                </div>
              </section>
            )}
            {!next && (
              <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5">
                <div>
                  <h2 className="font-bold">Volgende vergadering</h2>
                  <p className="mt-2 text-sm text-ink-3">Nog geen volgende vergadering gepland.</p>
                </div>
                <Button variant="outline" onClick={() => setPlanningNext(true)}>
                  Volgende vergadering plannen
                </Button>
              </section>
            )}
            <footer className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-3">Opvolging gaat naar {participants.length} deelnemers</p>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                <Button variant="outline" size="sm" onClick={back}>
                  Terug naar vergadering
                </Button>
                <Button size="sm" onClick={send}>
                  Rond af &amp; verstuur opvolging
                </Button>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
