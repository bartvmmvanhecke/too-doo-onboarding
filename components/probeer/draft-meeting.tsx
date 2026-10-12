"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CircleCheck, Play, Plus, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { FilePicker, useFileDrop } from "@/components/probeer/entry-blocks";
import { OwnerPicker } from "@/components/probeer/owner-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { participantsText, scheduleText, weekdayName, whenText } from "@/lib/assistant/format";
import type { GuestAction, GuestMeeting } from "@/lib/assistant/types";
import { formatShortDate, parseDateInput, toISO } from "@/lib/date";
import { findDate } from "@/lib/extract";
import { useGuestStore, type GuestAccount } from "@/lib/guest-store";
import { DURATION_PRESETS, RECURRENCE_OPTIONS, type Recurrence } from "@/lib/meeting";
import { formatTime, parseTime } from "@/lib/time";
import { cn, lowerFirst } from "@/lib/utils";

const DAY_OPTIONS = [
  { value: 1, label: "Maandag" },
  { value: 2, label: "Dinsdag" },
  { value: 3, label: "Woensdag" },
  { value: 4, label: "Donderdag" },
  { value: 5, label: "Vrijdag" },
];

const select =
  "min-h-11 min-w-0 cursor-pointer rounded-[10px] border border-line bg-white px-2.5 text-[15px] text-ink outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)]";

/** Velden die net ingevuld werden, krijgen 2 s een blauwe markering (C2). */
function flashClass(on: boolean) {
  return on ? "ring-2 ring-brand ring-offset-2 transition-shadow" : "transition-shadow";
}

