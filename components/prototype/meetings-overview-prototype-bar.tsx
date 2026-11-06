"use client";

import { useState } from "react";
import { isDemoEnvironment } from "@/lib/demo-environment";
import { loadMeetingsOverviewScenario, type MeetingsOverviewScenario } from "@/lib/prototype/meetingsOverviewScenarios";

export function MeetingsOverviewPrototypeBar({ onLoad }: { onLoad: () => void }) {
  const [selected, setSelected] = useState<MeetingsOverviewScenario | null>(null);
  if (!isDemoEnvironment()) return null;
  return (
    <div
      role="region"
      aria-label="Prototype-bediening meetingoverzicht"
      className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--prototype-bar-bg)] px-6 py-2.5 pr-16 text-[13px] text-white"
    >
      <span className="text-[11px] font-bold tracking-[0.06em] text-[var(--prototype-bar-muted)] uppercase">
        PROTOTYPE
      </span>
      {(
        [
          { value: "default", label: "Default" },
          { value: "pending", label: "Nog af te ronden" },
        ] as const
      ).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={selected === value}
          onClick={() => {
            loadMeetingsOverviewScenario(value);
            setSelected(value);
            onLoad();
          }}
          className="min-h-8 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 text-white aria-pressed:ring-2 aria-pressed:ring-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--prototype-bar-focus)]"
        >
          {label}
        </button>
      ))}
      <span aria-live="polite" className="text-[var(--prototype-bar-muted)]">
        {selected
          ? `2 afgeronde · 2 aankomende${selected === "pending" ? " · 1 nog af te ronden" : ""}`
          : "Kies een testscenario"}
      </span>
    </div>
  );
}
