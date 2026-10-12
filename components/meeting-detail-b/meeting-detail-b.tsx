"use client";
import { MeetingProvider } from "@/components/meeting/meeting-context";
import { MeetingHeaderB } from "./meeting-header";
import { OpenActions } from "./open-actions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { blockDuration, PURPOSES } from "@/lib/agenda";
import { ownerOptions } from "@/lib/owners";
import { usePeople, useStore, type Meeting } from "@/lib/store";

export function MeetingDetailB({ meeting }: { meeting: Meeting }) {
  const people = usePeople();
  return <MeetingProvider value={{ meeting, people, owners: ownerOptions(people, meeting.participants, meeting.name, []), now: 0 }}><TooltipProvider>
    <MeetingHeaderB hint={null} onShowHint={() => {}} onInvite={() => useStore.getState().markInvited(meeting.id)} onAddAction={() => useStore.getState().addAction(meeting.id, { what: "Nieuwe actie", ownerId: null, deadline: "" })} />
    <div className="meeting-document">
      <OpenActions meeting={meeting} people={people} />
      {meeting.blocks.filter((b) => b.kind !== "actions").map((b) => <section key={b.id} className="mb-5">
        {b.kind === "break" ? <div className="flex items-center gap-3 text-xs text-ink-3"><hr className="flex-1 border-line" />Pauze · {b.duration} min<hr className="flex-1 border-line" /></div> : <>
          {b.title && <h2 className="mb-2 text-lg font-semibold">{b.title}<span className="float-right text-xs text-ink-3">{blockDuration(b) || ""}</span></h2>}
          {b.items.map((i) => <div key={i.id} className="document-row flex items-center gap-2 text-sm"><span>•</span><span className="flex-1">{i.text}</span>{i.purposes.map((p) => <span key={p} className="text-xs text-brand">{PURPOSES.find((x) => x.value === p)?.label}</span>)}{i.duration && <span className="text-xs text-ink-3">{i.duration} min</span>}</div>)}
        </>}
      </section>)}
    </div>
  </TooltipProvider></MeetingProvider>;
}
