"use client";

import { Route, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Boven een lege vergadering: biedt de bestaande rondleiding aan, maar start ze niet vanzelf.
 * Tijdens de rondleiding is de knop verborgen.
 */
export function TourBanner({
  touring,
  onStart,
  onDismiss,
}: {
  touring: boolean;
  onStart: () => void;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-label="Rondleiding"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-current-line bg-white p-4 shadow-[0_1px_1.5px_rgba(20,31,75,0.05)]"
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
      >
        <Route className="size-4" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
        <p className="text-sm font-semibold">Eerst even rondkijken?</p>
        <p className="text-xs text-ink-2">
          In 4 stappen zie je hoe thema&apos;s, agendapunten, beslissingen en acties werken.
        </p>
      </div>
      <div className="flex items-center gap-1">
        {!touring && (
          <Button variant="outline" size="sm" className="rounded-full font-semibold text-brand" onClick={onStart}>
            Start rondleiding
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Banner sluiten" onClick={onDismiss}>
          <X className="size-4" strokeWidth={1.8} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
