"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { isDemoEnvironment } from "@/lib/demo-environment";
import { loadAutoClosedPreview, loadDirectWrapUpPreview, loadMeetingsOverviewScenario } from "@/lib/prototype/meetingsOverviewScenarios";

export function MeetingsOverviewPrototypeBar({ onLoad }: { onLoad: () => void }) {
  const router = useRouter();
  const meetings = useStore((s) => s.meetings);
  const selected = meetings.some((m) => m.id === "overview-demo-pending")
    ? "pending"
    : meetings.length === 4 && meetings.every((m) => m.id.startsWith("overview-demo-"))
      ? "default"
      : null;
  if (!isDemoEnvironment()) return null;
  return (
    <div
      role="region"
      aria-label="Prototype-bediening meetingoverzicht"
      className="flex flex-wrap items-center gap-2 bg-[var(--prototype-bar-bg)] px-6 py-2.5 pr-16 text-[13px] text-white"
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
            onLoad();
          }}
          className="min-h-8 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 text-white aria-pressed:ring-2 aria-pressed:ring-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--prototype-bar-focus)]"
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          const id = loadAutoClosedPreview();
          if (id) router.push(`/app/overleg/${id}`);
        }}
        className="min-h-11 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--prototype-bar-focus)]"
      >
        Automatisch afgesloten · eindtijd bevestigen
      </button>
      <button
        type="button"
        onClick={() => {
          const id = loadDirectWrapUpPreview();
          if (id) router.push(`/vergaderingen/${id}/afronden`);
        }}
        className="min-h-11 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--prototype-bar-focus)]"
      >
        Meteen naar afrondingsflow
      </button>
      <span aria-live="polite" className="ml-auto text-[var(--prototype-bar-muted)]">
        {selected
          ? `2 afgeronde · 2 aankomende${selected === "pending" ? " · 1 nog af te ronden" : ""}`
          : "Kies een testscenario"}
      </span>
    </div>
  );
}
