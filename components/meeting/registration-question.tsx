"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore, type Meeting } from "@/lib/store";
import { agendaItems, carryForward, plannedEnd } from "@/lib/meeting-wrap-up";
import { registrationState } from "@/lib/meeting-schedule";

export function RegistrationQuestion({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const [notHeld, setNotHeld] = useState(meeting.outcome === "not_held");
  const [beforeConfirmation, setBeforeConfirmation] = useState<Meeting[] | null>(null);
  const [confirmed, setConfirmed] = useState(meeting.outcome === "not_held");
  const state = registrationState(meeting);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("doorgegaan") === "nee")
      document.getElementById("confirm-not-held")?.click();
    if (new URLSearchParams(window.location.search).get("doorgegaan") === "ja")
      document.getElementById("confirm-held")?.click();
  }, []);
  const yes = () => {
    const end = plannedEnd(meeting);
    ops.putMeeting({
      ...meeting,
      outcome: "held",
      filledAfterwards: state === "not_started",
      startedAt: meeting.startedAt ?? end - meeting.duration * 60000,
      endedAt: meeting.endedAt ?? end,
      endReason: "manual",
      endTimeConfirmed: true,
      followUpStatus: "pending",
      run: null,
      wrapUpOpen: false,
      blocks: meeting.blocks.map((b) => ({
        ...b,
        items: b.items.map((i) => ({ ...i, decision: state === "not_started" ? undefined : "next" })),
      })),
    });
  };
  return (
    <div data-meeting-detail className="space-y-6">
      <h1 className="text-4xl font-semibold">{meeting.name}</h1>
      <span className="inline-block rounded-full bg-warning-bg px-3 py-1 font-bold text-warning">
        {notHeld ? "Niet doorgegaan" : state === "not_started" ? "Niet gestart" : "Nog af te ronden"}
      </span>
      {!notHeld ? (
        <section className="rounded-2xl border border-warning bg-warning-bg p-6">
          <h2 className="text-2xl font-bold">Is deze vergadering doorgegaan?</h2>
          <p className="my-4">
            {state === "not_started"
              ? "Deze vergadering werd niet gestart in Too-Doo."
              : "Je startte de vergadering, maar er werd niets vastgelegd."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button id="confirm-held" onClick={yes}>
              {state === "not_started" ? "Ja, achteraf invullen" : "Ja, opvolging toevoegen"}
            </Button>
            <Button id="confirm-not-held" variant="outline" onClick={() => setNotHeld(true)}>
              Nee, niet doorgegaan
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-2xl font-bold">Niet doorgegaan</h2>
          <p>Wat wil je met de agendapunten doen?</p>
          {agendaItems(meeting).map((i) => (
            <label key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3">
              <span>{i.text}</span>
              <select
                aria-label={`Wat met dit punt? ${i.text}`}
                value={i.decision === "drop" ? "drop" : "next"}
                onChange={(e) => ops.updateItem(meeting.id, i.id, { decision: e.target.value as "next" | "drop" })}
                className="min-h-11 rounded-lg border border-line px-3"
              >
                <option value="next">Naar volgende vergadering</option>
                <option value="drop">Laten vallen</option>
              </select>
            </label>
          ))}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (beforeConfirmation) useStore.setState({ meetings: beforeConfirmation });
                else ops.putMeeting({ ...meeting, outcome: undefined });
                setNotHeld(false);
                setConfirmed(false);
              }}
            >
              Ongedaan maken
            </Button>
            <Button
              disabled={confirmed}
              onClick={() => {
                const end = plannedEnd(meeting);
                const source: Meeting = {
                  ...meeting,
                  outcome: "held",
                  startedAt: end - meeting.duration * 60000,
                  endedAt: end,
                  endReason: "manual",
                };
                setBeforeConfirmation(useStore.getState().meetings);
                const transferred = carryForward(source, useStore.getState().meetings);
                useStore.setState({
                  meetings: transferred.map((m) =>
                    m.id === meeting.id
                      ? { ...meeting, outcome: "not_held", held: false, run: null, wrapUpOpen: false }
                      : m,
                  ),
                });
                setConfirmed(true);
              }}
            >
              {confirmed ? "Bevestigd" : "Bevestigen"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

export function AfterwardsFields({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const [notes, setNotes] = useState("");
  // TODO(api): extract decisions/actions from uploaded notes and support PDF/Word extraction.
  const save = () => {
    if (!notes.trim()) return;
    const block = meeting.blocks.find((b) => b.kind === "topics")?.id ?? ops.addBlock(meeting.id, "topics");
    const id = agendaItems(meeting)[0]?.id ?? ops.addAgendaItem(meeting.id, block, "Aanvullingen");
    ops.addEntry(meeting.id, id, { kind: "note", text: notes.trim(), ownerId: null, date: "" });
    setNotes("");
  };
  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-4">
      <h3 className="font-bold">Achteraf aanvullen</h3>
      <label className="flex flex-wrap items-center gap-3 text-sm">
        Duur in minuten
        <input
          type="number"
          min={1}
          max={1440}
          value={Math.round(((meeting.endedAt ?? 0) - (meeting.startedAt ?? 0)) / 60000)}
          onChange={(e) => {
            const minutes = Number(e.target.value);
            if (minutes > 0 && minutes <= 1440)
              ops.putMeeting({ ...meeting, endedAt: (meeting.startedAt ?? 0) + minutes * 60000 });
          }}
          className="min-h-11 w-24 rounded-lg border border-line px-3"
        />
      </label>
      <label className="block text-sm">
        Notities plakken
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 min-h-24 w-full rounded-lg border border-line p-3"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={save}>
          Notities toevoegen
        </Button>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          Notities uploaden
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && file.size <= 1000000) setNotes(await file.text());
            }}
          />
        </label>
      </div>
      <p className="text-sm text-ink-3">Je kunt tekstbestanden uploaden en de inhoud hieronder per punt aanvullen.</p>
    </section>
  );
}
