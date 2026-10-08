"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { nlBE } from "react-day-picker/locale";
import { CalendarDays, Check, ChevronDown, Clock, GripVertical, Minus, Plus, Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { OwnerPicker } from "@/components/b/owner-picker";
import { formatPicked } from "@/components/date-picker";
import { useMeeting } from "@/components/meeting/meeting-context";
import { matchesPerson } from "@/components/onboarding/owner-combobox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PURPOSE_CLASS, PURPOSES, type Purpose } from "@/lib/agenda";
import { parseDateInput } from "@/lib/date";
import { findPerson } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Lucide-iconen: 16px, lijndikte 1.6. */
export const icon = "size-4 shrink-0";
export const STROKE = 1.6;

export const card = "rounded-[14px] border border-line-soft bg-white";

/** Alleen zichtbaar bij hover of focus binnen de rij (en altijd op aanraakschermen). */
export const reveal =
  "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100";

export const iconButton =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-ink-subtle hover:bg-row-hover hover:text-ink";

/** Een knop in een menu (popover). */
export const menuItem =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-ink hover:bg-row-hover focus-visible:bg-row-hover";

export function Grip({
  label,
  onMove,
  onArm,
  focusKey,
  className,
}: {
  label: string;
  /** Om de focus terug te zetten na het verplaatsen. */
  focusKey: string;
  /** Pijltjestoetsen: -1 omhoog, 1 omlaag. */
  onMove: (delta: -1 | 1) => void;
  /** Slepen kan pas als de grip vastgenomen wordt. */
  onArm: (armed: boolean) => void;
  className?: string;
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      onMove(e.key === "ArrowUp" ? -1 : 1);
    }
  };
  return (
    <button
      type="button"
      aria-label={label}
      data-grip={focusKey}
      title="Sleep, of gebruik de pijltjestoetsen"
      onKeyDown={onKeyDown}
      onPointerDown={() => onArm(true)}
      onPointerUp={() => onArm(false)}
      className={cn(iconButton, "-mx-2 w-8 cursor-grab active:cursor-grabbing", className)}
    >
      <GripVertical className={icon} strokeWidth={STROKE} aria-hidden />
    </button>
  );
}

/** Eigenaar of presentator: avatar, of een kleine gestreepte cirkel met "+". */
export function OwnerButton({
  ownerId,
  onPick,
  role = "Eigenaar",
  id,
  hideEmpty,
}: {
  ownerId: string | null;
  onPick: (id: string) => void;
  role?: "Eigenaar" | "Presentator";
  id?: string;
  /** Lege toestand enkel bij hover tonen. */
  hideEmpty?: boolean;
}) {
  const { people, owners } = useMeeting();
  const owner = findPerson(people, ownerId);
  return (
    <OwnerPicker people={owners} label={`${role} kiezen`} onPick={onPick}>
      <button
        id={id}
        type="button"
        aria-label={owner ? `${role}: ${owner.name}. Wijzigen` : `${role} kiezen`}
        title={owner?.name}
        className={cn(
          "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-row-hover",
          !owner && hideEmpty && cn(reveal, "max-sm:hidden"),
        )}
      >
        {owner ? (
          <Avatar person={owner} size={24} decorative />
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-ink-subtle text-ink-subtle">
            <Plus className="size-3" strokeWidth={2} aria-hidden />
          </span>
        )}
      </button>
    </OwnerPicker>
  );
}

