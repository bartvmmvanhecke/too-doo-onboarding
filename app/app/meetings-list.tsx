"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle2, ExternalLink, MoreHorizontal, Play, Trash2 } from "lucide-react";
import { useAppUi } from "@/components/app/app-ui";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatShortDate, toISO, today } from "@/lib/date";
import { notAvailable } from "@/lib/not-available";
import { USER_PERSON_ID } from "@/lib/mock-data";
import { usePeople, useStore, type Meeting } from "@/lib/store";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type Status = "pending" | "done" | "planned";

const STATUS: Record<Status, { label: string; className: string }> = {
  pending: { label: "In afwachting", className: "bg-warning-bg text-warning" },
  done: { label: "Afgerond", className: "bg-success-bg text-success-ink" },
  planned: { label: "Ingepland", className: "bg-app text-ink-2" },
};

const ALL = "alle";
const label = "text-[13px] font-bold text-ink-2";
const select =
  "min-h-[50px] w-full min-w-0 cursor-pointer rounded-[10px] border border-line bg-white px-3 text-[15px] text-ink";

function isPast(m: Meeting, todayISO: string) {
  return m.date !== null && m.date < todayISO;
}

function statusOf(m: Meeting, todayISO: string): Status {
  if (!isPast(m, todayISO)) return "planned";
  return m.held ? "done" : "pending";
}

/** "do 22 okt · 10:00 - 11:30" */
function whenLine(m: Meeting) {
  if (!m.date) return "Nog niet ingepland";
  const date = formatShortDate(m.date);
  if (m.time === null) return date;
  return `${date} · ${formatTime(m.time)} - ${formatTime(m.time + m.duration)}`;
}

/** /app met vergaderingen: zoeken en filteren, gegroepeerd in afgelopen en aankomende vergaderingen. */
export function MeetingsList() {
  const router = useRouter();
  const meetings = useStore((s) => s.meetings);
  const createMeeting = useStore((s) => s.createMeeting);
  const people = usePeople();
  const { setAddMeetingsOpen } = useAppUi();
  const [query, setQuery] = useState("");
  const [type, setType] = useState(ALL);
  const [person, setPerson] = useState(ALL);
  const todayISO = toISO(today());

  const types = useMemo(() => [...new Set(meetings.map((m) => m.type))].sort(), [meetings]);
  const participants = useMemo(() => {
    const ids = new Set(meetings.flatMap((m) => m.participants));
    return people.filter((p) => ids.has(p.id));
  }, [meetings, people]);

  const filtered = meetings.filter(
    (m) =>
      m.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (type === ALL || m.type === type) &&
      (person === ALL || m.participants.includes(person)),
  );
  const pending = filtered.filter(m=>m.endedAt && m.followUpStatus === "pending");
  const remaining = filtered.filter(m=>!pending.includes(m));
  const past = remaining.filter((m) => isPast(m, todayISO)).sort((a, b) => b.date!.localeCompare(a.date!));
  const upcoming = remaining
    .filter((m) => !isPast(m, todayISO))
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.time ?? 0) - (b.time ?? 0));

  const meetNow = () => {
    const now = new Date();
    const time = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
    const id = createMeeting(
      { name: "Nieuwe vergadering", recurrence: "once", date: todayISO, time, duration: 30 },
      { type: "Flex vergadering", participants: [USER_PERSON_ID], showWelcome: false },
    );
    router.push(`/app/overleg/${id}`);
  };

  const reset = () => {
    setQuery("");
    setType(ALL);
    setPerson(ALL);
  };

  return (
    <>
      <div data-meetings-overview className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[30px] leading-tight font-bold">Vergaderingen</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-brand-tint bg-brand-soft text-brand hover:bg-brand-tint hover:text-brand"
            onClick={meetNow}
          >
            <Play className="size-4" strokeWidth={1.8} aria-hidden />
            Nu vergaderen
          </Button>
          <Button size="sm" className="rounded-full" onClick={() => setAddMeetingsOpen(true)}>
            <CalendarPlus className="size-4" strokeWidth={1.8} aria-hidden />
            Vergadering plannen
          </Button>
        </div>
      </div>

      <search aria-label="Vergaderingen filteren" className="grid gap-3 rounded-2xl bg-line-soft/70 p-4 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="v-zoeken" className={label}>
            Zoeken
          </label>
          <Input
            id="v-zoeken"
            type="search"
            autoComplete="off"
            placeholder="Vergadertitel"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="v-type" className={label}>
            Vergadertype
          </label>
          <select id="v-type" value={type} onChange={(e) => setType(e.target.value)} className={select}>
            <option value={ALL}>Alle</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="v-deelnemers" className={label}>
            Deelnemers
          </label>
          <select id="v-deelnemers" value={person} onChange={(e) => setPerson(e.target.value)} className={select}>
            <option value={ALL}>Alle</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </search>

      {filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-start gap-2 rounded-[14px] border border-dashed border-line bg-white px-5 py-6">
          <p className="text-[15px] font-semibold">Geen vergaderingen gevonden</p>
          <Button variant="link" className="px-0" onClick={reset}>
            Filters wissen
          </Button>
        </div>
      ) : (
        <>
          <MeetingGroup id="afronden" title="Nog af te ronden" meetings={pending} todayISO={todayISO} />
          <MeetingGroup id="afgelopen" title="Afgelopen vergaderingen" meetings={past} todayISO={todayISO} />
          <MeetingGroup id="aankomend" title="Aankomende" meetings={upcoming} todayISO={todayISO} />
        </>
      )}
    </>
  );
}

