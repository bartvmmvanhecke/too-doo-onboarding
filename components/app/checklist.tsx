"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** Bv. "1 min", rechts naast het item. */
  meta?: string;
  /** Uitgelicht als volgende stap. */
  highlight?: boolean;
  onSelect?: () => void;
  href?: string;
}

/** Checklist "Aan de slag" met voortgangsbalk. */
export function Checklist({ title = "Aan de slag", items }: { title?: string; items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <aside
      aria-labelledby="checklist-title"
      className="flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-[14px] border border-line-soft bg-white px-5 py-[18px]"
    >
      <div className="flex items-center justify-between">
        <h2 id="checklist-title" className="text-[17px] font-extrabold">
          {title}
        </h2>
        <span className="text-[13px] font-bold text-ink-2">
          {done} van {items.length}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${title}: ${done} van ${items.length} gedaan`}
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done}
        className="h-1.5 overflow-hidden rounded-md bg-line-soft"
      >
        <div className="h-1.5 bg-success transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <ChecklistRow item={item} />
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const marker = item.done ? (
    <Check className="size-[18px] shrink-0 text-success" strokeWidth={2.5} aria-hidden />
  ) : (
    <span
      aria-hidden
      className={cn("size-4 shrink-0 rounded-full border-2", item.highlight ? "border-brand" : "border-[#8A95AB]")}
    />
  );
  const body = (
    <>
      {marker}
      <span className="flex-1">
        {item.label}
        {item.done && <span className="sr-only"> (gedaan)</span>}
      </span>
      {item.meta && !item.done && <span className="text-[13px] text-brand">{item.meta}</span>}
    </>
  );
  const base = "-mx-2.5 flex min-h-11 w-[calc(100%+20px)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[15px]";
  const tone = item.done
    ? "font-normal text-ink-3 line-through"
    : item.highlight
      ? "bg-brand-selected font-bold text-ink"
      : "font-semibold text-ink";

  if (!item.done && item.href) {
    return (
      <Link href={item.href} className={cn(base, tone, "no-underline hover:bg-brand-soft hover:text-ink")}>
        {body}
      </Link>
    );
  }
  if (!item.done && item.onSelect) {
    return (
      <button type="button" onClick={item.onSelect} className={cn(base, tone, "cursor-pointer hover:bg-brand-soft")}>
        {body}
      </button>
    );
  }
  return <div className={cn(base, tone)}>{body}</div>;
}
