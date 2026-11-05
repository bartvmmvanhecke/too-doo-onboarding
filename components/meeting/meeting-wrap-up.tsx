"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, usePeople, type Meeting } from "@/lib/store";
import { actualDuration, carryForward, agendaItems, clockTime, nextInSeries, othersOpen } from "@/lib/meeting-wrap-up";
import { formatShortDate } from "@/lib/date";
import type { EntryKind } from "@/lib/agenda";

export function MeetingWrapUp({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const people = usePeople();
  const h1 = useRef<HTMLHeadingElement>(null);
  const sent = meeting.followUpStatus === "sent";
  useEffect(() => { h1.current?.focus(); }, [sent]);
  const next = nextInSeries(meeting, ops.meetings);
  const open = othersOpen(meeting, null);
  const entries = agendaItems(meeting).flatMap(i => i.entries.map(e => ({...e,itemId:i.id})));
  const decisions = entries.filter(e => e.kind === "decision");
  const actions = meeting.actions;
  const unowned = actions.filter(a => !a.ownerId).length;
  const participants = meeting.attendance?.filter(p => p.present) ?? meeting.participants.map(personId => ({personId, name: people.find(p=>p.id === personId)?.name ?? personId}));
  const [text,setText] = useState("");
  const [kind,setKind] = useState<EntryKind>("action");
  const minutes = Math.round((actualDuration(meeting) ?? 0) / 60000);
  const carry = open.filter(i => i.carry !== "drop");
  const back = () => {
    if (meeting.endReason === "auto") ops.putMeeting({...meeting,wrapUpOpen:false});
    else ops.putMeeting({...meeting,endedAt:undefined,endReason:undefined,wrapUpOpen:false,minimized:false,blocks:meeting.blocks.map(b=>({...b,items:b.items.map(i=>i.id === meeting.run?.currentId ? {...i,runStatus:"open",handledAt:undefined} : i)}))});
  };
  const send = () => {
    // TODO(api): send participant-specific follow-up through the mail API; local prototype records intent only.
    const latest = useStore.getState().meetings.find(m=>m.id === meeting.id)!;
    const forwarded = carryForward(latest, useStore.getState().meetings);
    // One persisted transaction: transferring points and recording follow-up cannot diverge.
    useStore.setState({meetings: forwarded.map(m=>m.id === latest.id ? {...latest,followUpStatus:"sent",held:true,run:null,minimized:false} : m)});
  };
  const addEntry = () => {
    if (!text.trim()) return;
    const item = agendaItems(meeting).find(i=>i.id === meeting.run?.currentId) ?? agendaItems(meeting)[0];
    if (item) ops.addEntry(meeting.id,item.id,{kind,text:text.trim(),ownerId:null,date:""});
    else ops.addAction(meeting.id,{what:text.trim(),ownerId:null,deadline:""});
    setText("");
  };
  return <div className="app-theme fixed inset-0 z-40 overflow-y-auto bg-app-shell p-4 sm:p-10">
    <main className="mx-auto max-w-[760px] rounded-[24px] bg-app p-5 shadow-xl sm:p-8">
      {sent ? <>
        <CheckCircle2 aria-hidden className="mb-4 size-12 text-[var(--wrap-handled)]" />
        <h1 ref={h1} tabIndex={-1} className="text-3xl font-bold outline-none">Vergadering afgerond</h1>
        <p className="mt-3">Opvolging verstuurd naar {participants.length} deelnemers.</p>
        {carry.length > 0 && <p className="mt-2">Punt {carry.map(i=>agendaItems(meeting).indexOf(i)+1).join(" en ")} {next?.date ? `staan op de agenda van ${formatShortDate(next.date)}.` : "zijn bewaard voor later."}</p>}
        <p className="my-5">Duur vastgelegd: {minutes} min.</p>
        <Button onClick={()=>ops.putMeeting({...meeting,wrapUpOpen:false})}>Naar vergadering</Button>
      </> : <>
        <p className="text-sm text-ink-3">{meeting.name} · {clockTime(meeting.endedAt ?? 0)} afgesloten · {minutes} min (gepland {meeting.duration})</p>
        <h1 ref={h1} tabIndex={-1} className="mt-3 text-3xl font-bold outline-none">Vergadering afronden</h1>
        <p className="mt-2 mb-6 text-ink-2">Check de opvolging. Na verzenden krijgt elke deelnemer zijn acties en beslissingen.</p>
        {open.length > 0 && <section className="mb-4 rounded-2xl border border-line bg-white p-4">
          <h2 className="font-bold">Niet behandeld ({open.length})</h2><p className="mt-1 mb-4 text-sm text-ink-3">Standaard schuiven ze door naar de volgende vergadering, zodat niets stilletjes verdwijnt.</p>
          {open.map(i=><div key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-3">
            <span>{agendaItems(meeting).indexOf(i)+1}. {i.text}</span>
            <div role="group" aria-label={`Opvolging voor ${i.text}`} className="flex min-h-11 items-center gap-1 rounded-lg border border-line p-1">
              {(["next","drop"] as const).map(value=><button key={value} type="button" aria-pressed={(i.carry ?? "next") === value} onClick={()=>ops.updateItem(meeting.id,i.id,{carry:value})} className="min-h-9 rounded-md px-3 text-sm aria-pressed:bg-brand-soft aria-pressed:font-bold aria-pressed:text-brand">{value === "drop" ? "Laten vallen" : next?.date ? `Naar ${formatShortDate(next.date)}` : "Bewaren voor later"}</button>)}
            </div>
          </div>)}
        </section>}
        {decisions.length === 0 && actions.length === 0 ? <section className="mb-4 rounded-2xl border border-line bg-white p-4">
          <h2 className="font-bold">Geen acties vastgelegd</h2><p className="my-2 text-sm">Iets vergeten? Voeg het nu nog toe.</p>
          <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();addEntry();}}>
            <select aria-label="Soort vastlegging" value={kind} onChange={e=>setKind(e.target.value as EntryKind)} className="min-h-11 rounded-lg border border-line px-2"><option value="action">Actie</option><option value="decision">Beslissing</option><option value="note">Notitie</option></select>
            <input aria-label="Omschrijving" value={text} onChange={e=>setText(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-line px-3" placeholder="Voeg iets toe…" /><Button type="submit" size="sm">Toevoegen</Button>
          </form>
        </section> : <>
          <section className="mb-4 rounded-2xl border border-line bg-white p-4"><h2 className="mb-3 font-bold">Beslissingen ({decisions.length})</h2>
            {decisions.map(e=><div key={e.id} className="flex flex-wrap justify-between gap-3 border-t border-line py-3 text-sm"><span>{e.text}</span><span className="text-ink-3">{participants.find(p=>p.personId === e.ownerId)?.name}{e.date && ` · uitvoeren tegen ${e.date}`}</span></div>)}
          </section>
          <section className="mb-4 rounded-2xl border border-line bg-white p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Acties ({actions.length})</h2>{unowned > 0 && <span className="rounded-full bg-[var(--wrap-amber-bg)] px-3 py-1 text-sm text-[var(--wrap-amber-ink)]">{unowned} actie(s) zonder eigenaar</span>}</div>
            {actions.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3 text-sm"><span className="flex-1">{a.what}</span>
              <select aria-label={`Eigenaar voor ${a.what}`} value={a.ownerId ?? ""} onChange={e=>{ops.assignOwner(meeting.id,a.id,e.target.value);const entry=entries.find(v=>v.actionId===a.id);if(entry) ops.updateEntry(meeting.id,entry.itemId,entry.id,{ownerId:e.target.value || null});}} className={`min-h-11 rounded-lg border px-3 ${a.ownerId ? "border-line" : "border-[var(--wrap-amber-ink)]"}`}><option value="">Eigenaar</option>{participants.map(p=><option key={p.personId} value={p.personId}>{p.name}</option>)}</select>
              <span className="text-ink-3">{a.deadline}</span>
            </div>)}
          </section>
        </>}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-3">Opvolging gaat naar {participants.length} deelnemers</p><Button variant="outline" size="sm" onClick={back}>Terug naar vergadering</Button><Button size="sm" onClick={send}>Rond af &amp; verstuur opvolging</Button></footer>
      </>}
    </main>
  </div>;
}
