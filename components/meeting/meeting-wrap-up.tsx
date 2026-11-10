"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./meeting-wrap-up.module.css";
import { Check, ArrowRight, Trash2 } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore, usePeople, type Meeting, type WrapUpDraft } from "@/lib/store";
import { agendaItems, clockTime, isHandled, nextInSeries } from "@/lib/meeting-wrap-up";
import { initialWrapUpDraft, assignMissingOwners, finishWrapUp, planningError } from "@/lib/wrap-up-flow";
import { WrapUpPlanning, WrapUpFollowUp } from "./wrap-up-follow-up";
import { AgendaItemRow } from "./agenda";
import { EntryPanel } from "./entries";
import { MeetingProvider } from "./meeting-context";
import { agendaMoves } from "./meeting-detail";
import { ownerOptions } from "@/lib/owners";
import { deadlineDate, type AgendaItem, type EntryKind } from "@/lib/agenda";
import { toISO } from "@/lib/date";

const dateValue = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : deadlineDate(value) ? toISO(deadlineDate(value)!) : "";
// Keep stored step IDs stable for drafts created with the original three steps.
const steps = [
  { id: 0, label: "Agenda" },
  { id: 3, label: "Beslissingen" },
  { id: 4, label: "Acties" },
  { id: 1, label: "Volgende vergadering" },
  { id: 2, label: "Opvolging" },
];
const field = "min-h-11 rounded-lg border border-line bg-white px-3 text-sm";
export function MeetingWrapUp({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const router = useRouter();
  const draft = initialWrapUpDraft(meeting, ops.meetings);
  const step = Math.max(
    0,
    steps.findIndex((s) => s.id === (draft.step ?? 0)),
  );
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const patch = (update: Partial<WrapUpDraft>) => {
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    ops.putMeeting({
      ...latest,
      endTimeConfirmed: true,
      wrapUpDraft: {
        ...initialWrapUpDraft(latest, useStore.getState().meetings),
        ...update,
        ...(update.step !== undefined ? { step: steps[update.step].id } : {}),
      },
    });
  };
  useEffect(() => {
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id);
    if (latest && (!latest.wrapUpDraft?.decisions || !latest.endTimeConfirmed)) {
      useStore.getState().putMeeting({
        ...latest,
        endTimeConfirmed: true,
        wrapUpDraft: initialWrapUpDraft(latest, useStore.getState().meetings),
      });
    }
  }, [meeting.id]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const finish = (status: "sent" | "saved") => {
    const state = useStore.getState();
    const latest = state.meetings.find((m) => m.id === meeting.id)!;
    const error = planningError(initialWrapUpDraft(latest, state.meetings));
    if (error) {
      setNotice(error);
      patch({ step: 3 });
      return;
    }
    // TODO(api): explicit delivery of the preview payload; score questions travel in the same follow-up mail.
    useStore.setState({ meetings: finishWrapUp(latest, state.meetings, status) });
    router.push(`/app/overleg/${meeting.id}`);
  };
  const go = (next: number) => {
    if (step === 3 && next > step) {
      const error = planningError(draft);
      if (error) {
        setNotice(error);
        return;
      }
    }
    setNotice("");
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    const count = latest.actions.filter((a) => !a.ownerId).length;
    if (count && step <= 2 && next > 2) {
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
  return (
    <div className={`app-theme ${styles.shell}`}>
      <header className={styles.header}>
        <Logo href="/app" tone="white" />
        <span>{meeting.name}</span>
      </header>
      <div className={styles.panel}>
        <main className={styles.scroll}>
          <div className={styles.content}>
            <nav aria-label="Afrondingsstappen" className={styles.steps}>
              {steps.map(({ label }, index) => (
                <button
                  type="button"
                  key={label}
                  aria-label={`${index + 1}. ${label}`}
                  aria-current={step === index ? "step" : undefined}
                  onClick={() => go(index)}
                  className={styles.step}
                  data-reached={index <= step}
                  data-complete={index < step}
                >
                  <span className={styles.dot} aria-hidden>
                    {index < step && <Check className="size-3" />}
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </nav>
            <div className={styles.body}>
              {draft.entry !== "live" && <EndTimeInfo meeting={meeting} />}
              <h1 ref={heading} tabIndex={-1} className="mb-2 text-3xl font-bold outline-none">
                {step === 3
                  ? nextInSeries(meeting, ops.meetings)
                    ? "Bevestig de volgende vergadering"
                    : "Plan de volgende vergadering"
                  : steps[step].label}
              </h1>
              {step === 0 ? (
                <>
                  <p className="mb-7 text-ink-2">Kijk na wat er nog openstaat en kies wat ermee gebeurt.</p>
                  <AgendaReview meeting={meeting} draft={draft} patch={patch} />
                </>
              ) : step === 1 ? (
                <DecisionsReview meeting={meeting} />
              ) : step === 2 ? (
                <ActionsReview meeting={meeting} />
              ) : step === 3 ? (
                <WrapUpPlanning meeting={meeting} draft={draft} patch={patch} />
              ) : (
                <WrapUpFollowUp meeting={meeting} draft={draft} patch={patch} />
              )}

              {notice && (
                <p role="status" className="my-5 rounded-xl bg-[var(--wrap-amber-bg)] p-4 text-[var(--wrap-amber-ink)]">
                  {notice}
                </p>
              )}
            </div>
          </div>
        </main>
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            {step > 0 && (
              <Button variant="link" className={styles.previousStep} onClick={() => go(step - 1)}>
                ← {steps[step - 1].label}
              </Button>
            )}
            <div className={styles.footerActions}>
              <Button variant="link" onClick={leave}>
                {draft.entry === "live" && meeting.run ? "Terug naar vergadering" : "Later afronden"}
              </Button>
              {step === 4 && (
                <>
                  <Button variant="outline" onClick={() => finish("saved")}>
                    Afronden
                  </Button>
                  <Button onClick={() => finish("sent")}>Inplannen &amp; Afronden</Button>
                </>
              )}
              {step < 4 && <Button onClick={() => go(step + 1)}>{steps[step + 1].label} →</Button>}
            </div>
            <p className="w-full text-xs text-ink-3">
              {step === 4
                ? draft.entry === "live" && meeting.run
                  ? "Afronden bewaart de opvolging zonder mail. Inplannen & Afronden bewaart de planning en verstuurt de opvolging."
                  : "Afronden bewaart de opvolging zonder mail. Inplannen & Afronden bewaart de planning en verstuurt de opvolging."
                : draft.entry === "live" && meeting.run
                  ? "Terug naar vergadering hervat de vergadermodus."
                  : "Later afronden bewaart je keuzes. De opvolging wordt nog niet verstuurd."}
            </p>
          </div>
        </footer>
      </div>
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
        <div className="[&_button]:min-h-11 [&_button]:min-w-11 [&_input]:min-h-11 [&_select]:min-h-11">
          <section className="rounded-2xl border border-line bg-white p-4 sm:p-6">
            <h2 className="text-lg font-bold">Open punten ({open.length})</h2>
            <p className="mt-2 mb-3 text-sm text-ink-2">
              {open.length
                ? "Deze punten zijn nog niet voltooid. Kies wat ermee gebeurt."
                : "Alle punten zijn voltooid."}
            </p>
            {open.map(renderItem)}
          </section>
          <details className="mt-5 rounded-2xl border border-line bg-white p-4 sm:p-6">
            <summary className="min-h-11 cursor-pointer font-bold">Voltooide punten ({done.length})</summary>
            {done.map(renderItem)}
          </details>
        </div>
      </TooltipProvider>
    </MeetingProvider>
  );
}

function DecisionsReview({ meeting }: { meeting: Meeting }) {
  const people = usePeople();
  const items = agendaItems(meeting).filter((item) => item.entries.some((entry) => entry.kind === "decision"));
  return (
    <MeetingProvider
      value={{ meeting, people, owners: ownerOptions(people, meeting.participants, meeting.name, []), now: 0 }}
    >
      <TooltipProvider>
        <p className="mb-7 text-ink-2">
          Controleer de beslissingen die tijdens de vergadering zijn vastgelegd. Je kunt de tekst, eigenaar en
          uitvoerdatum aanpassen.
        </p>
        {items.length ? (
          items.map((item) => (
            <section key={item.id} className="mb-5 rounded-2xl border border-line p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold">{item.text}</h2>
              <EntryPanel item={item} kind="decision" />
            </section>
          ))
        ) : (
          <section className="rounded-2xl border border-line p-4 sm:p-6">
            <h2 className="text-lg font-bold">Geen beslissingen vastgelegd</h2>
            <p className="mt-2 text-sm text-ink-2">
              Een vastgelegde beslissing verschijnt hier met het bijbehorende agendapunt.
            </p>
            <div className="mt-5 rounded-xl bg-brand-soft p-4">
              <p className="mb-2 text-xs font-bold text-brand">Voorbeeld · wordt niet opgeslagen</p>
              <h3 className="font-semibold">Opleidingsbudget Q4</h3>
              <p className="mt-2 text-sm">We keuren het opleidingsbudget voor het vierde kwartaal goed.</p>
              <p className="mt-2 text-sm text-ink-2">Eigenaar: Lisa · Uitvoeren tegen: 30 november</p>
            </div>
          </section>
        )}
      </TooltipProvider>
    </MeetingProvider>
  );
}
function ActionsReview({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const people = usePeople();
  const items = agendaItems(meeting);
  return (
    <>
      <p className="mb-7 text-ink-2">
        Controleer wie elke actie uitvoert en tegen wanneer. Acties zonder eigenaar komen bij jou terecht wanneer je
        verdergaat.
      </p>
      <section className="my-5 rounded-2xl border border-line bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">Acties ({meeting.actions.length})</h2>
        {!meeting.actions.length && <p className="text-sm text-ink-3">Geen acties vastgelegd.</p>}
        {meeting.actions.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3">
            <span className="min-w-40 flex-1 text-sm">{a.what}</span>
            <label className="text-sm">
              Eigenaar{" "}
              <select
                aria-label={`Eigenaar voor ${a.what}`}
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
                type="date"
                value={dateValue(a.deadline)}
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

      {!meeting.actions.length && (
        <div className="rounded-xl bg-brand-soft p-4">
          <p className="mb-2 text-xs font-bold text-brand">Voorbeeld · wordt niet opgeslagen</p>
          <h2 className="font-semibold">Offertes voor de opleiding opvragen</h2>
          <p className="mt-2 text-sm text-ink-2">Eigenaar: Lisa · Deadline: 20 november</p>
        </div>
      )}
    </>
  );
}
