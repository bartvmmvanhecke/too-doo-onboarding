"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { Person } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface OwnerOption {
  person: Person;
  /** Tweede regel, bv. "deelnemer productieoverleg". */
  hint: string;
}

/**
 * "Wie?" bij een actie: naam of e-mail typen, kiezen uit de deelnemers, of
 * "Iemand anders toevoegen". Combobox met listbox, volledig met toetsenbord.
 */
export function OwnerCombobox({
  label,
  options,
  selected,
  text,
  onTextChange,
  onSelect,
  onAddPerson,
  placeholder = "Naam of e-mail",
}: {
  label: string;
  options: OwnerOption[];
  selected: Person | undefined;
  text: string;
  onTextChange: (text: string) => void;
  onSelect: (personId: string | null) => void;
  onAddPerson: (text: string) => void;
  placeholder?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const q = text.trim().toLowerCase();
  const matches = options
    .filter((o) => !q || o.person.name.toLowerCase().includes(q) || o.person.email?.toLowerCase().includes(q))
    .slice(0, 5);
  const canAdd = q.length > 0 && !matches.some((o) => o.person.name.toLowerCase() === q || o.person.email?.toLowerCase() === q);
  const count = matches.length + (canAdd ? 1 : 0);

  const choose = (index: number) => {
    if (index < matches.length) {
      onSelect(matches[index].person.id);
      onTextChange("");
    } else if (canAdd) {
      onAddPerson(text);
      onTextChange("");
    }
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (count > 0) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : count - 1)) % count);
    } else if (e.key === "Enter" && open && count > 0) {
      e.preventDefault();
      choose(Math.min(active, count - 1));
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (selected) {
    return (
      <div className="flex min-h-12 min-w-0 items-center gap-2 rounded-[10px] border border-line bg-white pr-1 pl-2.5">
        <Avatar person={selected} size={26} decorative />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{selected.name}</span>
        <button
          type="button"
          aria-label={`${label}: ${selected.name} wissen`}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-3 hover:bg-app hover:text-ink"
          onClick={() => {
            onSelect(null);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open && count > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && count > 0 ? `${listId}-${Math.min(active, count - 1)}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          onTextChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="min-h-12 w-full min-w-0 rounded-[10px] border border-line bg-white px-3 py-3 text-[15px] text-ink outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)] focus-visible:outline-none"
      />
      <div
        id={listId}
        role="listbox"
        aria-label={`Suggesties voor ${label.toLowerCase()}`}
        hidden={!open || count === 0}
        className="absolute top-[calc(100%+4px)] left-0 z-20 flex w-[260px] max-w-[80vw] flex-col rounded-xl border border-track bg-white p-1.5 shadow-[0_14px_34px_rgba(22,33,58,0.16)]"
      >
        {matches.map((o, i) => (
          <div
            key={o.person.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(i)}
            className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg p-2.5", i === active && "bg-brand-selected")}
          >
            <Avatar person={o.person} size={26} decorative />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold">{o.person.name}</span>
              <span className="truncate text-xs text-ink-3">{o.hint}</span>
            </span>
          </div>
        ))}
        {canAdd && (
          <div
            id={`${listId}-${matches.length}`}
            role="option"
            aria-selected={active === matches.length}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(matches.length)}
            onClick={() => choose(matches.length)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg p-2.5",
              active === matches.length && "bg-brand-selected",
            )}
          >
            <span className="flex size-[26px] items-center justify-center rounded-full border border-dashed border-[#8A95AB] text-ink-2">
              <Plus className="size-4" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">Iemand anders toevoegen</span>
              <span className="truncate text-xs text-ink-3">{text.trim()}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
