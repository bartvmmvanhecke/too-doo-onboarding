"use client";
import { Volume2, VolumeX } from "lucide-react";
import { useStore } from "@/lib/store";
import { CHIME_DEFAULT_ON } from "@/lib/meetingWrapUp.config";
import { toggleChime, useAudioRuntime, useChimePreferences } from "@/lib/audio/chime-state";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export function ChimeControl() {
  const user = useStore((s) => s.user?.email.toLowerCase() ?? "guest");
  const enabled = useChimePreferences((s) => s.users[user] ?? CHIME_DEFAULT_ON);
  const running = useAudioRuntime((s) => s.running);
  const Icon = enabled ? Volume2 : VolumeX;
  const tooltip =
    enabled && !running ? "Klik om het geluid te activeren" : `Geluid bij einde: ${enabled ? "aan" : "uit"}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Geluid bij einde van de geplande tijd"
            aria-pressed={enabled}
            title={tooltip}
            onClick={() => void toggleChime()}
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Icon aria-hidden className="size-5" />
            {enabled && !running && (
              <span aria-hidden className="absolute top-1 right-1 size-2 rounded-full bg-[var(--wrap-amber-ink)]" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
