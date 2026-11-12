"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./meeting-wrap-up.module.css";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Scale,
  SquareCheck,
  Timer,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { formatShortDate } from "@/lib/date";
import { formatTime } from "@/lib/time";
import { isDemoEnvironment } from "@/lib/demo-environment";
import { loadPlanningScenario } from "@/lib/prototype/planningScenarios";
import { ensureDirectieExample } from "@/lib/prototype/meetingsOverviewScenarios";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore, usePeople, type Meeting, type WrapUpDraft } from "@/lib/store";
import { agendaItems, clockTime, isHandled, nextInSeries, suggestDecision } from "@/lib/meeting-wrap-up";
import { initialWrapUpDraft, assignMissingOwners, finishWrapUp } from "@/lib/wrap-up-flow";
import { WrapUpPlanning, WrapUpFollowUp } from "./wrap-up-follow-up";
import { EntryPanel } from "./entries";
import { elapsedClock, meetingNow, remainingLabel, timerEnd } from "@/lib/meeting-clock";
import { MeetingProvider, useNow } from "./meeting-context";
import { ownerOptions } from "@/lib/owners";
import { type AgendaItem, type EntryKind } from "@/lib/agenda";

// Keep stored step IDs stable for drafts created with the original three steps.
const allSteps = [
  { id: 0, label: "Agenda" },
  { id: 3, label: "Beslissingen" },
  { id: 4, label: "Acties" },
  { id: 1, label: "Volgende vergadering" },
  { id: 2, label: "Afronden" },
];
export function MeetingWrapUp({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const router = useRouter();
  const draft = initialWrapUpDraft(meeting, ops.meetings);
  const separateFeedback = ops.demo.wrapUpSeparateFeedback ?? false;
  const steps = separateFeedback ? allSteps : allSteps.filter(({ id }) => id !== 1);
  const finalStep = steps.length - 1;
  const step = Math.max(
    0,
    steps.findIndex((s) => s.id === (draft.step === 1 && !separateFeedback ? 2 : (draft.step ?? 0))),
  );
  const [notice, setNotice] = useState("");
  const [validateName, setValidateName] = useState(false);
  const nameError = validateName && !!draft.beforeNextEdit && !draft.nextName?.trim();
  const canContinuePlanning = () => {
    if (!draft.beforeNextEdit || draft.nextName?.trim()) return true;
    setValidateName(true);
    return false;
  };
  const heading = useRef<HTMLHeadingElement>(null);
  const patch = (update: Partial<WrapUpDraft>) => {
    if ("nextName" in update || "beforeNextEdit" in update) setValidateName(false);
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
    if (separateFeedback) return;
    const state = useStore.getState();
    const latest = state.meetings.find((m) => m.id === meeting.id);
    if (latest?.wrapUpDraft?.step === 1) {
      state.putMeeting({ ...latest, wrapUpDraft: { ...latest.wrapUpDraft, step: 2 } });
    }
  }, [meeting.id, separateFeedback, draft.step]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const finish = () => {
    const state = useStore.getState();
    const latest = state.meetings.find((m) => m.id === meeting.id)!;
    if (!canContinuePlanning()) {
      patch({ step: 3 });
      return;
    }
    const next = nextInSeries(latest, state.meetings);
    const nextDate = draft.nextDate || next?.date || "";
    const duration = draft.nextDuration ?? 0;
    const completedDraft = {
      ...draft,
      beforeNextEdit: undefined,
      nextDate,
      noNext: !nextDate,
      nextName: draft.nextName?.trim() || next?.name || latest.name,
      nextTime: nextDate ? draft.nextTime || formatTime(next?.time ?? latest.time ?? 540) : "",
      nextDuration:
        Number.isInteger(duration) && duration >= 5 && duration <= 1440
          ? duration
          : (next?.duration ?? latest.duration),
    };
    useStore.setState({ meetings: finishWrapUp({ ...latest, wrapUpDraft: completedDraft }, state.meetings, "saved") });
    router.push(`/app/overleg/${meeting.id}`);
  };
  const go = (next: number) => {
    if (separateFeedback && step === 3 && next > step) {
      if (!canContinuePlanning()) return;
      patch({ beforeNextEdit: undefined });
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
  const startedAt = meeting.startedAt ?? meeting.run?.startedAt;
  const startTime = startedAt != null ? clockTime(startedAt) : meeting.time != null ? formatTime(meeting.time) : "";
  const endTime = meeting.endedAt != null ? clockTime(meeting.endedAt) : "";
  const timeRange = [startTime, endTime].filter(Boolean).join("–");
  const meetingDate = startedAt != null ? new Date(startedAt) : meeting.date;
  const schedule = [meetingDate && formatShortDate(meetingDate), timeRange].filter(Boolean).join(" · ");

  return (
    <div className={`app-theme ${styles.shell}`}>
      {isDemoEnvironment() && (
        <div
          role="region"
          aria-label="Prototype volgende vergadering"
          className="flex min-h-16 shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap bg-[var(--prototype-bar-bg)] px-6 py-2.5 pr-16 text-[13px] text-white [scrollbar-width:none]"
        >
          <span className="px-1 text-[11px] font-bold text-[var(--prototype-bar-muted)]">PROTOTYPE</span>
          {step === 3 &&
            [
              { scheduled: true, label: "Volgende reeds ingepland" },
              { scheduled: false, label: "Volgende nog niet ingepland" },
            ].map(({ scheduled, label }) => (
              <button
                key={label}
                type="button"
                aria-pressed={!!nextInSeries(meeting, ops.meetings) === scheduled}
                onClick={() => loadPlanningScenario(meeting.id, scheduled)}
                className="min-h-11 shrink-0 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 aria-pressed:ring-2 aria-pressed:ring-white/60"
              >
                {label}
              </button>
            ))}
          {step >= 3 && (
            <button
              type="button"
              aria-pressed={separateFeedback}
              onClick={() => ops.setDemo({ wrapUpSeparateFeedback: !separateFeedback })}
              className="min-h-11 shrink-0 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 aria-pressed:ring-2 aria-pressed:ring-white/60"
            >
              Feedback als aparte stap
            </button>
          )}
        </div>
      )}
      <header className={styles.header}>
        <button type="button" className={styles.headerBack} onClick={leave}>
          <ArrowLeft aria-hidden className="size-4 shrink-0" />
          Terug naar de vergadering
        </button>
        <div className={styles.headerMeeting}>
          <span className={styles.headerTitle}>{meeting.name}</span>
          {schedule && <span className={styles.headerSchedule}>{schedule}</span>}
        </div>
        {draft.entry === "live" && meeting.run && <WrapUpTimer meeting={meeting} startedAt={meeting.run.startedAt} />}
      </header>
      <div className={styles.panel}>
        <main className={styles.scroll}>
          <div className={styles.content}>
            <nav aria-label="Afrondingsstappen" className={styles.steps} data-compact={!separateFeedback}>
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
              <h1
                id={separateFeedback && step === finalStep ? "wrap-up-final" : undefined}
                ref={heading}
                tabIndex={-1}
                className="mb-2 text-3xl font-bold outline-none"
              >
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
                <>
                  {!separateFeedback && (
                    <p className="mb-6 text-ink-2">Nog twee korte dingen voor je de vergadering afsluit.</p>
                  )}
                  <WrapUpPlanning
                    key={nextInSeries(meeting, ops.meetings)?.id ?? "unscheduled"}
                    meeting={meeting}
                    draft={draft}
                    patch={patch}
                    nameError={nameError}
                    compact={!separateFeedback}
                    onGoToFinalStep={separateFeedback ? () => go(finalStep) : undefined}
                  />
                  {!separateFeedback && <WrapUpFollowUp meeting={meeting} draft={draft} patch={patch} compact />}
                </>
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
              <Button variant="link" className={`${styles.previousStep} min-h-11`} onClick={() => go(step - 1)}>
                ← {steps[step - 1].label}
              </Button>
            )}
            <div className={styles.footerActions}>
              <Button variant="link" className="min-h-11" onClick={leave}>
                {draft.entry === "live" && meeting.run ? "Terug naar vergadering" : "Later afronden"}
              </Button>
              {step === finalStep && (
                <Button className="min-h-11" onClick={finish}>
                  ✓ Vergadering afronden
                </Button>
              )}
              {step < finalStep && (
                <Button className="min-h-11" onClick={() => go(step + 1)}>
                  {steps[step + 1].label} →
                </Button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
function WrapUpTimer({ meeting, startedAt }: { meeting: Meeting; startedAt: number }) {
  const end = timerEnd(meeting);
  const now = meetingNow(meeting, useNow(true, end - meetingNow(meeting, 0)));
  const overtime = now >= end;
  const duration = Math.max(1, end - startedAt);
  const elapsed = Math.max(0, now - startedAt);
  return (
    <div
      role="timer"
      aria-label="Lopende vergadertijd"
      className={`order-last ml-auto flex min-h-11 items-center gap-3 rounded-full border border-white/50 px-3 py-2 text-sm ${
        overtime ? "bg-[var(--wrap-amber-bg)] text-[var(--wrap-amber-ink)]" : "bg-white/25"
      }`}
    >
      <span>
        <span className="tabular-nums">{elapsedClock(elapsed)}</span> ·{" "}
        {overtime ? `${Math.floor((now - end) / 60000)} min over gepland einde` : remainingLabel(end - now)}
      </span>
      <progress
        aria-label="Verstreken vergadertijd"
        value={Math.min(elapsed, duration)}
        max={duration}
        className="h-1 w-12 shrink-0 overflow-hidden border-0 bg-white sm:w-24 [&::-moz-progress-bar]:bg-green-600 [&::-webkit-progress-bar]:bg-white [&::-webkit-progress-value]:bg-green-600"
      />
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
      <article key={item.id} aria-label={item.text} className={styles.cardRow}>
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
        <p className="mt-2 text-base font-bold">{item.text}</p>
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
          <section className={styles.agendaCard}>
            <h2 className={styles.cardTitle}>Open punten ({open.length})</h2>
            {!open.length && <p className="mt-3 text-sm text-ink-2">Alle punten zijn voltooid.</p>}
            <div className="mt-4">{open.map(renderItem)}</div>
          </section>
          <details className={`mt-5 rounded-2xl border border-line p-4 sm:p-6 ${styles.completedAgenda}`}>
            <summary className={`min-h-11 cursor-pointer ${styles.cardTitle}`}>
              Voltooide punten ({done.length})
            </summary>
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
  return (
    <section className={`${styles.agendaCard} mt-7`}>
      <h2 className={styles.cardTitle}>{label}</h2>
      {rows.length ? (
        <ul aria-label={label} className={`${styles.reviewList} mt-4`}>
          {rows.map((row) => {
            const owner = people.find((person) => person.id === row.ownerId);
            return (
              <li key={row.id} className={`${styles.reviewRow} ${styles.cardRow}`}>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-bold">{row.text}</p>
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
                {owner ? (
                  <Avatar person={owner} size={36} />
                ) : (
                  <span className="text-xs text-ink-3">Geen eigenaar</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-3">{empty}</p>
      )}
    </section>
  );
}
