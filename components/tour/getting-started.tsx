"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GettingStartedItem {
  id: string;
  label: string;
  done: boolean;
  /** Bv. "2 min"; enkel zichtbaar bij de volgende stap. */
  meta?: string;
  onSelect?: () => void;
}

const panel =
  "app-theme fixed right-4 bottom-4 z-50 w-[min(300px,calc(100vw-32px))] overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_rgba(11,22,68,0.2)]";

function Circle({ done, large }: { done: boolean; large?: boolean }) {
  return done ? (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-success text-white",
        large ? "size-6" : "size-4",
      )}
    >
      <Check className={large ? "size-4" : "size-2.5"} strokeWidth={3} />
    </span>
  ) : (
    <span aria-hidden className="size-4 shrink-0 rounded-full border border-line-soft bg-white" />
  );
}

/**
 * Zwevende checklist "Aan de slag" rechtsonder (Figma "GettingStarted"):
 * inklapbaar tot de donkerblauwe kop met voortgang, en een felicitatie als alles klaar is.
 */
export function GettingStarted({
  items,
  nextUp,
  onClose,
}: {
  items: GettingStartedItem[];
  nextUp: { label: string; href: string };
  onClose: () => void;
}) {
  // Op een smal scherm start ze ingeklapt, zodat ze de rondleiding niet bedekt.
  const [open, setOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 640);
  const id = useId();
  const done = items.filter((i) => i.done).length;
  const next = items.find((i) => !i.done);

  if (!next) {
    return (
      <aside aria-labelledby={`${id}-title`} className={cn(panel, "flex flex-col gap-4 p-4")}>
        <div className="flex items-center gap-2">
          <Circle done large />
          <h2 id={`${id}-title`} className="text-2xl font-bold">
            Je bent klaar!
          </h2>
        </div>
        <p className="text-sm">
          Je eerste vergadering is gedaan en de acties worden opgevolgd. Ze staan bij het begin van je volgende
          vergadering onder Openstaande acties.
        </p>
        <div className="flex flex-col gap-1 rounded-2xl bg-tour-accent px-4 py-2">
          <p className="text-xs">Volgende stap</p>
          <Link href={nextUp.href} className="inline-flex min-h-6 items-center gap-2 text-sm no-underline">
            {nextUp.label}
            <ArrowRight className="size-5" strokeWidth={1.8} aria-hidden />
          </Link>
        </div>
        <Button size="sm" className="self-end rounded-2xl px-3.5 text-base font-semibold" onClick={onClose}>
          Sluiten
        </Button>
      </aside>
    );
  }

  return (
    <aside aria-labelledby={`${id}-title`} className={panel}>
      <div className="flex flex-col gap-2 bg-tour px-4 pt-1 pb-3 text-white">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-items`}
          onClick={() => setOpen((o) => !o)}
          className="-mx-2 flex min-h-9 cursor-pointer items-center justify-between rounded-md px-2 text-left text-xs hover:bg-white/10"
        >
          <span id={`${id}-title`}>
            Aan de slag · {done} van {items.length}
          </span>
          <ChevronDown className={cn("size-4 transition-transform", !open && "rotate-180")} aria-hidden />
          <span className="sr-only">{open ? "inklappen" : "uitklappen"}</span>
        </button>
        <div
          role="progressbar"
          aria-label={`Aan de slag: ${done} van ${items.length} gedaan`}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={done}
          className="h-1 overflow-hidden rounded-full bg-white/20"
        >
          <div
            className="h-1 rounded-full bg-white transition-[width]"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
      </div>
      {open && (
        <ul id={`${id}-items`} className="flex flex-col px-3 py-2">
          {items.map((item) => {
            const current = item === next;
            const body = (
              <>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Circle done={item.done} />
                  <span className={cn("flex-1", item.done && "line-through")}>
                    {item.label}
                    {item.done && <span className="sr-only"> (gedaan)</span>}
                  </span>
                </span>
                {current && item.meta && <span className="text-xs font-medium text-brand">{item.meta}</span>}
              </>
            );
            const row = cn(
              "flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-sm",
              current && "bg-tour-accent",
            );
            return (
              <li key={item.id}>
                {!item.done && item.onSelect ? (
                  <button
                    type="button"
                    onClick={item.onSelect}
                    className={cn(row, "cursor-pointer", !current && "hover:bg-row-hover")}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={row}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
