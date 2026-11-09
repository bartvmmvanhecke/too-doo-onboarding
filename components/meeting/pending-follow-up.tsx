"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useStore, type Meeting } from "@/lib/store";
import { clockTime } from "@/lib/meeting-wrap-up";
import { initialWrapUpDraft } from "@/lib/wrap-up-flow";
import { EndTimeInfo } from "./meeting-wrap-up";

export function PendingFollowUp({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const router = useRouter();
  if (meeting.endedAt === undefined || meeting.followUpStatus !== "pending") return null;
  return (
    <section
      role="status"
      aria-label="Nog af te ronden"
      className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--wrap-line)] bg-[var(--wrap-amber-bg)] p-5 text-[var(--wrap-amber-ink)]"
    >
      <div className="min-w-0 flex-1">
        <h2 className="font-bold">Nog af te ronden · opvolging niet verstuurd</h2>
        {meeting.endReason === "auto" && !meeting.endTimeConfirmed && (
          <>
            <p className="mt-2 text-sm">
              {meeting.noActivity
                ? "Automatisch afgesloten · geen activiteit geregistreerd · eindtijd = gepland einde"
                : `Automatisch afgesloten · eindtijd ${clockTime(meeting.endedAt)} (laatste activiteit ${clockTime(meeting.lastActivityAt ?? meeting.startedAt ?? meeting.endedAt)} + 15 min)`}
            </p>
            <div className="mt-2 flex flex-wrap items-start gap-3">
              <Button variant="outline" onClick={() => ops.putMeeting({ ...meeting, endTimeConfirmed: true })}>
                Klopt
              </Button>
              <EndTimeInfo meeting={meeting} />
            </div>
          </>
        )}
      </div>
      <Button
        onClick={() => {
          ops.putMeeting({
            ...meeting,
            endTimeConfirmed: true,
            wrapUpOpen: false,
            wrapUpDraft: { ...initialWrapUpDraft(meeting, ops.meetings), entry: "later", step: 0 },
          });
          router.push(`/vergaderingen/${meeting.id}/afronden`);
        }}
      >
        Afronden →
      </Button>
    </section>
  );
}
