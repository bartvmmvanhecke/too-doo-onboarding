"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./meeting-wrap-up.module.css";
import { Check, ArrowRight, Trash2, Scale, SquareCheck, Timer, CalendarDays, ListChecks } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { formatShortDate } from "@/lib/date";
import { isDemoEnvironment } from "@/lib/demo-environment";
import { loadPlanningScenario } from "@/lib/prototype/planningScenarios";
import { ensureDirectieExample } from "@/lib/prototype/meetingsOverviewScenarios";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore, usePeople, type Meeting, type WrapUpDraft } from "@/lib/store";
import { agendaItems, clockTime, isHandled, nextInSeries, suggestDecision } from "@/lib/meeting-wrap-up";
import { initialWrapUpDraft, assignMissingOwners, finishWrapUp, planningError } from "@/lib/wrap-up-flow";
import { WrapUpPlanning, WrapUpFollowUp } from "./wrap-up-follow-up";
import { EntryPanel } from "./entries";
import { MeetingProvider } from "./meeting-context";
import { ownerOptions } from "@/lib/owners";
import { type AgendaItem, type EntryKind } from "@/lib/agenda";

// Keep stored step IDs stable for drafts created with the original three steps.
const steps = [
  { id: 0, label: "Agenda" },
  { id: 3, label: "Beslissingen" },
  { id: 4, label: "Acties" },
  { id: 1, label: "Volgende vergadering" },
  { id: 2, label: "Afronden" },
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
    ensureDirectieExample();
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
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 pr-14">
          <span>{meeting.name}</span>
          {step === 3 && isDemoEnvironment() && (
            <div
              role="region"
              aria-label="Prototype volgende vergadering"
              className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--prototype-bar-bg)] p-2 text-[13px] text-white"
            >
              <span className="px-1 text-[11px] font-bold text-[var(--prototype-bar-muted)]">PROTOTYPE</span>
              {[
                { scheduled: true, label: "Volgende reeds ingepland" },
                { scheduled: false, label: "Volgende nog niet ingepland" },
              ].map(({ scheduled, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={!!nextInSeries(meeting, ops.meetings) === scheduled}
                  onClick={() => loadPlanningScenario(meeting.id, scheduled)}
                  className="min-h-11 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 aria-pressed:ring-2 aria-pressed:ring-white/60"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
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
              {draft.entry !== "live" && step !== 3 && <EndTimeInfo meeting={meeting} />}
              <h1 ref={heading} tabIndex={-1} className="mb-2 text-3xl font-bold outline-none">
                {steps[step].label}
              </h1>
              {step === 0 ? (
                <>
                  <p className="mb-7 text-ink-2">
                    Kies wat er gebeurt met de punten die nog openstaan. Per punt staat een voorstel klaar.
                  </p>
                  <AgendaReview meeting={meeting} draft={draft} patch={patch} />
                </>
              ) : step === 1 ? (
                <DecisionsReview meeting={meeting} />
              ) : step === 2 ? (
                <ActionsReview meeting={meeting} />
              ) : step === 3 ? (
                <WrapUpPlanning
                  key={nextInSeries(meeting, ops.meetings)?.id ?? "unscheduled"}
                  meeting={meeting}
                  draft={draft}
                  patch={patch}
                />
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
              {step === 4 && <Button onClick={() => finish("saved")}>Vergadering afronden</Button>}
              {step < 4 && <Button onClick={() => go(step + 1)}>{steps[step + 1].label} →</Button>}
            </div>
            <p className="w-full text-xs text-ink-3">
              {step === 4
                ? "Je keuzes en eventuele planning worden bewaard. Je kunt de opvolging daarna versturen."
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
  const [editing, setEditing] = useState<{ id: string; kind: EntryKind } | null>(null);
  const items = agendaItems(meeting);
  const open = items.filter((i) => !isHandled(meeting, i.id));
  const done = items.filter((i) => isHandled(meeting, i.id));
  const renderItem = (item: AgendaItem) => {
    const block = meeting.blocks.find((b) => b.items.some((i) => i.id === item.id))!;
    const discussed = item.visitedAt !== undefined;
    const recorded = item.entries.filter((entry) => entry.kind !== "document").length;
    const suggestion = suggestDecision(item);
    return (
      <article key={item.id} aria-label={item.text} className={styles.agendaCard}>
        <div className={styles.agendaCardHeader}>
          <span className={styles.agendaCategory}>{block.title}</span>
          <div className={styles.agendaCounts}>
            {(
              [
                { kind: "decision", label: "beslissingen", Icon: Scale },
                { kind: "action", label: "acties", Icon: SquareCheck },
              ] as const
            ).map(({ kind, label, Icon }) => (
              <button
                type="button"
                key={kind}
                onClick={() =>
                  setEditing(editing?.id === item.id && editing.kind === kind ? null : { id: item.id, kind })
                }
              >
                <Icon aria-hidden className="size-4" /> {item.entries.filter((entry) => entry.kind === kind).length}{" "}
                {label}
              </button>
            ))}
          </div>
        </div>
        <h3 className="mt-2 text-lg font-bold">{item.text}</h3>
        <p className="mt-2 mb-5 flex flex-wrap items-center gap-2 text-sm text-ink-3">
          <Timer aria-hidden className="size-4" />
          {item.duration != null && <span>{item.duration} min ·</span>}
          {discussed
            ? `besproken · ${recorded ? `${recorded} items vastgelegd` : "niets vastgelegd"}`
            : "niet besproken"}
        </p>
        {!isHandled(meeting, item.id) && (
          <>
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
                  className={styles.agendaChoice}
                  data-choice={value}
                  data-selected={draft.decisions?.[item.id] === value}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        {!isHandled(meeting, item.id) && (
          <p className="mt-3 text-sm text-ink-3">
            {suggestion === "done"
              ? "Voorstel: voltooien, want het punt is besproken"
              : discussed
                ? "Voorstel: verplaatsen, want er is nog niets vastgelegd"
                : "Voorstel: verplaatsen, want het punt kwam niet aan bod"}
          </p>
        )}
        {editing?.id === item.id && <EntryPanel item={item} kind={editing.kind} onClose={() => setEditing(null)} />}
      </article>
    );
  };
  return (
    <MeetingProvider
      value={{ meeting, people, owners: ownerOptions(people, meeting.participants, meeting.name, []), now: 0 }}
    >
      <TooltipProvider>
        <div className="[&_button]:min-h-11 [&_button]:min-w-11 [&_input]:min-h-11 [&_select]:min-h-11">
          <section>
            <h2 className="text-lg font-bold">Open punten ({open.length})</h2>
            {!open.length && <p className="mt-3 text-sm text-ink-2">Alle punten zijn voltooid.</p>}
            <div className="mt-4 flex flex-col gap-4">{open.map(renderItem)}</div>
          </section>
          <details className={`mt-5 rounded-2xl border border-line p-4 sm:p-6 ${styles.completedAgenda}`}>
            <summary className="min-h-11 cursor-pointer font-bold">Voltooide punten ({done.length})</summary>
            {done.map(renderItem)}
          </details>
        </div>
      </TooltipProvider>
    </MeetingProvider>
  );
}

function DecisionsReview({ meeting }: { meeting: Meeting }) {
  const rows = agendaItems(meeting).flatMap((item) =>
    item.entries
      .filter((entry) => entry.kind === "decision")
      .map((entry) => ({
        id: `${item.id}:${entry.id}`,
        text: entry.text,
        topic: item.text,
        ownerId: entry.ownerId,
        date: entry.date,
      })),
  );
  return <ReviewList rows={rows} label="Genomen beslissingen" empty="Geen beslissingen vastgelegd." />;
}
function ActionsReview({ meeting }: { meeting: Meeting }) {
  const items = agendaItems(meeting);
  const rows = meeting.actions.map((action) => ({
    id: action.id,
    text: action.what,
    topic: items.find((item) => item.entries.some((entry) => entry.actionId === action.id))?.text,
    ownerId: action.ownerId,
    date: action.deadline,
  }));
  return <ReviewList rows={rows} label="Nieuwe acties" empty="Geen acties vastgelegd." />;
}
function ReviewList({
  rows,
  label,
  empty,
}: {
  rows: { id: string; text: string; topic?: string; ownerId: string | null; date?: string }[];
  label: string;
  empty: string;
}) {
  const people = usePeople();
  return rows.length ? (
    <ul aria-label={label} className="flex flex-col gap-4">
      {rows.map((row) => {
        const owner = people.find((person) => person.id === row.ownerId);
        return (
          <li key={row.id} className={styles.reviewRow}>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-base font-bold">{row.text}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-3">
                {row.topic && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <ListChecks aria-hidden className="size-4 shrink-0" />
                    <span className="break-words">{row.topic}</span>
                  </span>
                )}
                {row.date && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays aria-hidden className="size-4 shrink-0" />
                    {/^\d{4}-\d{2}-\d{2}$/.test(row.date) ? formatShortDate(row.date) : row.date}
                  </span>
                )}
              </div>
            </div>
            {owner ? <Avatar person={owner} size={36} /> : <span className="text-xs text-ink-3">Geen eigenaar</span>}
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-sm text-ink-3">{empty}</p>
  );
}
