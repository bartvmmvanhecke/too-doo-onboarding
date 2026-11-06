"use client";
import { unlockChime } from "@/lib/audio/chime-state";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { isDemoEnvironment } from "@/lib/demo-environment";
import { loadWrapUpScenario, type WrapUpScenario } from "@/lib/prototype/wrapUpScenarios";
export function MeetingPrototypeBar({ meetingId }: { meetingId: string }) {
  const visible = useStore((s) => s.demo.wrapUpToolbar !== false);
  const [announcement, setAnnouncement] = useState("");
  const router = useRouter();
  if (!isDemoEnvironment() || !visible) return null;
  const load = (kind: WrapUpScenario) => {
    void unlockChime();
    const result = loadWrapUpScenario(kind, meetingId);
    if (!result) return;
    setAnnouncement(result.announcement);
    if (result.preview) router.push(`/app/overleg/${meetingId}?herinnering=1`);
  };
  return (
    <div
      role="region"
      aria-label="Prototype-bediening"
      className="flex shrink-0 flex-wrap items-center gap-2 bg-[var(--prototype-bar-bg)] px-6 py-2.5 text-[13px] text-white"
    >
      <span className="text-[11px] font-bold tracking-[0.06em] text-[var(--prototype-bar-muted)] uppercase">
        PROTOTYPE
      </span>
      {(
        [
          { kind: "start", label: "Scenario: start bij eerste punt" },
          { kind: "jumps", label: "Scenario: sprongen 1 → 4 → 2 → 5" },
          { kind: "last", label: "Scenario: nog één punt open" },
          { kind: "advance", label: "Tijd +5 min" },
          { kind: "last-five", label: "Laatste 5 seconden" },
          { kind: "unattended", label: "Gebruiker sluit de tab → spoor B" },
        ] as const
      ).map(({ kind, label }) => (
        <button
          key={kind}
          type="button"
          onClick={() => load(kind)}
          className="h-8 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--prototype-bar-focus)]"
        >
          {label}
        </button>
      ))}
      <span className="ml-auto mr-10 text-[var(--prototype-bar-muted)]">Klik op agendapunten om te springen</span>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
