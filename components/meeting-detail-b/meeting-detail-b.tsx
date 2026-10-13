"use client";
import { ReviewBanner, ReviewHint } from "@/components/probeer/suggestion-review";
import { useState } from "react";
import { toast } from "sonner";
import { InviteDialog } from "@/components/app/invite-dialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntryFields } from "./entry-fields";
import {
  MeetingOpsProvider,
  MeetingProvider,
  type MeetingOps,
  type TrialView,
} from "@/components/meeting/meeting-context";
import { MeetingHeaderB } from "./meeting-header";
import { OpenActions } from "./open-actions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentEditor } from "./document-editor";
import { ownerOptions } from "@/lib/owners";
import type { Person } from "@/lib/mock-data";
import { usePeople, useStore, type Meeting } from "@/lib/store";

export function MeetingDetailB({
  meeting,
  trial,
}: {
  meeting: Meeting;
  trial?: { view: TrialView; ops: MeetingOps; people: Person[]; getCurrentMeeting: () => Meeting };
}) {
  const appPeople = usePeople();
  const people = trial?.people ?? appPeople;
  const [invite, setInvite] = useState(false);
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState({ what: "", ownerId: null as string | null, deadline: "" });
  function addAction() {
    setAction({ what: "", ownerId: null, deadline: "" });
    setAdding(true);
  }
  return (
    <MeetingOpsProvider value={trial?.ops ?? null}>
      <MeetingProvider
        value={{
          meeting,
          people,
          owners: ownerOptions(people, meeting.participants, meeting.name, []),
          now: 0,
          trial: trial?.view,
          getCurrentMeeting: trial?.getCurrentMeeting,
        }}
      >
        <TooltipProvider>
          <ReviewBanner />
          <MeetingHeaderB hint={null} onShowHint={() => {}} onInvite={() => setInvite(true)} onAddAction={addAction} />
          {!trial && <ReviewHint />}
          <div className="meeting-document">
            <OpenActions meeting={meeting} people={people} />
            <DocumentEditor meeting={meeting} />
          </div>
          {!trial && (
            <InviteDialog
              open={invite}
              onOpenChange={setInvite}
              people={people.filter((p) => meeting.participants.includes(p.id))}
              onInvited={() => useStore.getState().markInvited(meeting.id)}
              onAddAction={addAction}
            />
          )}
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogContent className="app-theme meeting-document">
              <DialogTitle>Actie toevoegen</DialogTitle>
              <DialogDescription>Wie doet wat tegen wanneer?</DialogDescription>
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!action.what.trim()) return;
                  useStore.getState().addAction(meeting.id, { ...action, what: action.what.trim() });
                  setAdding(false);
                  toast("Actie toegevoegd");
                }}
              >
                <label className="text-sm">
                  Titel
                  <input
                    autoFocus
                    aria-label="Titel actie"
                    className="mt-1 min-h-11 w-full rounded-lg border border-line px-3"
                    value={action.what}
                    onChange={(e) => setAction((a) => ({ ...a, what: e.target.value }))}
                  />
                </label>
                <div className="flex gap-2">
                  <EntryFields
                    ownerId={action.ownerId}
                    date={action.deadline}
                    people={people.filter((p) => meeting.participants.includes(p.id))}
                    update={(p) =>
                      setAction((a) => ({
                        ...a,
                        ownerId: p.ownerId !== undefined ? p.ownerId : a.ownerId,
                        deadline: p.date ?? a.deadline,
                      }))
                    }
                  />
                </div>
                <Button type="submit" size="sm" disabled={!action.what.trim()}>
                  Actie toevoegen
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </TooltipProvider>
      </MeetingProvider>
    </MeetingOpsProvider>
  );
}
