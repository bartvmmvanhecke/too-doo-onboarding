"use client";

import Link from "next/link";
import { ChevronLeft, Clock, Play, Plus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { icon, ProgressBar, STROKE } from "@/components/meeting/bits";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatClock, plannedMinutes } from "@/lib/agenda";
import { scheduleLine } from "@/lib/meeting";
import { USER_PERSON_ID, type Person } from "@/lib/mock-data";
import { findPerson, useStore, type Meeting } from "@/lib/store";
import { cn } from "@/lib/utils";

const metaButton =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium text-ink-3 hover:bg-white hover:text-ink";

/** Max. 3 avatars en +N; klikken toont de deelnemers. */
function Participants({ people }: { people: Person[] }) {
  const rest = people.length - 3;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${people.length} deelnemers tonen`} className={metaButton}>
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
        <ul className="flex flex-col">
          {people.map((p) => (
            <li key={p.id} className="flex min-h-10 items-center gap-2.5 px-2 text-sm">
              <Avatar person={p} size={24} decorative />
              {p.name}
            </li>
          ))}
        </ul>
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
  const updateDetails = useStore((s) => s.updateDetails);
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
  const { meeting, people, now } = useMeeting();
  const { startRun, nextStep, endRun } = useStore.getState();
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
