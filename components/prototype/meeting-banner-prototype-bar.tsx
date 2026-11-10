"use client";
import { isDemoEnvironment } from "@/lib/demo-environment";
import type { Meeting } from "@/lib/store";
import { loadMeetingBannerScenario } from "@/lib/prototype/meetingBannerScenarios";

export function MeetingBannerPrototypeBar({ meeting }: { meeting: Meeting }) {
  if (!isDemoEnvironment() || !["prototype-auto-closed", "overview-demo-upcoming-1"].includes(meeting.id)) return null;
  const selected =
    meeting.followUpStatus === "saved" || meeting.followUpStatus === "sent"
      ? "completed"
      : meeting.noActivity
        ? "no-activity"
        : meeting.wrapUpDraft?.step
          ? "unfinished"
          : "proposed";
  return (
    <div
      role="region"
      aria-label="Prototype-bediening afrondbanners"
      className="flex shrink-0 flex-wrap items-center gap-2 bg-[var(--prototype-bar-bg)] px-6 py-2.5 pr-16 text-[13px] text-white"
    >
      <span className="text-[11px] font-bold tracking-wide text-[var(--prototype-bar-muted)]">PROTOTYPE</span>
      {(
        [
          { value: "proposed", label: "Voorgestelde afrondtijd" },
          { value: "no-activity", label: "Geen actie geregistreerd" },
          { value: "unfinished", label: "Halverwege gestopt met afronden" },
          { value: "completed", label: "Afgerond" },
        ] as const
      ).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={selected === value}
          onClick={() => loadMeetingBannerScenario(value, meeting.id)}
          className="min-h-11 rounded-lg border border-[var(--prototype-bar-border)] bg-[var(--prototype-bar-button)] px-3 aria-pressed:ring-2 aria-pressed:ring-white/60 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
