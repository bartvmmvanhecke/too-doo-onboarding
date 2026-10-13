"use client";
import { ReviewHint } from "@/components/probeer/suggestion-review";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, Check, ChevronLeft, CircleDashed, Clock, Play, Plus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { icon, InlineText, ProgressBar, STROKE } from "@/components/meeting/bits";
import { useMeeting, useMeetingOps, type TrialView } from "@/components/meeting/meeting-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatClock, plannedMinutes } from "@/lib/agenda";
import { scheduleLine } from "@/lib/meeting";
import { USER_PERSON_ID, type Person } from "@/lib/mock-data";
import { findPerson, type Meeting } from "@/lib/store";
import { cn } from "@/lib/utils";

const metaButton =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium text-ink-3 hover:bg-white hover:text-ink";

/** Max. 3 avatars en +N; klikken toont de deelnemers (Variant A: de deelnemers aanpassen). */
function Participants({
  people,
  editor,
  className,
}: {
  people: Person[];
  /** Variant A: inhoud van de popover om deelnemers aan te passen. */
  editor?: ReactNode;
  className?: string;
}) {
  const rest = people.length - 3;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            editor
              ? `Deelnemers: ${people.map((p) => p.name).join(", ")}. Aanpassen`
              : `${people.length} deelnemers tonen`
          }
          className={cn(metaButton, className)}
        >
          <span className="flex items-center">
            {people.slice(0, 3).map((p) => (
              <Avatar key={p.id} person={p} size={24} decorative className="-ml-1.5 ring-2 ring-app first:ml-0" />
            ))}
          </span>
          {rest > 0 && <span>+{rest}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-64">
        <p className="px-2 pt-1 pb-1.5 text-xs font-semibold text-ink-3">Deelnemers</p>
        {editor ?? (
          <ul className="flex flex-col">
            {people.map((p) => (
              <li key={p.id} className="flex min-h-10 items-center gap-2.5 px-2 text-sm">
                <Avatar person={p} size={24} decorative />
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

const DETAIL_FIELDS: { key: "location" | "type" | "room" | "description"; label: string }[] = [
  { key: "location", label: "Vestiging" },
  { key: "type", label: "Type" },
  { key: "room", label: "Lokaal" },
  { key: "description", label: "Beschrijving" },
];

function Details({ meeting }: { meeting: Meeting }) {
  const { updateDetails } = useMeetingOps();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={metaButton}>
          Details
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme flex w-80 flex-col gap-2.5 p-3">
        {DETAIL_FIELDS.map(({ key, label }) => {
          const id = `detail-${key}`;
          const props = {
            id,
            defaultValue: meeting[key] ?? "",
            onBlur: (e: { currentTarget: { value: string } }) =>
              updateDetails(meeting.id, { [key]: e.currentTarget.value.trim() }),
            className: "w-full rounded-[10px] border border-line bg-white px-3 text-sm text-ink",
          };
          return (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-xs font-semibold text-ink-3">
                {label}
              </label>
              {key === "description" ? (
                <textarea {...props} rows={3} className={cn(props.className, "py-2.5")} />
              ) : (
                <input type="text" {...props} className={cn(props.className, "min-h-11")} />
              )}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

/** Verschijnt pas als er tijden zijn; bij overschrijding één amber pill. */
function TimeIndicator({ meeting }: { meeting: Meeting }) {
  const planned = plannedMinutes(meeting.blocks);
  if (planned === null) return null;
  const over = planned > meeting.duration;
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium tabular-nums",
        over ? "bg-warning-bg text-warning" : "text-ink-3",
      )}
      title={over ? "Er staat meer op de agenda dan de vergadering duurt" : "Geplande tijd"}
    >
      <Clock className={icon} strokeWidth={STROKE} aria-hidden />
      <span className="sr-only">{over ? "Te veel gepland: " : "Gepland: "}</span>
      {planned} / {meeting.duration} min
    </span>
  );
}

export function MeetingHeader({
  hint,
  onShowHint,
  onAddAction,
  onInvite,
}: {
  /** Bv. "1 agendapunt heeft nog geen eigenaar"; leeg = geen hint. */
  hint: string | null;
  onShowHint: () => void;
  onAddAction: () => void;
  onInvite: () => void;
}) {
  const { meeting, people, now, trial } = useMeeting();
  const { startRun, nextStep, endRun } = useMeetingOps();
  const run = meeting.run;
  const participants = meeting.participants.map((id) => findPerson(people, id)).filter((p): p is Person => !!p);
  const others = participants.filter((p) => p.id !== USER_PERSON_ID);

  const back = (
    <Link
      href="/app"
      className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-[10px] px-2 text-[13px] font-medium text-ink-3 no-underline hover:text-ink"
    >
      <ChevronLeft className={icon} strokeWidth={STROKE} aria-hidden />
      Vergaderingen
    </Link>
  );

  if (run) {
    const elapsed = (now - run.startedAt) / 1000;
    const total = meeting.duration * 60;
    const left = Math.round((total - elapsed) / 60);
    return (
      <header className="flex flex-col gap-1 pb-2">
        {back}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success">
              <span aria-hidden className="size-1.5 rounded-full bg-success" />
              Bezig
            </span>
            <h1 className="text-[30px] leading-tight font-bold">{meeting.name}</h1>
            <p className="text-[13px] text-ink-3 tabular-nums" aria-live="off">
              {formatClock(elapsed)} verstreken ·{" "}
              {left >= 0 ? `${left} min resterend` : <span className="text-warning">{-left} min over tijd</span>}
            </p>
            <ProgressBar value={elapsed / total} over={elapsed > total} label="Verstreken tijd" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-semibold"
              disabled={!run.currentId}
              onClick={() => nextStep(meeting.id, "done")}
            >
              Volgend punt
            </Button>
            <Button variant="dark" size="sm" className="font-semibold" onClick={() => endRun(meeting.id)}>
              Beëindigen
            </Button>
          </div>
        </div>
      </header>
    );
  }

  if (trial) return <TrialHeader trial={trial} participants={participants} />;

  return (
    <header className="flex flex-col gap-1 pb-2">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="min-w-0 text-[30px] leading-tight font-bold">{meeting.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <TimeIndicator meeting={meeting} />
          <Button variant="outline" size="sm" className="font-semibold" onClick={onAddAction}>
            <Plus className={icon} strokeWidth={STROKE} aria-hidden />
            Actie
          </Button>
          <Button size="sm" className="font-semibold" data-tour="start" onClick={() => startRun(meeting.id)}>
            <Play className={icon} strokeWidth={STROKE} aria-hidden />
            Start vergadering
          </Button>
        </div>
      </div>
      <div className="-ml-2 flex flex-wrap items-center gap-x-1 text-[13px] text-ink-3">
        <span className="px-2">{scheduleLine(meeting)}</span>
        {others.length > 0 ? (
          <Participants people={participants} />
        ) : (
          <button type="button" onClick={onInvite} className={metaButton}>
            <UserPlus className={icon} strokeWidth={STROKE} aria-hidden />
            Collega&apos;s uitnodigen
          </button>
        )}
        <Details meeting={meeting} />
      </div>
      {hint && (
        <p className="flex flex-wrap items-center gap-x-1 text-[13px] text-warning">
          {hint}
          <Button
            variant="link"
            size="sm"
            className="min-h-11 px-1.5 text-[13px] font-semibold text-warning hover:text-warning"
            onClick={onShowHint}
          >
            Toon
          </Button>
        </p>
      )}
    </header>
  );
}

/**
 * "Start overleg" in de proefomgeving: grijs en uitgeschakeld tot er minstens één agendapunt is, met een
 * tooltip. De knop zit in een span, zodat de tooltip ook bij een uitgeschakelde knop werkt.
 */
function StartButton({ enabled, onStart }: { enabled: boolean; onStart: () => void }) {
  const button = (
    <Button
      size="sm"
      className="font-semibold disabled:bg-line-soft disabled:text-ink-3 disabled:opacity-100"
      disabled={!enabled}
      onClick={onStart}
    >
      <Play className={icon} strokeWidth={STROKE} aria-hidden />
      Start vergadering
    </Button>
  );
  if (enabled) return <span className="self-start">{button}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-describedby="start-overleg-uitleg" className="self-start rounded-[10px]">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent id="start-overleg-uitleg">Voeg eerst een agendapunt toe</TooltipContent>
    </Tooltip>
  );
}

/** Subtiele link in de datumregel die het agendapad start, enkel voor dat veld (Variant A, C1). */
function FromCalendar({ trial, field, label }: { trial: TrialView; field: "when" | "participants"; label: string }) {
  const onFromCalendar = trial.onFromCalendar;
  if (!onFromCalendar) return null;
  return (
    <Button
      variant="link"
      size="sm"
      onClick={() => onFromCalendar(field)}
      className="min-h-11 gap-1 px-1.5 text-[13px] font-bold"
    >
      <CalendarDays className="size-[13px]" strokeWidth={2.2} aria-hidden />
      {label}
    </Button>
  );
}

/** Wat de assistent net invulde, licht 2 s op (Variant A). */
const flashed = "rounded-lg bg-brand-selected shadow-[0_0_0_2px_var(--proposal-line)]";

/**
 * Variant A (SPEC-LAZY.md §3): dezelfde kop, met statuslabel; titel, datumregel en avatars zijn
 * rechtstreeks aanpasbaar. Geen terugknop, tijdsbudget of details zolang er geen inhoud is.
 */
function TrialHeader({ trial, participants }: { trial: TrialView; participants: Person[] }) {
  const { meeting } = useMeeting();
  const { startRun } = useMeetingOps();
  const [renaming, setRenaming] = useState(false);
  const [lastRequest, setLastRequest] = useState(trial.editRequest);
  if (trial.editRequest !== lastRequest) {
    setLastRequest(trial.editRequest);
    setRenaming(true);
  }
  const muted = "text-ink-subtle";
  // Kleine tekst: gedempt, maar met voldoende contrast (WCAG AA).
  const mutedSmall = "text-ink-3";
  return (
    <header className="flex flex-col gap-2 pb-2">
      {/* Statuslabel boven de rij; de rij is titel+datumregel | knop, bovenaan uitgelijnd (SPEC-LAZY.md §3). */}
      <span className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-line-faint px-2.5 py-1 text-[13px] font-semibold text-ink-2">
          <CircleDashed className={icon} strokeWidth={STROKE} aria-hidden />
          {trial.status}
        </span>
        {trial.source && (
          <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand">
            {trial.source}
          </span>
        )}
      </span>
      <div className="flex flex-col gap-3 min-[720px]:flex-row min-[720px]:items-start min-[720px]:justify-between min-[720px]:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <motion.div layoutId={trial.titleLayoutId} className="flex min-w-0 flex-wrap items-center gap-3">
            <h1
              className={cn(
                "-ml-1 flex min-w-0 text-[30px] leading-tight font-bold transition-shadow",
                trial.empty && muted,
                trial.flash.has("name") && flashed,
              )}
            >
              <InlineText
                value={meeting.name}
                label="Naam van de vergadering aanpassen"
                editing={renaming || undefined}
                onEditingChange={setRenaming}
                onSave={trial.onRename}
                inputClassName="text-[26px] font-bold"
              />
            </h1>
            {trial.done && (
              <motion.span
                role="status"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.12, 1], opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
                className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-sm font-extrabold text-success-ink"
              >
                <Check className="size-4" strokeWidth={3} aria-hidden />
                Klaar
              </motion.span>
            )}
          </motion.div>
          <div className="-ml-2 flex flex-wrap items-center gap-x-1 text-[13px] text-ink-3">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Wanneer: ${trial.scheduleText ?? "nog niet ingevuld"}. Aanpassen`}
                  className={cn(
                    metaButton,
                    "transition-shadow",
                    !trial.scheduleText && mutedSmall,
                    trial.flash.has("when") && flashed,
                  )}
                >
                  {trial.scheduleText ?? "Wanneer?"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="app-theme w-80 p-3">
                {trial.scheduleEditor}
              </PopoverContent>
            </Popover>
            {!trial.scheduleText && <FromCalendar trial={trial} field="when" label="Uit agenda halen" />}
            <span aria-hidden className={muted}>
              ·
            </span>
            {participants.length > 0 ? (
              <Participants
                people={participants}
                editor={trial.participantsEditor}
                className={cn("transition-shadow", trial.flash.has("participants") && flashed)}
              />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Wie zit erbij? Aanpassen" className={cn(metaButton, mutedSmall)}>
                    Wie zit erbij?
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="app-theme w-64">
                  <p className="px-2 pt-1 pb-1.5 text-xs font-semibold text-ink-3">Deelnemers</p>
                  {trial.participantsEditor}
                </PopoverContent>
              </Popover>
            )}
            {participants.length === 0 && (
              <FromCalendar trial={trial} field="participants" label="Deelnemers uit agenda" />
            )}
            {!!trial.totalMinutes && (
              <>
                <span aria-hidden className={muted}>
                  ·
                </span>
                <span
                  key={trial.totalMinutes}
                  aria-label={`Totaal ${trial.totalMinutes} minuten`}
                  className="goal-flash rounded-lg px-1.5 py-0.5 tabular-nums"
                >
                  {trial.totalMinutes} min
                </span>
              </>
            )}
          </div>
          {!!trial.goals?.length && (
            // Gekozen doelen (C0j–C0m): één pill per doel.
            <ul aria-label="Doelen van dit overleg" className="flex flex-wrap gap-1.5">
              {trial.goals.map((goal) => (
                <li
                  key={goal}
                  className="goal-flash rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand"
                >
                  Doel: {goal}
                </li>
              ))}
            </ul>
          )}
        </div>
        <StartButton enabled={trial.canStart} onStart={() => startRun(meeting.id)} />
      </div>
      <ReviewHint />
    </header>
  );
}
