"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, GripVertical, Plus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { OwnerPicker } from "@/components/b/owner-picker";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PURPOSE_CLASS, PURPOSES, type Purpose } from "@/lib/agenda";
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
      className={cn(iconButton, "-mx-2 w-8 cursor-grab active:cursor-grabbing", reveal, className)}
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

/** Aan/uit-knoppen voor Bespreken, Informeren en Beslissen. */
export function PurposeEditor({ value, onChange }: { value: Purpose[]; onChange: (v: Purpose[]) => void }) {
  return (
    <div role="group" aria-label="Doel" className="flex flex-col">
      {PURPOSES.map((p) => {
        const on = value.includes(p.value);
        return (
          <button
            key={p.value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(
                on
                  ? value.filter((x) => x !== p.value)
                  : PURPOSES.map((x) => x.value).filter((x) => x === p.value || value.includes(x)),
              )
            }
            className={menuItem}
          >
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", PURPOSE_CLASS[p.value])}>{p.label}</span>
            {on && <Check className={cn(icon, "ml-auto text-brand")} strokeWidth={STROKE} aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/** De gekozen doelen; klikken opent de keuze. Toont niets zonder doel. */
export function PurposeChips({ value, onChange }: { value: Purpose[]; onChange: (v: Purpose[]) => void }) {
  if (value.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Doel: ${value.map((v) => PURPOSES.find((p) => p.value === v)?.label).join(", ")}. Wijzigen`}
          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-1 hover:bg-row-hover"
        >
          {value.map((p) => (
            <PurposeChip key={p} purpose={p} />
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-52">
        <PurposeEditor value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60];

export function DurationEditor({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value ? String(value) : "");
  const commit = () => {
    const n = parseInt(text, 10);
    onChange(Number.isFinite(n) && n > 0 ? Math.min(n, 600) : null);
  };
  return (
    <div className="flex flex-col gap-2 p-1">
      <div role="group" aria-label="Snel kiezen" className="grid grid-cols-4 gap-1">
        {DURATION_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => onChange(d)}
            className={cn(
              "min-h-11 cursor-pointer rounded-lg text-sm hover:bg-row-hover",
              value === d && "bg-brand-soft font-semibold text-brand",
            )}
          >
            {d}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-3">Minuten</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="min-h-11 w-20 rounded-lg border border-line px-2 text-ink"
        />
      </label>
      {value !== null && (
        <button type="button" onClick={() => onChange(null)} className={cn(menuItem, "text-ink-3")}>
          Geen duur
        </button>
      )}
    </div>
  );
}

/** "10 min"; klikken opent de keuze. Toont niets zonder duur. */
export function DurationButton({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
}) {
  if (!value) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Duur: ${value} minuten. Wijzigen`}
          className={cn(
            "min-h-11 shrink-0 cursor-pointer rounded-lg px-1.5 text-[13px] whitespace-nowrap text-ink-3 tabular-nums hover:bg-row-hover",
            className,
          )}
        >
          {value} min
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-60">
        <DurationEditor value={value} onChange={onChange} />
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