/** Een veld bovenaan (Naam, Wanneer, Wie zit erbij): gestippeld als het leeg is, blauw als voorstel. */
function FieldCard({
  label,
  empty,
  proposed,
  flash,
  editing,
  onEdit,
  value,
  sub,
  children,
}: {
  label: string;
  empty: string;
  proposed: boolean;
  flash: boolean;
  editing: boolean;
  onEdit: () => void;
  value: ReactNode | null;
  sub?: string | null;
  children: ReactNode;
}) {
  const filled = value !== null;
  const tone = !filled
    ? "border-[1.5px] border-dashed border-line"
    : proposed
      ? "border-2 border-proposal-line bg-brand-selected"
      : "border border-line-soft";
  if (editing) {
    return (
      <div
        role="group"
        aria-label={label}
        className={cn("flex flex-col gap-2 rounded-xl border-2 border-brand bg-white p-3", flashClass(flash))}
      >
        <span className="text-[13px] font-bold text-ink-2">{label}</span>
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${label}: ${filled ? (typeof value === "string" ? value : "ingevuld") : "leeg"}. Aanpassen`}
      className={cn(
        "flex min-h-[78px] cursor-text flex-col gap-1 rounded-xl p-3.5 text-left hover:border-brand",
        tone,
        flashClass(flash),
      )}
    >
      <span className={cn("text-[13px] font-bold", filled ? "text-ink-2" : "text-ink-3")}>{label}</span>
      {filled ? (
        <span className="text-base font-extrabold">{value}</span>
      ) : (
        <span className="text-base font-bold text-ink-3">{empty}</span>
      )}
      {sub && <span className="text-[13px] text-ink-2">{sub}</span>}
    </button>
  );
}

function NameEditor({ meeting, autoFocus, onDone }: { meeting: GuestMeeting; autoFocus: boolean; onDone: () => void }) {
  const updateMeeting = useGuestStore((s) => s.updateMeeting);
  return (
    <Input
      autoFocus={autoFocus}
      aria-label="Naam van het overleg"
      placeholder="Bv. Productieoverleg"
      value={meeting.name ?? ""}
      onChange={(e) => updateMeeting({ name: e.target.value || null })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") onDone();
      }}
      className="min-h-11"
    />
  );
}

function WhenEditor({ meeting }: { meeting: GuestMeeting }) {
  const updateMeeting = useGuestStore((s) => s.updateMeeting);
  const [time, setTime] = useState(meeting.time !== null ? formatTime(meeting.time) : "");
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label="Dag"
        value={meeting.weekday ?? ""}
        onChange={(e) => updateMeeting({ weekday: e.target.value ? Number(e.target.value) : null })}
        className={select}
      >
        <option value="">Dag</option>
        {DAY_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      <Input
        aria-label="Uur"
        placeholder="Uur, bv. 8u"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        onBlur={() => {
          const t = parseTime(time);
          updateMeeting({ time: t });
          setTime(t !== null ? formatTime(t) : "");
        }}
        className="min-h-11"
      />
      <select
        aria-label="Hoe vaak"
        value={meeting.recurrence ?? ""}
        onChange={(e) => updateMeeting({ recurrence: (e.target.value || null) as Recurrence | null })}
        className={select}
      >
        <option value="">Hoe vaak</option>
        {RECURRENCE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Duur"
        value={meeting.duration}
        onChange={(e) => updateMeeting({ duration: Number(e.target.value), durationProposed: false })}
        className={select}
      >
        {DURATION_PRESETS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ParticipantsEditor({ meeting }: { meeting: GuestMeeting }) {
  const { addParticipant, removeParticipant } = useGuestStore.getState();
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5">
        {meeting.participants.map((p) => (
          <li key={p.id} className="flex items-center gap-1 rounded-full bg-app py-0.5 pr-0.5 pl-2.5 text-sm font-bold">
            {p.name}
            <button
              type="button"
              aria-label={`${p.name} verwijderen`}
              onClick={() => removeParticipant(p.id)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-line-soft"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          for (const n of name.split(/,|\ben\b/)) if (n.trim()) addParticipant(n.trim());
          setName("");
        }}
      >
        <Input
          aria-label="Deelnemer toevoegen"
          placeholder="Voornaam + Enter"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11"
        />
      </form>
    </div>
  );
}

/** Tekst die je aanklikt om te bewerken (Enter of wegklikken bewaart, Esc annuleert). */
function InlineEdit({
  value,
  label,
  onSave,
  className,
}: {
  value: string;
  label: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <Input
        autoFocus
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) onSave(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="min-h-10 flex-1 py-1.5 text-[15px]"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      aria-label={`${label}: ${value}`}
      className={cn(
        "min-h-10 min-w-0 flex-1 cursor-text rounded-md px-1 text-left text-[15px] font-bold hover:bg-app",
        className,
      )}
    >
      {value}
    </button>
  );
}

function DeadlineEdit({ action }: { action: GuestAction }) {
  const updateAction = useGuestStore((s) => s.updateAction);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const label = action.deadline ? formatShortDate(action.deadline) : "geen datum";
  if (editing) {
    return (
      <Input
        autoFocus
        aria-label={`Datum van ${action.text}`}
        placeholder="bv. vrijdag of 16/10"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const d = draft.trim()
            ? (findDate(draft)?.date ?? (parseDateInput(draft) ? toISO(parseDateInput(draft)!) : null))
            : null;
          if (!draft.trim() || d) updateAction(action.id, { deadline: d });
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className="min-h-10 w-36 py-1.5 text-sm"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(action.deadline ? formatShortDate(action.deadline) : "");
        setEditing(true);
      }}
      aria-label={`Datum van ${action.text}: ${label}. Wijzigen`}
      className={cn(
        "min-h-11 shrink-0 cursor-pointer rounded-md px-2 text-[13px] font-bold whitespace-nowrap hover:bg-app",
        action.deadline ? "text-ink-2" : "text-ink-3",
      )}
    >
      {label}
    </button>
  );
}

function ActionsBlock({
  ready,
  flash,
  adding,
  onAddingDone,
  onNotesFile,
  busy,
}: {
  ready: boolean;
  flash: boolean;
  adding: boolean;
  onAddingDone: () => void;
  /** Notities slepen op dit blok (of een bestand kiezen) werkt zoals in de assistent. */
  onNotesFile: (file: File) => void;
  busy: boolean;
}) {
  const actions = useGuestStore((s) => s.actions);
  const people = useGuestStore((s) => s.meeting.participants);
  const { updateAction, addAction } = useGuestStore.getState();
  const [text, setText] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);
  const drop = useFileDrop(onNotesFile, !ready && !busy);

  if (actions.length === 0 && !adding) {
    return (
      <section
        aria-label="Openstaande acties"
        data-dropzone="openstaande-acties"
        {...drop.handlers}
        className={cn(
          "flex flex-col gap-1.5 rounded-xl border-[1.5px] border-dashed p-4",
          drop.over ? "border-brand bg-brand-selected" : "border-line",
        )}
      >
        <h2 className="text-[15px] font-extrabold text-ink-2">Openstaande acties</h2>
        <p className="text-sm text-ink-3">
          Wat vorige keer afgesproken werd en nog niet af is. Komt elk overleg vanzelf terug tot het af is.
        </p>
        {!ready && (
          <p className="flex flex-wrap items-center text-sm text-ink-3">
            Sleep notities van je vorig overleg op deze plek, of
            <FilePicker variant="link" onFile={onNotesFile} disabled={busy} className="min-h-0 pr-0 pl-1 text-sm">
              kies een bestand
            </FilePicker>
            .
          </p>
        )}
      </section>
    );
  }
  const n = actions.filter((a) => a.confirmed).length;
  return (
    <section
      aria-label="Openstaande acties"
      className={cn(
        "flex flex-col gap-1 rounded-xl bg-white p-4",
        ready ? "border border-line-soft" : "border-2 border-proposal-line",
        flashClass(flash),
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-1">
        <h2 className="text-[15px] font-extrabold">Openstaande acties</h2>
        <span className={cn("text-xs font-extrabold", ready ? "text-ink-3" : "text-brand")}>
          {ready
            ? "komen vanzelf terug tot ze af zijn"
            : `${n} ${n === 1 ? "voorstel" : "voorstellen"} · vink aan wat klopt`}
        </span>
      </div>
      <ul className="flex flex-col">
        {actions.map((a) => {
          const missing = !a.ownerId && !a.ownerLater && a.confirmed && !ready;
          return (
            <li
              key={a.id}
              className={cn(
                "flex min-h-12 flex-wrap items-center gap-2 border-t border-line-faint px-1 first:border-t-0",
                missing && "rounded-lg border-t-0 bg-warning-bg",
              )}
            >
              {ready ? (
                <span aria-hidden className="size-4 shrink-0 rounded-[4px] border-2 border-checkbox" />
              ) : (
                <input
                  type="checkbox"
                  checked={a.confirmed}
                  onChange={(e) => updateAction(a.id, { confirmed: e.target.checked })}
                  aria-label={`${a.text} bevestigen`}
                  className="m-0 size-[18px] shrink-0 cursor-pointer accent-brand"
                />
              )}
              <InlineEdit
                value={a.text}
                label="Actie"
                onSave={(v) => updateAction(a.id, { text: v })}
                className={cn(!a.confirmed && "text-ink-3 line-through")}
              />
              <OwnerPicker action={a} people={people} />
              <DeadlineEdit action={a} />
            </li>
          );
        })}
      </ul>
      {(!ready || adding) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) addAction(text.trim());
            setText("");
          }}
        >
          <Input
            ref={addRef}
            aria-label="Actie toevoegen"
            placeholder="+ Nog een actie"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => !text && onAddingDone()}
            className="mt-1 min-h-11 border-dashed text-[15px]"
          />
        </form>
      )}
    </section>
  );
}

function TopicsBlock({ meeting, flash }: { meeting: GuestMeeting; flash: boolean }) {
  const decisions = useGuestStore((s) => s.decisions);
  const { updateTopic, removeTopic, addTopic, updateDecision } = useGuestStore.getState();
  const [text, setText] = useState("");
  const visibleDecisions = decisions.filter((d) => d.confirmed);
  const empty = meeting.topics.length === 0 && visibleDecisions.length === 0;
  const proposal = meeting.proposed && meeting.topics.length > 0;

  return (
    <section
      aria-label="Lopende zaken"
      className={cn(
        "flex flex-col gap-1 rounded-xl p-4",
        empty
          ? "border-[1.5px] border-dashed border-line"
          : proposal
            ? "border-2 border-proposal-line bg-brand-selected"
            : "border border-line-soft bg-white",
        flashClass(flash),
      )}
    >
      <h2 className={cn("text-[15px] font-extrabold", empty && "text-ink-2")}>Lopende zaken</h2>
      {proposal && meeting.source && (
        <p className="text-[13px] text-ink-3">
          Uit de uitnodiging in {meeting.source === "outlook" ? "Outlook" : "Google"}
        </p>
      )}
      {!empty && (
        <ol className="flex flex-col">
          {meeting.topics.map((t, i) => (
            <li
              key={t.id}
              className="group flex min-h-11 items-center gap-3 border-t border-line-faint first:border-t-0"
            >
              <span aria-hidden className="w-6 text-sm font-extrabold text-brand">
                {String(i + 1).padStart(2, "0")}
              </span>
              <InlineEdit value={t.text} label="Agendapunt" onSave={(v) => updateTopic(t.id, v)} />
              {proposal && <span className="text-xs font-extrabold text-brand">voorstel</span>}
              <button
                type="button"
                aria-label={`${t.text} verwijderen`}
                onClick={() => removeTopic(t.id)}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-3 hover:bg-app hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
          {visibleDecisions.map((d) => (
            <li key={d.id} className="flex min-h-11 items-center gap-3 border-t border-line-faint first:border-t-0">
              <span aria-hidden className="w-6" />
              <InlineEdit value={d.text} label="Beslissing" onSave={(v) => updateDecision(d.id, { text: v })} />
              <span className="rounded-md bg-purpose-decide-bg px-2 py-0.5 text-xs font-extrabold text-purpose-decide">
                beslissing nodig
              </span>
            </li>
          ))}
        </ol>
      )}
      {!meeting.proposed && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) addTopic(text.trim());
            setText("");
          }}
        >
          <Input
            aria-label="Agendapunt toevoegen"
            placeholder="+ Typ een agendapunt en druk Enter"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 min-h-11 border-dashed text-[15px]"
          />
        </form>
      )}
    </section>
  );
}

type Field = "name" | "when" | "participants";

/**
 * Hoofdvlak van de proefomgeving (C1–C4): het echte overleg in opbouw. Lege velden gestippeld,
 * voorstellen met blauwe rand; alles is rechtstreeks aanpasbaar.
 */
export function DraftMeeting({
  flash,
  editRequest,
  onSave,
  onExample,
  onEditDone,
  account,
  busy,
  onNotesFile,
}: {
  flash: Set<string>;
  /** Na "Uit mijn agenda": verbonden, het werk wordt automatisch bewaard. */
  account: GuestAccount | null;
  busy: boolean;
  onNotesFile: (file: File) => void;
  /** Telt op bij "Iets aanpassen" of "Vul het zelf in": zet de velden in bewerkmodus. */
  editRequest: number;
  onSave: (intent: "login" | "start") => void;
  onExample: () => void;
  /** "Klaar met aanpassen": de assistent gaat verder met wat nog ontbreekt. */
  onEditDone: () => void;
}) {
  const meeting = useGuestStore((s) => s.meeting);
  const step = useGuestStore((s) => s.step);
  const actionCount = useGuestStore((s) => s.actions.length);
  const others = useGuestStore((s) => s.others);
  const [editing, setEditing] = useState<Set<Field>>(new Set());
  const [focusName, setFocusName] = useState(false);
  const [adding, setAdding] = useState(false);
  const [lastRequest, setLastRequest] = useState(editRequest);
  if (editRequest !== lastRequest) {
    setLastRequest(editRequest);
    setEditing(new Set<Field>(["name", "when", "participants"]));
    setFocusName(true);
  }

  const ready = step === 3 || step === "done";
  const showFields = meeting.proposed;
  const edit = (f: Field) => setEditing((s) => new Set(s).add(f));
  const stopEdit = (f: Field) =>
    setEditing((s) => {
      const next = new Set(s);
      next.delete(f);
      return next;
    });
  const when = whenText(meeting);
  const day = weekdayName(meeting);

  return (
    <div className="flex flex-col gap-[18px]">
      {account ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-[10px] bg-success-bg px-4 py-2.5 text-sm font-semibold text-success-ink"
        >
          <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
          <span>
            Verbonden met {account.provider === "outlook" ? "Outlook" : "Google"} als {account.email}. Je werk wordt
            vanaf nu automatisch bewaard.
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[10px] bg-trial-bar px-4 py-2.5 text-sm text-ink-2">
          <span className="flex-[1_1_300px]">
            Proefomgeving: geen account nodig. Je werk blijft 7 dagen op dit toestel staan; bewaren kan op elk moment.
          </span>
          <button
            type="button"
            onClick={() => onSave("login")}
            className="min-h-11 cursor-pointer font-bold text-brand underline-offset-4 hover:text-brand-hover hover:underline"
          >
            Ik heb al een account
          </button>
        </div>
      )}

      {ready && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-bold text-success-ink"
        >
          <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
          <span>
            Je {lowerFirst(meeting.name ?? "overleg")}
            {day ? ` van ${day}` : ""} staat klaar.{" "}
            {actionCount > 0 &&
              `${actionCount} ${actionCount === 1 ? "actie komt" : "acties komen"} vanzelf aan bod tot ze af zijn.`}
          </span>
        </div>
      )}

      {others.length > 0 && (
        <p className="text-sm text-ink-2">Ook klaar: {others.map((o) => o.meeting.name).join(", ")}</p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] leading-tight font-extrabold">{meeting.name || "Je eerste overleg"}</h1>
            {!ready && (
              <span className="rounded-md bg-line-soft px-2 py-1 text-xs font-extrabold tracking-[0.4px] text-ink-2 uppercase">
                Concept
              </span>
            )}
            {!ready && meeting.source && (
              <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-extrabold text-brand">
                uit {meeting.source === "outlook" ? "Outlook" : "Google"}
              </span>
            )}
          </div>
          {!showFields && <p className="text-[15px] text-ink-2">{scheduleText(meeting)}</p>}
        </div>
        {ready && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Actie
            </Button>
            <Button size="sm" onClick={() => onSave("start")}>
              <Play className="size-4 fill-white" aria-hidden />
              Start overleg
            </Button>
          </div>
        )}
      </div>

      {showFields && (
        <section
          aria-label="Overleg in opbouw"
          className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 rounded-2xl border border-line-soft bg-white p-5"
        >
          <FieldCard
            label="Naam"
            empty="Welk overleg?"
            value={meeting.name}
            proposed={meeting.proposed}
            flash={flash.has("name")}
            editing={editing.has("name")}
            onEdit={() => {
              setFocusName(true);
              edit("name");
            }}
          >
            <NameEditor meeting={meeting} autoFocus={focusName} onDone={() => stopEdit("name")} />
          </FieldCard>
          <FieldCard
            label="Wanneer"
            empty="Dag, uur, hoe vaak"
            value={when}
            sub={when && meeting.durationProposed && meeting.time !== null ? "duur 1 uur: voorstel" : null}
            proposed={meeting.proposed}
            flash={flash.has("when")}
            editing={editing.has("when")}
            onEdit={() => edit("when")}
          >
            <WhenEditor meeting={meeting} />
          </FieldCard>
          <FieldCard
            label="Wie zit erbij"
            empty="Deelnemers"
            value={
              meeting.participants.length ? (
                <span className="flex flex-wrap items-center gap-1" aria-label={participantsText(meeting.participants)}>
                  {meeting.participants.map((p) => (
                    <Avatar key={p.id} person={p} size={28} />
                  ))}
                  <span className="pl-1 text-[13px] font-bold text-ink-2">+ jij</span>
                </span>
              ) : null
            }
            proposed={meeting.proposed}
            flash={flash.has("participants")}
            editing={editing.has("participants")}
            onEdit={() => edit("participants")}
          >
            <ParticipantsEditor meeting={meeting} />
          </FieldCard>
          {editing.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="col-span-full justify-self-start"
              onClick={() => {
                setEditing(new Set());
                onEditDone();
              }}
            >
              Klaar met aanpassen
            </Button>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2.5">
        {showFields && <h2 className="text-[15px] font-extrabold">Agenda</h2>}
        <ActionsBlock
          ready={ready}
          flash={flash.has("actions")}
          adding={adding}
          onAddingDone={() => setAdding(false)}
          onNotesFile={onNotesFile}
          busy={busy}
        />
        <TopicsBlock meeting={meeting} flash={flash.has("topics")} />
        <section
          aria-label="Varia"
          className="rounded-xl border border-line-soft bg-white p-4 text-[15px] font-extrabold"
        >
          Varia
        </section>
      </div>

      {step === 1 && (
        <p className="text-sm text-ink-3">
          Alles hier is meteen aanpasbaar. Liever zonder assistent?{" "}
          <button
            type="button"
            onClick={() => {
              setFocusName(true);
              setEditing(new Set<Field>(["name", "when", "participants"]));
            }}
            className="min-h-11 cursor-pointer font-bold text-brand hover:text-brand-hover hover:underline"
          >
            Vul het zelf in
          </button>{" "}
          of{" "}
          <Link href="/voorbeeld?van=probeer" onClick={onExample} className="font-bold">
            bekijk eerst een voorbeeld
          </Link>
          .
        </p>
      )}
    </div>
  );
}