/** Tekst die je aanklikt om te wijzigen; Enter of wegklikken bewaart, Escape annuleert. */
export function InlineText({
  value,
  onSave,
  label,
  className,
  inputClassName,
  editing: forced,
  onEditingChange,
}: {
  value: string;
  onSave: (v: string) => void;
  label: string;
  className?: string;
  inputClassName?: string;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const [own, setOwn] = useState(false);
  const editing = forced ?? own;
  const setEditing = (v: boolean) => {
    setOwn(v);
    onEditingChange?.(v);
  };
  const [draft, setDraft] = useState(value);

  if (editing) {
    const commit = () => {
      if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
      setEditing(false);
    };
    return (
      <input
        type="text"
        aria-label={label}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(
          "min-h-11 min-w-0 flex-1 rounded-lg border border-brand bg-white px-2 text-ink outline-none",
          inputClassName,
        )}
      />
    );
  }
  return (
    <button
      type="button"
      aria-label={`${value}. ${label}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn("min-h-11 min-w-0 cursor-text truncate rounded-lg px-1 text-left hover:bg-row-hover", className)}
    >
      {value}
    </button>
  );
}

export function PurposeChip({ purpose }: { purpose: Purpose }) {
  const label = PURPOSES.find((p) => p.value === purpose)?.label;
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", PURPOSE_CLASS[purpose])}>
      {label}
    </span>
  );
}

/** Gestreepte chip als lege toestand van doel, duur of datum. */
const dashedChip =
  "inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-xs whitespace-nowrap text-ink-3";

/** Knop in de rij: 44px hoog, met een kleine chip erin. */
const chipButton = "flex min-h-11 shrink-0 cursor-pointer items-center rounded-lg px-0.5 hover:bg-row-hover";

const applyButton =
  "mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-line-soft bg-white text-sm font-semibold text-ink hover:bg-row-hover";

/** "Doel van dit punt": aanvinken met uitleg, toepassen met de knop. */
export function PurposeEditor({ value, onApply }: { value: Purpose[]; onApply: (v: Purpose[]) => void }) {
  const [draft, setDraft] = useState<Purpose[]>(value);
  const n = draft.length;
  return (
    <fieldset className="flex flex-col gap-0.5 p-1">
      <legend className="px-1.5 pb-1 text-[13px] text-ink-3">Doel van dit punt</legend>
      {PURPOSES.map((p) => (
        <label
          key={p.value}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 hover:bg-row-hover"
        >
          <input
            type="checkbox"
            checked={draft.includes(p.value)}
            onChange={(e) =>
              setDraft(
                PURPOSES.map((x) => x.value).filter((v) => (v === p.value ? e.target.checked : draft.includes(v))),
              )
            }
            className="m-0 size-4 shrink-0 accent-brand"
          />
          <span className="text-sm font-medium">{p.label}</span>
          <span className="truncate text-[13px] text-ink-3">· {p.hint}</span>
        </label>
      ))}
      <button type="button" onClick={() => onApply(draft)} className={applyButton}>
        <Check className={icon} strokeWidth={STROKE} aria-hidden />
        {n === 0 ? "Geen doel" : n === 1 ? "Pas 1 doel toe" : `Pas ${n} doelen toe`}
      </button>
    </fieldset>
  );
}

/** De gekozen doelen, of "+ Doel"; klikken opent de keuze. */
export function PurposePicker({ value, onChange }: { value: Purpose[]; onChange: (v: Purpose[]) => void }) {
  const [open, setOpen] = useState(false);
  const labels = value.map((v) => PURPOSES.find((p) => p.value === v)?.label).join(", ");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {value.length ? (
          <button type="button" aria-label={`Doel: ${labels}. Wijzigen`} className={chipButton}>
            <span
              className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", PURPOSE_CLASS.discuss)}
            >
              {value.map((v) => PURPOSES.find((p) => p.value === v)?.label).join(" - ")}
            </span>
          </button>
        ) : (
          <button type="button" aria-label="Doel toevoegen" className={chipButton}>
            <span className={dashedChip}>
              <Plus className="size-3" strokeWidth={STROKE} aria-hidden />
              Doel
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-[min(400px,calc(100vw-32px))]">
        <PurposeEditor
          value={value}
          onApply={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Eigenaars van een agendapunt: zoeken, aanvinken, toewijzen. */
function OwnersEditor({ value, onApply }: { value: string[]; onApply: (ids: string[]) => void }) {
  const { owners, people } = useMeeting();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(value);
  const q = query.trim().toLowerCase();
  // Eerst jij en de deelnemers, daarna de andere collega's.
  const all = [
    ...owners,
    ...people.filter((p) => !owners.some((o) => o.person.id === p.id)).map((person) => ({ person, hint: "" })),
  ];
  const list = all.filter((o) => matchesPerson(o.person, q));
  const n = draft.length;
  return (
    <div className="flex flex-col gap-1 p-1">
      <div className="relative">
        <input
          type="search"
          aria-label="Zoek een collega"
          placeholder="Zoek een collega"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11 w-full rounded-[10px] border border-line bg-white pr-9 pl-3 text-sm text-ink"
        />
        <Search
          className={cn(icon, "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle")}
          strokeWidth={STROKE}
          aria-hidden
        />
      </div>
      <ul className="flex max-h-64 flex-col overflow-y-auto">
        {list.map(({ person, hint }) => (
          <li key={person.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 hover:bg-row-hover">
              <input
                type="checkbox"
                checked={draft.includes(person.id)}
                onChange={(e) =>
                  setDraft(e.target.checked ? [...draft, person.id] : draft.filter((id) => id !== person.id))
                }
                className="m-0 size-4 shrink-0 accent-brand"
              />
              <Avatar person={person} size={22} decorative />
              <span className="shrink-0 text-sm font-medium">{person.name}</span>
              <span className="truncate text-[13px] text-ink-3">{person.email ?? hint}</span>
            </label>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="px-1.5 py-2 text-sm text-ink-3">Niemand gevonden</p>}
      <button type="button" onClick={() => onApply(draft)} className={applyButton}>
        <Check className={icon} strokeWidth={STROKE} aria-hidden />
        {n === 0 ? "Niemand toewijzen" : n === 1 ? "Wijs 1 eigenaar toe" : `Wijs ${n} eigenaars toe`}
      </button>
    </div>
  );
}

/** Avatar(s) met pijltje, of een gestreepte cirkel als knop "Eigenaar kiezen". */
export function OwnersPicker({
  value,
  onChange,
  id,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  id?: string;
}) {
  const { people } = useMeeting();
  const [open, setOpen] = useState(false);
  const chosen = value.map((v) => findPerson(people, v)).filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-label={chosen.length ? `Eigenaar: ${chosen.map((p) => p.name).join(", ")}. Wijzigen` : "Eigenaar kiezen"}
          className={cn(chipButton, "min-w-11 justify-center")}
        >
          <span className="inline-flex items-center gap-0.5 rounded-full border border-line-soft py-0.5 pr-1 pl-0.5">
            {chosen.length ? (
              <>
                <span className="flex items-center">
                  {chosen.slice(0, 2).map((p) => (
                    <Avatar
                      key={p.id}
                      person={p}
                      size={22}
                      decorative
                      className="-ml-1.5 ring-2 ring-white first:ml-0"
                    />
                  ))}
                </span>
                {chosen.length > 2 && <span className="text-xs text-ink-3">+{chosen.length - 2}</span>}
                <ChevronDown className="size-3.5 text-ink-subtle" strokeWidth={STROKE} aria-hidden />
              </>
            ) : (
              <>
                <span className="flex size-[22px] items-center justify-center rounded-full border border-dashed border-ink-subtle text-ink-subtle">
                  <Plus className="size-3" strokeWidth={2} aria-hidden />
                </span>
                <ChevronDown className="size-3.5 text-ink-subtle" strokeWidth={STROKE} aria-hidden />
              </>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-[min(380px,calc(100vw-32px))]">
        <OwnersEditor
          value={value}
          onApply={(ids) => {
            onChange(ids);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

const DURATION_PRESETS = [5, 10, 15, 20];

/** − 5 + met snelkeuzes. "Minder" en "meer" gaan per 5 minuten. */
export function DurationEditor({
  value,
  onChange,
  onPick,
  allowEmpty = true,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  /** Na een snelkeuze, bv. om de popover te sluiten. */
  onPick?: () => void;
  allowEmpty?: boolean;
}) {
  const step = (d: number) => onChange(Math.max(5, Math.min(600, (value ?? 0) + d)));
  const stepButton =
    "flex size-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-row-hover disabled:cursor-default disabled:opacity-40";
  return (
    <div className="flex flex-col items-center gap-2 p-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="5 minuten minder"
          disabled={!value || value <= 5}
          onClick={() => step(-5)}
          className={stepButton}
        >
          <span className="flex size-6 items-center justify-center rounded-full border border-line">
            <Minus className="size-3.5" strokeWidth={STROKE} aria-hidden />
          </span>
        </button>
        <output aria-live="polite" className="min-w-12 text-center text-lg font-semibold tabular-nums">
          {value ?? "–"}
          <span className="sr-only"> minuten</span>
        </output>
        <button type="button" aria-label="5 minuten meer" onClick={() => step(5)} className={stepButton}>
          <span className="flex size-6 items-center justify-center rounded-full border border-line">
            <Plus className="size-3.5" strokeWidth={STROKE} aria-hidden />
          </span>
        </button>
      </div>
      <div role="group" aria-label="Snel kiezen" className="flex gap-1">
        {DURATION_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => {
              onChange(d);
              onPick?.();
            }}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-row-hover"
          >
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs tabular-nums",
                value === d ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line-soft",
              )}
            >
              {d}
            </span>
          </button>
        ))}
      </div>
      {allowEmpty && value !== null && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            onPick?.();
          }}
          className={cn(menuItem, "justify-center text-ink-3")}
        >
          Geen duur
        </button>
      )}
    </div>
  );
}

/** "⏱ 5 min", of "Duur"; klikken opent − 5 + met snelkeuzes. */
export function DurationPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={value ? `Duur: ${value} minuten. Wijzigen` : "Duur toevoegen"}
          className={chipButton}
        >
          {value ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-line-soft px-2 py-0.5 text-xs whitespace-nowrap text-ink-3 tabular-nums">
              <Clock className="size-3" strokeWidth={STROKE} aria-hidden />
              {value} min
            </span>
          ) : (
            <span className={dashedChip}>
              <Clock className="size-3" strokeWidth={STROKE} aria-hidden />
              Duur
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-auto">
        <DurationEditor value={value} onChange={onChange} onPick={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

/** Datumchip met kalender: "📅 vr 17 okt", of "Datum" als er nog geen is. */
export function DateChip({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const selected = value ? (parseDateInput(value) ?? undefined) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={value ? `${label}: ${value}. Wijzigen` : label} className={chipButton}>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-ink-3",
              value ? "border-line-soft" : "border-dashed border-line",
            )}
          >
            <CalendarDays className="size-3" strokeWidth={STROKE} aria-hidden />
            {value || "Datum"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="app-theme w-auto overflow-hidden p-0">
        <Calendar
          mode="single"
          locale={nlBE}
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            onChange(d ? formatPicked(d) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Dunne voortgangsbalk (4px). */
export function ProgressBar({ value, label, over }: { value: number; label: string; over?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-1 overflow-hidden rounded-full bg-line-soft"
    >
      <div
        className={cn("h-1 rounded-full transition-[width]", over ? "bg-warning" : "bg-brand")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-line-soft bg-white px-1.5 py-px font-[inherit] text-[11px] font-medium text-ink-3 shadow-[0_1px_0_var(--line-soft)]">
      {children}
    </kbd>
  );
}
