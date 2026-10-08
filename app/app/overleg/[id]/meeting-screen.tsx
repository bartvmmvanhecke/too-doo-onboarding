"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ActionMeta } from "@/components/action-item";
import { useAppUi } from "@/components/app/app-ui";
import { Checklist } from "@/components/app/checklist";
import { InviteDialog } from "@/components/app/invite-dialog";
import { ActionRow, ActionRowHeader, type ActionRowValue } from "@/components/onboarding/action-row";
import { Button } from "@/components/ui/button";
import { weekdayLong } from "@/lib/date";
import { scheduleLine } from "@/lib/meeting";
import { USER_PERSON_ID, type Person } from "@/lib/mock-data";
import { ownerOptions } from "@/lib/owners";
import { findPerson, usePeople, useStore, type Meeting } from "@/lib/store";
import { cn, inSentence, joinNl, upperFirst } from "@/lib/utils";

const card = "flex flex-col rounded-[14px] border border-line-soft bg-white px-5 py-[18px]";
const emptyRow: ActionRowValue = { what: "", ownerId: null, ownerText: "", deadline: "" };

function welcomeText(m: Meeting): string {
  const open = m.actions.filter((a) => !a.done).length;
  const when = m.date ? weekdayLong(m.date) : "op het volgende overleg";
  const intro = `Je ${inSentence(m.name)} staat klaar.`;
  if (open === 0) return `${intro} Noteer je acties tijdens het overleg.`;
  if (open === 1) return `${intro} Je 1 openstaande actie komt ${when} vanzelf aan bod.`;
  return `${intro} Je ${open} openstaande acties komen ${when} vanzelf aan bod.`;
}

