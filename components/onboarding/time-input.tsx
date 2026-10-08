"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { formatTime, parseTime, TIME_SLOTS, type Minutes } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Uurveld (SPEC.md §3.3): typbaar ("8u", "0800", "8:30", "8.30"), − en + per
 * kwartier, en een uitklaplijst 06:00–20:00. Ongeldige invoer zet de vorige
 * waarde terug. Toegankelijk als combobox met listbox.
 */
export function TimeInput({
  id,
  value,
  onChange,
  slots = TIME_SLOTS,
  describedBy,
}: {
  id: string;
  value: Minutes;
  onChange: (m: Minutes) => void;
  slots?: Minutes[];
  describedBy?: string;
}) {
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number>(-1);

  const nearestIndex = (m: Minutes) => {
    const exact = slots.indexOf(m);
    if (exact >= 0) return exact;
    const after = slots.findIndex((s) => s > m);
    return after === -1 ? slots.length - 1 : after;
  };

  const scrollTo = (i: number) => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);
    el?.scrollIntoView({ block: "nearest" });
  };

  const openList = () => {
    const i = nearestIndex(value);
    setOpen(true);
    setActive(i);
    requestAnimationFrame(() => scrollTo(i));
  };

  const commit = () => {
    if (text !== null) {
      const parsed = parseTime(text);
      if (parsed !== null) onChange(parsed);
    }
    setText(null);
  };

  const current = () => (text !== null ? (parseTime(text) ?? value) : value);
  const step = (delta: number) => {
    onChange((((current() + delta) % 1440) + 1440) % 1440);
    setText(null);
  };

  const pick = (m: Minutes) => {
    onChange(m);
    setText(null);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      const next = Math.min(slots.length - 1, Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1)));
      setActive(next);
      scrollTo(next);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && text === null) pick(slots[active]);
      else {
        commit();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
      setText(null);
    }
  };

  const sideButton =
    "w-11 shrink-0 cursor-pointer border-0 border-solid bg-field-muted text-xl font-bold text-ink hover:bg-app";

  return (
    <div className="relative">
      <div className="flex min-h-12 items-stretch overflow-hidden rounded-[10px] border border-line bg-white focus-within:border-brand focus-within:shadow-[0_0_0_1px_var(--brand)]">
        <button
          type="button"
          aria-label="15 minuten vroeger"
          className={cn(sideButton, "border-r border-line-soft")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => step(-15)}
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="none"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={describedBy}
          value={text ?? formatTime(value)}
          onChange={(e) => {
            setText(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={(e) => {
            e.target.select();
            openList();
          }}
          onBlur={() => {
            commit();
            setOpen(false);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 border-none bg-transparent px-1.5 py-3 text-center text-base font-bold text-ink outline-none focus-visible:outline-none"
        />
        <button
          type="button"
          aria-label="15 minuten later"
          className={cn(sideButton, "border-l border-line-soft")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => step(15)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Kies uit lijst"
          aria-expanded={open}
          aria-controls={listId}
          tabIndex={-1}
          className="flex w-10 shrink-0 cursor-pointer items-center justify-center border-0 border-l border-solid border-line-soft bg-white hover:bg-app"
          onMouseDown={(e) => {
            e.preventDefault();
            document.getElementById(id)?.focus();
          }}
          onClick={() => (open ? setOpen(false) : openList())}
        >
          <ChevronDown className="size-4 text-ink-2" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Uren"
        hidden={!open}
        className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 flex max-h-[220px] flex-col overflow-y-auto rounded-xl border border-track bg-white p-1.5 shadow-[0_14px_34px_rgba(22,33,58,0.16)]"
      >
        {slots.map((m, i) => (
          <div
            key={m}
            id={`${listId}-${i}`}
            data-index={i}
            role="option"
            aria-selected={m === value}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(m)}
            onMouseEnter={() => setActive(i)}
            className={cn(
              "flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-[15px]",
              m === value ? "bg-brand-soft font-extrabold text-brand-hover" : "font-semibold text-ink",
              i === active && m !== value && "bg-app",
              i === active && "outline-2 -outline-offset-2 outline-brand/40",
            )}
          >
            {formatTime(m)}
          </div>
        ))}
      </div>
    </div>
  );
}
