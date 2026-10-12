"use client";
import { MeetingProvider } from "@/components/meeting/meeting-context";
import { MeetingHeaderB } from "./meeting-header";
import { OpenActions } from "./open-actions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentEditor } from "./document-editor";
import { ownerOptions } from "@/lib/owners";
import { usePeople, useStore, type Meeting } from "@/lib/store";

export function MeetingDetailB({ meeting }: { meeting: Meeting }) {
  const people = usePeople();
  return <MeetingProvider value={{ meeting, people, owners: ownerOptions(people, meeting.participants, meeting.name, []), now: 0 }}><TooltipProvider>
    <MeetingHeaderB hint={null} onShowHint={() => {}} onInvite={() => useStore.getState().markInvited(meeting.id)} onAddAction={() => useStore.getState().addAction(meeting.id, { what: "Nieuwe actie", ownerId: null, deadline: "" })} />
    <div className="meeting-document">
      <OpenActions meeting={meeting} people={people} />
      <DocumentEditor meeting={meeting} />
    </div>
  </TooltipProvider></MeetingProvider>;
}
