"use client";

import { useEffect, useRef, useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TourStep {
  id: string;
  /** Het element waar de stap naar wijst; null of onzichtbaar = stap overslaan. */
  target: () => HTMLElement | null;
  title: string;
  text: string;
  /** Kaart links (start) of rechts (end) uitgelijnd op de wijzer. */
  align?: "start" | "end";
  /** Wijzer linksboven (start) of middenboven (center) het doel. */
  point?: "start" | "center";
}

interface Spot {
  x: number;
  y: number;
  /** Afstand van de wijzer tot onder het doel: daar begint de kaart. */
  below: number;
}

const POINTER = 8;

function measure(step: TourStep): Spot | null {
  const r = step.target()?.getBoundingClientRect();
  if (!r || r.width === 0 || r.height === 0) return null;
  const x =
    step.point === "center" ? r.left + r.width / 2 - POINTER / 2 : r.left + Math.min(r.width / 2, 18) - POINTER / 2;
  const y = r.top - POINTER / 2;
  return { x: Math.round(x), y: Math.round(y), below: Math.round(r.bottom - y) };
}

/**
 * Productrondleiding met coach marks (Figma "Product Tour Mark"): een blauwe wijzer
 * op het doel en een donkerblauwe kaart eronder, van stap naar stap.
 */
export function ProductTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  // De ouder bouwt steps en onClose bij elke render opnieuw op; de effecten volgen enkel de stap.
  const latest = useRef({ steps, onClose });
  useEffect(() => {
    latest.current = { steps, onClose };
  });

  // Het doel van de stap in beeld brengen.
  useEffect(() => {
    latest.current.steps[index]?.target()?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [index]);

  // Wijzer volgt het doel bij scrollen, herschikken en inklappen.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const { steps: current, onClose: close } = latest.current;
      const next = current[index] && measure(current[index]);
      if (!next) {
        // Doel bestaat niet (meer), bv. op een smal scherm: door naar de volgende stap.
        if (index >= current.length - 1) close();
        else setIndex(index + 1);
        return;
      }
      setSpot((s) => (s && s.x === next.x && s.y === next.y && s.below === next.below ? s : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index]);

  if (!spot) return null;

  return (
    <Popover open modal={false}>
      <PopoverPrimitive.Anchor asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed z-[60] size-2 rounded-full border-[3px] border-tour-accent bg-brand box-content"
          style={{ left: spot.x - 3, top: spot.y - 3 }}
        >
          <span className="absolute -inset-[3px] animate-ping rounded-full bg-brand/40" />
        </span>
      </PopoverPrimitive.Anchor>
      <PopoverContent
        side="bottom"
        align={step.align ?? "start"}
        alignOffset={step.align === "end" ? -10 : -3}
        sideOffset={spot.below + 12}
        updatePositionStrategy="always"
        collisionPadding={16}
        aria-label="Rondleiding"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={onClose}
        className="app-theme z-[60] flex w-[260px] flex-col gap-4 rounded-2xl border-0 bg-tour p-4 shadow-[0_10px_15px_rgba(11,22,68,0.2)]"
      >
        <div className="flex flex-col gap-2 text-white" aria-live="polite">
          <div className="flex items-center gap-1 text-xs leading-4">
            {index > 0 && (
              <button
                type="button"
                aria-label="Vorige stap"
                onClick={() => setIndex((i) => i - 1)}
                className="-ml-1 flex size-6 cursor-pointer items-center justify-center rounded-md hover:bg-white/15"
              >
                <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
              </button>
            )}
            Stap {index + 1} van {steps.length}
          </div>
          <div className="flex flex-col">
            <h2 className="text-base leading-6 font-semibold">{step.title}</h2>
            <p className="text-xs leading-4">{step.text}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="link"
            size="sm"
            className={cn("-ml-1.5 px-1.5 font-normal text-white hover:text-white", last && "invisible")}
            onClick={onClose}
          >
            Overslaan
          </Button>
          <Button
            size="sm"
            className="rounded-2xl px-3.5 text-base font-semibold"
            onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
          >
            {last ? "Begrepen" : "Volgende"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
