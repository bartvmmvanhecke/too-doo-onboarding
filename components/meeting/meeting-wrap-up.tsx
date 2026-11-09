"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Trash2 } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore, usePeople, type Meeting, type WrapUpDraft } from "@/lib/store";
import { agendaItems, clockTime, isHandled } from "@/lib/meeting-wrap-up";
import { initialWrapUpDraft, assignMissingOwners, finishWrapUp } from "@/lib/wrap-up-flow";
import { WrapUpPlanning, WrapUpFollowUp } from "./wrap-up-follow-up";
import { AgendaItemRow } from "./agenda";
import { EntryPanel } from "./entries";
import { MeetingProvider } from "./meeting-context";
import { agendaMoves } from "./meeting-detail";
import { ownerOptions } from "@/lib/owners";
import type { AgendaItem, EntryKind } from "@/lib/agenda";

const field = "min-h-11 rounded-lg border border-line bg-white px-3 text-sm";
export function MeetingWrapUp({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const router = useRouter();
  const draft = initialWrapUpDraft(meeting, ops.meetings);
  const step = draft.step ?? 0;
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const patch = (update: Partial<WrapUpDraft>) => {
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    ops.putMeeting({
      ...latest,
      endTimeConfirmed: true,
      wrapUpDraft: { ...initialWrapUpDraft(latest, useStore.getState().meetings), ...update },
    });
  };
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const go = (next: number) => {
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    const count = latest.actions.filter((a) => !a.ownerId).length;
    if (count && next > 0) {
      setNotice(
        count === 1
          ? "1 actie heeft geen eigenaar. Ze komt bij jou terecht."
          : `${count} acties hebben geen eigenaar. Ze komen bij jou terecht.`,
      );
      ops.putMeeting(assignMissingOwners(latest));
    }
    patch({ step: next });
  };
  const leave = () => {
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    if (draft.entry === "live" && latest.run)
      ops.putMeeting({
        ...latest,
        endedAt: undefined,
        endReason: undefined,
        endTimeConfirmed: undefined,
        wrapUpOpen: false,
        minimized: false,
      });
    else ops.putMeeting({ ...latest, wrapUpOpen: false, wrapUpDraft: { ...draft, entry: "later" } });
    router.push(`/app/overleg/${meeting.id}`);
  };
  const labels = ["Agenda & acties", "Volgende vergadering", "Opvolging"];
  return (
    <div className="app-theme min-h-dvh bg-app p-4 sm:p-8">
      <header className="mx-auto mb-8 flex max-w-[1060px] flex-wrap items-center gap-6">
        <Logo href="/app" />
        <span className="text-lg font-semibold">{meeting.name}</span>
      </header>
      <main className="mx-auto max-w-[1060px]">
        <nav aria-label="Afrondingsstappen" className="mb-8 flex flex-wrap gap-2">
          {labels.map((label, index) => (
            <button
              type="button"
              key={label}
              aria-current={step === index ? "step" : undefined}
              onClick={() => go(index)}
              className={`min-h-11 rounded-full border px-5 text-sm font-bold ${step === index ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-2"}`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </nav>
        {draft.entry !== "live" && <EndTimeInfo meeting={meeting} />}
        <h1 ref={heading} tabIndex={-1} className="mb-2 text-3xl font-bold outline-none">
          {labels[step]}
        </h1>
        {step === 0 ? (
          <>
            <p className="mb-7 text-ink-2">Kijk na wat er nog openstaat en wie wat doet tegen wanneer.</p>
            <AgendaReview meeting={meeting} draft={draft} patch={patch} />
          </>
        ) : step === 1 ? (
          <WrapUpPlanning meeting={meeting} draft={draft} patch={patch} />
        ) : (
          <WrapUpFollowUp
            meeting={meeting}
            draft={draft}
            patch={patch}
            finish={(status) => {
              // TODO(api): send the exact preview payload via the mail provider only on this explicit click.
              const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
              useStore.setState({ meetings: finishWrapUp(latest, useStore.getState().meetings, status) });
              router.push(`/app/overleg/${meeting.id}`);
            }}
          />
        )}

        {notice && (
          <p role="status" className="my-5 rounded-xl bg-[var(--wrap-amber-bg)] p-4 text-[var(--wrap-amber-ink)]">
            {notice}
          </p>
        )}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6">
          <Button variant="ghost" onClick={leave}>
            {draft.entry === "live" && meeting.run ? "Terug naar de vergadering" : "Later afronden"}
          </Button>
          {step < 2 && (
            <Button onClick={() => go(step + 1)}>{step === 0 ? "Volgende vergadering →" : "Opvolging →"}</Button>
          )}
        </footer>
      </main>
    </div>
  );
}
export function EndTimeInfo({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(clockTime(meeting.endedAt!));
  const [error, setError] = useState("");
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-ink-2">
      <span>Afgesloten om {clockTime(meeting.endedAt!)}</span> ·{" "}
      {!editing ? (
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Aanpassen
        </Button>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const date = new Date(meeting.endedAt!);
            const [h, m] = time.split(":").map(Number);
            date.setHours(h, m, 0, 0);
            if (date.getTime() < (meeting.startedAt ?? 0)) {
              setError("De eindtijd mag niet vóór de starttijd liggen.");
              return;
            }
            ops.putMeeting({ ...meeting, endedAt: date.getTime(), endTimeConfirmed: true });
            setEditing(false);
            setError("");
          }}
        >
          <label>
            Eindtijd{" "}
            <input className={field} type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <Button type="submit">Bewaren</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Annuleren
          </Button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function AgendaReview({
  meeting,
  draft,
  patch,
}: {
  meeting: Meeting;
  draft: WrapUpDraft;
  patch: (p: Partial<WrapUpDraft>) => void;
}) {
  const people = usePeople();
  const ops = useStore();
  const [editing, setEditing] = useState<{ id: string; kind: EntryKind } | null>(null);
  const items = agendaItems(meeting);
  const open = items.filter((i) => !isHandled(meeting, i.id));
  const done = items.filter((i) => isHandled(meeting, i.id));
  const moves = agendaMoves(meeting, ops);
  const renderItem = (item: AgendaItem) => {
    const block = meeting.blocks.find((b) => b.items.some((i) => i.id === item.id))!;
    return (
      <div key={item.id} className="border-t border-line py-4 first:border-0">
        <ul>
          <AgendaItemRow
            item={item}
            block={block}
            index={block.items.indexOf(item)}
            moves={moves}
            onOpenDetails={() => setEditing({ id: item.id, kind: "note" })}
          />
        </ul>
        {!isHandled(meeting, item.id) && (
          <>
            <p className="my-2 text-sm text-ink-3">
              {item.visitedAt !== undefined
                ? `besproken · ${item.entries.filter((e) => e.kind !== "document").length} items vastgelegd`
                : "niet aan bod gekomen"}
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "done", label: "Voltooien", Icon: Check },
                  { value: "next", label: "Verplaatsen naar volgende vergadering", Icon: ArrowRight },
                  { value: "drop", label: "Laten vallen", Icon: Trash2 },
                ] as const
              ).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${label}: ${item.text}`}
                  aria-pressed={draft.decisions?.[item.id] === value}
                  onClick={() => patch({ decisions: { ...draft.decisions, [item.id]: value } })}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${value === "drop" ? "text-danger" : "text-ink"} ${draft.decisions?.[item.id] === value ? (value === "drop" ? "border-danger bg-danger/10" : "border-brand bg-brand-soft") : "border-line bg-white"}`}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {(["decision", "action", "note"] as const).map((kind) => (
            <Button
              key={kind}
              variant="ghost"
              onClick={() =>
                setEditing(editing?.id === item.id && editing.kind === kind ? null : { id: item.id, kind })
              }
            >
              {kind === "decision" ? "Beslissingen" : kind === "action" ? "Acties" : "Notities"} (
              {item.entries.filter((e) => e.kind === kind).length})
            </Button>
          ))}
        </div>
        {editing?.id === item.id && <EntryPanel item={item} kind={editing.kind} onClose={() => setEditing(null)} />}
      </div>
    );
  };
  return (
    <MeetingProvider
      value={{ meeting, people, owners: ownerOptions(people, meeting.participants, meeting.name, []), now: 0 }}
    >
      <TooltipProvider>
        <section className="rounded-2xl border border-line bg-white p-4 sm:p-6">
          <h2 className="text-lg font-bold">Open punten ({open.length})</h2>
          <p className="mt-2 mb-3 text-sm text-ink-2">
            {open.length ? "Deze punten zijn nog niet voltooid. Kies wat ermee gebeurt." : "Alle punten zijn voltooid."}
          </p>
          {open.map(renderItem)}
        </section>
        <section className="my-5 rounded-2xl border border-line bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-bold">Acties ({meeting.actions.length})</h2>
          {!meeting.actions.length && <p className="text-sm text-ink-3">Geen acties vastgelegd.</p>}
          {meeting.actions.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3">
              <span className="min-w-40 flex-1 text-sm">{a.what}</span>
              <label className="text-sm">
                Eigenaar{" "}
                <select
                  className={field}
                  value={a.ownerId ?? ""}
                  onChange={(e) => {
                    ops.assignOwner(meeting.id, a.id, e.target.value);
                    const item = items.find((i) => i.entries.some((entry) => entry.actionId === a.id));
                    const entry = item?.entries.find((entry) => entry.actionId === a.id);
                    if (item && entry)
                      ops.updateEntry(meeting.id, item.id, entry.id, { ownerId: e.target.value || null });
                  }}
                >
                  <option value="">Kiezen…</option>
                  {people
                    .filter((p) => meeting.participants.includes(p.id) || p.id === meeting.startedBy)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                Datum{" "}
                <input
                  aria-label={`Datum voor ${a.what}`}
                  className={field}
                  value={a.deadline}
                  onChange={(e) => {
                    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
                    ops.putMeeting({
                      ...latest,
                      actions: latest.actions.map((action) =>
                        action.id === a.id ? { ...action, deadline: e.target.value } : action,
                      ),
                      blocks: latest.blocks.map((b) => ({
                        ...b,
                        items: b.items.map((i) => ({
                          ...i,
                          entries: i.entries.map((entry) =>
                            entry.actionId === a.id ? { ...entry, date: e.target.value } : entry,
                          ),
                        })),
                      })),
                    });
                  }}
                />
              </label>
            </div>
          ))}
        </section>
        <details className="rounded-2xl border border-line bg-white p-4 sm:p-6">
          <summary className="min-h-11 cursor-pointer font-bold">Voltooide punten ({done.length})</summary>
          {done.map(renderItem)}
        </details>
      </TooltipProvider>
    </MeetingProvider>
  );
}