function MeetingGroup({
  id,
  title,
  meetings,
  todayISO,
}: {
  id: string;
  title: string;
  meetings: Meeting[];
  todayISO: string;
}) {
  if (meetings.length === 0) return null;
  return (
    <section aria-labelledby={`groep-${id}`} className="mt-4 flex flex-col gap-2.5">
      <h2
        id={`groep-${id}`}
        className="self-start rounded-full bg-line-soft px-3 py-1 text-[13px] font-bold text-ink-2"
      >
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {meetings.map((m) => (
          <MeetingRow key={m.id} meeting={m} status={statusOf(m, todayISO)} />
        ))}
      </ul>
    </section>
  );
}

function MeetingRow({ meeting: m, status }: { meeting: Meeting; status: Status }) {
  const people = usePeople();
  const markHeld = useStore((s) => s.markHeld);
  const [open, setOpen] = useState(false);
  const attendees = m.participants
    .map((pid) => people.find((p) => p.id === pid))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const shown = attendees.slice(0, 4);
  const rest = attendees.length - shown.length;
  const href = `/app/overleg/${m.id}`;

  const menuItem =
    "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-bold text-ink no-underline hover:bg-app hover:text-ink";

  return (
    <li className="flex items-center gap-2 rounded-[14px] border border-line-soft bg-white pr-2 hover:bg-row-hover">
      <Link
        href={href}
        className="flex min-h-14 min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 py-2.5 pl-4 text-ink no-underline hover:text-ink"
      >
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-[17px] font-bold">{m.name}</span>
            {m.endedAt && m.followUpStatus === "pending" && <span className="rounded-full bg-[var(--wrap-amber-bg)] px-2 py-1 text-xs font-bold text-[var(--wrap-amber-ink)]">Nog af te ronden</span>}
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">{m.type}</span>
          </span>
          <span className="text-[13px] text-ink-3">{whenLine(m)}</span>
        </span>
        {shown.length > 0 && (
          <span className="flex items-center">
            <span className="sr-only">Deelnemers: {attendees.map((p) => p.name).join(", ")}</span>
            <span aria-hidden className="flex items-center -space-x-0.5">
              {shown.map((p) => (
                <Avatar key={p.id} person={p} size={26} decorative className="ring-2 ring-white" />
              ))}
            </span>
            {rest > 0 && (
              <span aria-hidden className="ml-1.5 text-xs font-bold text-ink-3">
                +{rest}
              </span>
            )}
          </span>
        )}
        <span className={cn("ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS[status].className)}>
          {STATUS[status].label}
        </span>
      </Link>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Meer acties voor ${m.name}`}>
            <MoreHorizontal className="size-5" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60">
          <div className="flex flex-col gap-0.5">
            <Link href={href} className={menuItem} onClick={() => setOpen(false)}>
              <ExternalLink className="size-4 text-ink-3" aria-hidden />
              Openen
            </Link>
            {status === "pending" && (
              <button
                type="button"
                className={menuItem}
                onClick={() => {
                  markHeld(m.id);
                  setOpen(false);
                }}
              >
                <CheckCircle2 className="size-4 text-ink-3" aria-hidden />
                Markeer als afgerond
              </button>
            )}
            <button
              type="button"
              className={menuItem}
              onClick={() => {
                setOpen(false);
                notAvailable();
              }}
            >
              <Trash2 className="size-4 text-ink-3" aria-hidden />
              Verwijderen
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </li>
  );
}
