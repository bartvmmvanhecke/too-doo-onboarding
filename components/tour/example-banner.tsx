"use client";

import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Statusbanner boven de voorbeeldagenda (Figma: "We prepared an example agenda…"). */
export function ExampleBanner({
  meetingName,
  onShowMe,
  onStartBlank,
  onDismiss,
}: {
  meetingName: string;
  onShowMe: () => void;
  onStartBlank: () => void;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-label="Voorbeeldagenda"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-current-line bg-white p-4 shadow-[0_1px_1.5px_rgba(20,31,75,0.05)]"
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
      >
        <FileText className="size-4" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
        <p className="text-sm font-semibold">
          We hebben een voorbeeldagenda voorbereid voor je {meetingName.toLowerCase()}
        </p>
        <p className="text-xs text-ink-2">
          Hernoem, verplaats of verwijder wat je wil om ze van jou te maken, of start meteen de vergadering.
          Beslissingen en acties noteer je tijdens de vergadering.
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="rounded-full font-semibold text-brand" onClick={onShowMe}>
          Toon me hoe · 1 min
        </Button>
        <Button variant="link" size="sm" className="text-xs font-semibold text-ink underline" onClick={onStartBlank}>
          Leeg beginnen
        </Button>
        <Button variant="ghost" size="icon" aria-label="Banner sluiten" onClick={onDismiss}>
          <X className="size-4" strokeWidth={1.8} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