/** Scherm 4 · Landen in het overleg (SPEC.md §3.8). */
export function MeetingScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const meeting = useStore((s) => s.meetings.find((m) => m.id === id));
  const moreAdded = useStore((s) => s.moreMeetingsAdded);
  const extraPeople = useStore((s) => s.extraPeople);
  const store = useStore.getState;
  const people = usePeople();
  const { setAddMeetingsOpen } = useAppUi();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ActionRowValue>(emptyRow);
  const [draftError, setDraftError] = useState(false);
  const [agendaText, setAgendaText] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!meeting) router.replace("/app");
  }, [meeting, router]);

  if (!meeting) return null;

  const owners = ownerOptions(people, meeting.participants, meeting.name, extraPeople.map((p) => p.id));

  // Uit te nodigen: eigenaars van acties (behalve jijzelf), anders de deelnemers.
  const ownerIds = [...new Set(meeting.actions.map((a) => a.ownerId).filter((x): x is string => !!x && x !== USER_PERSON_ID))];
  const inviteIds = ownerIds.length ? ownerIds : meeting.participants.filter((p) => p !== USER_PERSON_ID);
  const invitees = inviteIds.map((pid) => findPerson(people, pid)).filter((p): p is Person => !!p);
  const inviteLabel = ownerIds.length
    ? `${joinNl(invitees.map((p) => p.name.split(" ")[0]))} uitnodigen`
    : "Je collega's uitnodigen";

  const startAdding = () => {
    setAdding(true);
    setDraftError(false);
  };

  const saveAction = () => {
    if (!draft.what.trim()) {
      setDraftError(true);
      return;
    }
    let ownerId = draft.ownerId;
    if (!ownerId && draft.ownerText.trim()) ownerId = store().addPerson(draft.ownerText).id;
    store().addAction(meeting.id, { what: draft.what.trim(), ownerId, deadline: draft.deadline.trim() });
    setDraft(emptyRow);
    setAdding(false);
    setDraftError(false);
    toast("Actie toegevoegd");
    requestAnimationFrame(() => addButtonRef.current?.focus());
  };

  const cancelAction = () => {
    setDraft(emptyRow);
    setAdding(false);
    setDraftError(false);
    requestAnimationFrame(() => addButtonRef.current?.focus());
  };

  const startMeeting = () => {
    store().markHeld(meeting.id);
    toast("Overleg gestart");
  };

  return (
    <>
      {meeting.showWelcome && (
        <div role="status" className="flex items-center gap-3 rounded-xl bg-success-bg py-1 pr-1 pl-[18px] text-[15px] font-bold text-success-ink">
          <Check className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="flex-1 py-2.5">{welcomeText(meeting)}</span>
          <button
            type="button"
            aria-label="Melding sluiten"
            onClick={() => store().dismissWelcome(meeting.id)}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-black/5"
          >
            <X className="size-4" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/app" className="inline-flex min-h-11 items-center text-sm font-semibold">
            ← Alle vergaderingen
          </Link>
          <h1 className="mt-0.5 mb-1 text-[32px] font-extrabold">{meeting.name}</h1>
          <p className="text-[15px] text-ink-2">{scheduleLine(meeting, { participants: meeting.participants.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button ref={addButtonRef} variant="outline" size="md" onClick={startAdding} aria-expanded={adding}>
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            Actie
          </Button>
          <Button size="md" onClick={startMeeting}>
            <Play className="size-4 fill-white" aria-hidden />
            Start overleg
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-label="Agenda" className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
          <div className={cn(card, "gap-3")}>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="flex-1 text-[17px] font-extrabold">Openstaande acties</h2>
              <span className="text-[13px] font-semibold text-ink-3">komen vanzelf terug tot ze af zijn</span>
            </div>
            {meeting.actions.length === 0 && !adding && (
              <p className="border-t border-line-faint pt-3 text-sm text-ink-3">
                Nog geen openstaande acties. Noteer er een met &quot;+ Actie&quot;.
              </p>
            )}
            {meeting.actions.length > 0 && (
              <ul className="flex flex-col">
                {meeting.actions.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 border-t border-line-faint py-1">
                    <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={a.done}
                        onChange={() => store().toggleAction(meeting.id, a.id)}
                        aria-label={`${a.what} afvinken`}
                        className="m-0 size-[18px] shrink-0 accent-brand"
                      />
                      <span className={cn("flex-1 text-[15px] font-semibold", a.done && "text-ink-3 line-through")}>{a.what}</span>
                    </label>
                    <ActionMeta owner={findPerson(people, a.ownerId)} deadline={a.deadline} emptyDeadline="geen deadline" size={28} />
                  </li>
                ))}
              </ul>
            )}
            {adding && (
              <div
                role="group"
                aria-label="Nieuwe actie"
                className="flex flex-col gap-2.5 border-t border-line-faint pt-3"
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancelAction();
                }}
              >
                <ActionRowHeader />
                <ActionRow
                  index={meeting.actions.length}
                  value={draft}
                  onChange={(patch) => {
                    setDraft((d) => ({ ...d, ...patch }));
                    if (patch.what) setDraftError(false);
                  }}
                  owners={owners}
                  people={people}
                  onAddPerson={(t) => store().addPerson(t)}
                  whatPlaceholder="Wat moet er gebeuren?"
                  autoFocus
                  onEnter={saveAction}
                />
                {draftError && <p className="text-[13px] font-bold text-danger">Beschrijf eerst wat er moet gebeuren.</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={saveAction}>
                    Actie opslaan
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelAction}>
                    Annuleren
                  </Button>
                  <span className="text-[13px] text-ink-3">of druk Enter</span>
                </div>
              </div>
            )}
          </div>

          <div className={cn(card, "gap-2.5")}>
            <h2 className="text-[17px] font-extrabold">Lopende zaken</h2>
            {meeting.agendaItems.length > 0 && (
              <ul className="flex flex-col gap-2">
                {meeting.agendaItems.map((item) => (
                  <li key={item.id} className="rounded-[10px] border border-line-faint px-3.5 py-3 text-[15px] font-semibold">
                    {item.text}
                  </li>
                ))}
              </ul>
            )}
            <input
              type="text"
              aria-label="Agendapunt toevoegen"
              placeholder="+ Typ een agendapunt en druk Enter"
              value={agendaText}
              onChange={(e) => setAgendaText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && agendaText.trim()) {
                  e.preventDefault();
                  store().addAgendaItem(meeting.id, agendaText.trim());
                  setAgendaText("");
                }
              }}
              className="min-h-12 rounded-[10px] border border-dashed border-checkbox bg-surface-muted px-3.5 py-3 text-[15px] text-ink outline-none focus-visible:border-solid focus-visible:border-brand focus-visible:outline-none"
            />
          </div>

          <div className={cn(card, "gap-2.5")}>
            <h2 className="text-[17px] font-extrabold">Varia</h2>
            <p className="text-sm text-ink-3">Wat onverwacht ter sprake komt. Ook hier kun je meteen een actie noteren.</p>
          </div>
        </section>

        <Checklist
          items={[
            { id: "eerste", label: "Eerste overleg met acties", done: true },
            {
              id: "andere",
              label: "Je andere vaste overlegmomenten toevoegen",
              done: moreAdded,
              meta: "1 min",
              highlight: true,
              onSelect: () => setAddMeetingsOpen(true),
            },
            { id: "uitnodigen", label: inviteLabel, done: meeting.invited, onSelect: () => setInviteOpen(true) },
            {
              id: "houden",
              label: meeting.date ? `${upperFirst(weekdayLong(meeting.date))} het overleg houden` : "Het overleg houden",
              done: meeting.held,
            },
          ]}
        />
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        people={invitees}
        onInvited={() => store().markInvited(meeting.id)}
        onAddAction={startAdding}
      />
    </>
  );
}
