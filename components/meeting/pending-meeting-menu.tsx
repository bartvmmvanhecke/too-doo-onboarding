"use client";
import { useState } from "react";
import { Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useStore, type Meeting } from "@/lib/store";
import { canResume, resumeMeeting } from "@/lib/meeting-schedule";
import { nextOpenItem, agendaItems } from "@/lib/meeting-wrap-up";
import { meetingNow } from "@/lib/meeting-clock";
import { FollowUpPreview } from "./follow-up-preview";
export function PendingMeetingMenu({ meeting, children }: { meeting: Meeting; children?: React.ReactNode }) {
  const [resume, setResume] = useState(false);
  const [preview, setPreview] = useState(false);
  const router = useRouter();
  const allowed = canResume(meeting, meetingNow(meeting));
  const next = nextOpenItem(meeting, null) ?? agendaItems(meeting)[0];
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Meer opties voor vergadering">
            <Ellipsis className="size-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="app-theme">
          <Button variant="ghost" disabled={!allowed} onClick={() => setResume(true)}>
            Vergadering hervatten
          </Button>
          {!allowed && (
            <p className="px-3 text-xs text-ink-3">
              Hervatten kan alleen op dezelfde dag, zolang de opvolging niet verstuurd is.
            </p>
          )}
          <Button variant="ghost" onClick={() => setPreview(true)}>
            Voorbeeld opvolging
          </Button>
          {children}
        </PopoverContent>
      </Popover>
      <Dialog open={resume} onOpenChange={setResume}>
        <DialogContent className="app-theme">
          <DialogTitle>Vergadering hervatten?</DialogTitle>
          <DialogDescription>
            De vergadering loopt dan verder in de vergadermodus, vanaf punt{" "}
            {next ? agendaItems(meeting).indexOf(next) + 1 : 1} ({next?.text ?? "Agenda"}). De klok loopt weer en de
            eindtijd wordt aangepast.
          </DialogDescription>
          <p>Wil je alleen iets rechtzetten? Dat kan hier in de agenda, zonder te hervatten.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setResume(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => {
                useStore.getState().putMeeting(resumeMeeting(meeting, meetingNow(meeting)));
                setResume(false);
              }}
            >
              Hervatten
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <FollowUpPreview
        meeting={meeting}
        open={preview}
        onOpenChange={setPreview}
        onSend={() => {
          useStore.getState().putMeeting({ ...meeting, wrapUpOpen: true });
          router.push(`/vergaderingen/${meeting.id}/afronden`);
        }}
      />
    </>
  );
}
