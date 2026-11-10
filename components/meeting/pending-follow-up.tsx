"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, SquareCheckBig, CircleAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, type Meeting } from "@/lib/store";
import { agendaItems, clockTime, isHandled, plannedEnd } from "@/lib/meeting-wrap-up";
import { initialWrapUpDraft } from "@/lib/wrap-up-flow";

export function PendingFollowUp({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  if (meeting.endedAt === undefined || meeting.followUpStatus !== "pending") return null;
  const openCount = agendaItems(meeting).filter((item) => !isHandled(meeting, item.id)).length;
  const storedStep = meeting.wrapUpDraft?.step ?? 0;
  const stepLabels: Record<number, { number: number; label: string }> = {
    3: { number: 2, label: "Beslissingen" },
    4: { number: 3, label: "Acties" },
    1: { number: 4, label: "Volgende vergadering" },
    2: { number: 5, label: "Opvolging" },
  };
  const resume = stepLabels[storedStep];
  const Icon = resume ? ArrowRight : meeting.noActivity ? CircleAlert : SquareCheckBig;
  const minimum = Math.max(plannedEnd(meeting), meeting.startedAt ?? 0);
  return (
    <section
      role="status"
      aria-label="Nog af te ronden"
      className="flex flex-wrap items-center gap-5 rounded-[20px] border border-[#f6cf83] bg-[#fff8e9] px-6 py-6 text-ink sm:gap-6 sm:px-8"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#ffedc6] text-[#985c00]">
        <Icon aria-hidden className="size-6" />
      </span>
      <div className="min-w-0 flex-1 basis-72">
        <h2 className="text-lg font-bold">
          {resume
            ? "Je was bezig met afronden"
            : meeting.noActivity
              ? "Is deze vergadering doorgegaan?"
              : "Rond deze vergadering af"}
        </h2>
        {resume ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-2">
            <progress
              aria-label="Voortgang afronden"
              max={5}
              value={resume.number}
              className="h-2 w-48 accent-[#985c00]"
            />
            <span>
              Stap {resume.number} van 5 · {resume.label} · je keuzes zijn bewaard
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-2">
            {meeting.noActivity
              ? "Er werd niets geregistreerd. Rond af om de agendapunten door te schuiven, of markeer ze als niet doorgegaan."
              : `${openCount === 1 ? "1 agendapunt staat" : `${openCount} agendapunten staan`} nog open en de opvolging is nog niet verstuurd.`}
          </p>
        )}
        {!resume && (
          <>
            {editing ? (
              <form
                className="mt-3 flex flex-wrap items-center gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const date = new Date(meeting.endedAt!);
                  const [hours, minutes] = time.split(":").map(Number);
                  date.setHours(hours, minutes, 0, 0);
                  if (!Number.isFinite(date.getTime()) || date.getTime() < minimum) {
                    setError(`Kies een eindtijd vanaf ${clockTime(minimum)}.`);
                    return;
                  }
                  const latest = useStore.getState().meetings.find((item) => item.id === meeting.id)!;
                  ops.putMeeting({
                    ...latest,
                    endedAt: date.getTime(),
                    endTimeConfirmed: true,
                    wrapUpDraft: { ...initialWrapUpDraft(latest, useStore.getState().meetings), endTimeAdjusted: true },
                  });
                  setEditing(false);
                  setError("");
                }}
              >
                <label className="flex items-center gap-3 text-sm font-semibold">
                  Eindtijd
                  <input
                    type="time"
                    required
                    value={time}
                    aria-describedby={`end-time-help-${meeting.id}`}
                    onChange={(event) => setTime(event.target.value)}
                    className="min-h-11 rounded-lg border border-line bg-white px-3 text-base font-normal"
                  />
                </label>
                <Button type="submit" variant="outline" className="rounded-full text-brand">
                  Opslaan
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setError("");
                  }}
                >
                  Annuleren
                </Button>
                <span id={`end-time-help-${meeting.id}`} className="text-sm text-ink-3">
                  Niet vroeger dan het geplande einde ({clockTime(plannedEnd(meeting))})
                </span>
                {error && (
                  <p role="alert" className="w-full text-sm text-danger">
                    {error}
                  </p>
                )}
              </form>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
                <Clock3 aria-hidden className="size-4" />
                <span>
                  Eindtijd <strong className="text-ink">{clockTime(meeting.endedAt)}</strong>
                </span>
                <span>
                  ·{" "}
                  {meeting.wrapUpDraft?.endTimeAdjusted
                    ? "door jou aangepast"
                    : meeting.noActivity
                      ? "gepland einde"
                      : meeting.endReason === "auto"
                        ? "automatisch voorgesteld"
                        : "door jou beëindigd"}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setTime(clockTime(meeting.endedAt!));
                    setError("");
                    setEditing(true);
                  }}
                >
                  Aanpassen
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {meeting.noActivity && !resume && (
        <Button
          variant="outline"
          className="rounded-full text-brand"
          onClick={() =>
            ops.putMeeting({
              ...meeting,
              held: false,
              endTimeConfirmed: true,
              followUpStatus: "saved",
              run: null,
              wrapUpOpen: false,
              wrapUpDraft: {
                ...initialWrapUpDraft(meeting, ops.meetings),
                noNext: true,
                summary: "Vergadering niet doorgegaan.",
              },
            })
          }
        >
          Niet doorgegaan
        </Button>
      )}
      <Button
        className="shrink-0 rounded-full"
        onClick={() => {
          ops.putMeeting({
            ...meeting,
            endTimeConfirmed: true,
            wrapUpOpen: false,
            wrapUpDraft: {
              ...initialWrapUpDraft(meeting, ops.meetings),
              entry: "later",
              step: resume ? storedStep : 0,
            },
          });
          router.push(`/vergaderingen/${meeting.id}/afronden`);
        }}
      >
        {resume ? "Verder afronden →" : "Afronden →"}
      </Button>
    </section>
  );
}
