"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Coffee, LayoutList, ListChecks, Plus } from "lucide-react";
import { useAppUi } from "@/components/app/app-ui";
import { Checklist } from "@/components/app/checklist";
import { InviteDialog } from "@/components/app/invite-dialog";
import { BreakBlock, TopicsBlock, type AgendaMoves } from "@/components/meeting/agenda";
import { icon, menuItem, STROKE } from "@/components/meeting/bits";
import { ItemDialog } from "@/components/meeting/item-dialog";
import { MeetingProvider, useNow } from "@/components/meeting/meeting-context";
import { MeetingHeader } from "@/components/meeting/meeting-header";
import { OpenActionsBlock } from "@/components/meeting/open-actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { allItems, type AgendaBlock, type AgendaItem } from "@/lib/agenda";
import { weekdayLong } from "@/lib/date";
import { USER_PERSON_ID, type Person } from "@/lib/mock-data";
import { ownerOptions } from "@/lib/owners";
import { findPerson, usePeople, useStore, type Meeting } from "@/lib/store";
import { cn, joinNl, upperFirst } from "@/lib/utils";

/** Zet de focus terug op de grip na verplaatsen (React kan het element herplaatsen). */
function refocusGrip(id: string) {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-grip="${id}"]`)?.focus());
}

function agendaMoves(meeting: Meeting): AgendaMoves {
  const { moveItem, moveBlock } = useStore.getState();
  const topics = meeting.blocks.filter((b) => b.kind === "topics");
  const locate = (itemId: string) => {
    const bi = topics.findIndex((b) => b.items.some((i) => i.id === itemId));
    return { bi, ii: bi < 0 ? -1 : topics[bi].items.findIndex((i) => i.id === itemId) };
  };
  return {
    moveItemBy: (itemId, delta) => {
      const { bi, ii } = locate(itemId);
      if (bi < 0) return;
      const target = ii + delta;
      if (target >= 0 && target < topics[bi].items.length) moveItem(meeting.id, itemId, topics[bi].id, target);
      // Over de rand: naar het einde van het vorige of het begin van het volgende blok.
      else if (delta < 0 && bi > 0) moveItem(meeting.id, itemId, topics[bi - 1].id, topics[bi - 1].items.length);
      else if (delta > 0 && bi < topics.length - 1) moveItem(meeting.id, itemId, topics[bi + 1].id, 0);
      refocusGrip(itemId);
    },
    dropItem: (itemId, blockId, index) => {
      const { bi, ii } = locate(itemId);
      const same = bi >= 0 && topics[bi].id === blockId;
      moveItem(meeting.id, itemId, blockId, same && ii < index ? index - 1 : index);
    },
    moveBlockBy: (blockId, delta) => {
      const i = meeting.blocks.findIndex((b) => b.id === blockId);
      moveBlock(meeting.id, blockId, i + delta);
      refocusGrip(blockId);
    },
    dropBlock: (blockId, index) => {
      const i = meeting.blocks.findIndex((b) => b.id === blockId);
      moveBlock(meeting.id, blockId, i < index ? index - 1 : index);
    },
  };
}

/** "+ Blok of pauze toevoegen": één knop met een kleine keuze. */
function AddBlockButton({ meeting }: { meeting: Meeting }) {
  const addBlock = useStore((s) => s.addBlock);
  const [open, setOpen] = useState(false);
  const hasActions = meeting.blocks.some((b) => b.kind === "actions");
  const add = (kind: AgendaBlock["kind"]) => {
    const id = addBlock(meeting.id, kind);
    setOpen(false);
    if (kind === "topics") requestAnimationFrame(() => document.getElementById(`add-${id}`)?.click());
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="self-start font-semibold text-ink-3">
          <Plus className={icon} strokeWidth={STROKE} aria-hidden />
          Blok of pauze toevoegen
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="app-theme w-60">
        <button type="button" className={menuItem} onClick={() => add("topics")}>
          <LayoutList className={cn(icon, "text-ink-subtle")} strokeWidth={STROKE} aria-hidden />
          Blok
        </button>
        <button type="button" className={menuItem} onClick={() => add("break")}>
          <Coffee className={cn(icon, "text-ink-subtle")} strokeWidth={STROKE} aria-hidden />
          Pauze
        </button>
        {!hasActions && (
          <button type="button" className={menuItem} onClick={() => add("actions")}>
            <ListChecks className={cn(icon, "text-ink-subtle")} strokeWidth={STROKE} aria-hidden />
            Openstaande acties
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Detailpagina van een vergadering: agenda, openstaande acties en de lopende vergadering. */
export function MeetingScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const meeting = useStore((s) => s.meetings.find((m) => m.id === id));
  const moreAdded = useStore((s) => s.moreMeetingsAdded);
  const extraPeople = useStore((s) => s.extraPeople);
  const people = usePeople();
  const { setAddMeetingsOpen } = useAppUi();
  const now = useNow(!!meeting?.run);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addingAction, setAddingAction] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  useEffect(() => {
    if (!meeting) router.replace("/app");
  }, [meeting, router]);

  if (!meeting) return null;

  const moves = agendaMoves(meeting);
  const run = meeting.run;
  const owners = ownerOptions(
    people,
    meeting.participants,
    meeting.name,
    extraPeople.map((p) => p.id),
  );
  const items = allItems(meeting.blocks);
  const firstTopics = meeting.blocks.find((b) => b.kind === "topics");
  const isFirst = !run && !meeting.held && meeting.actions.length === 0 && items.length === 0;

  // Standaard open; tijdens de vergadering enkel het blok dat aan de beurt is.
  // Zelf in- of uitklappen geldt tot de volgende stap van de vergadering.
  const scope = run ? (run.currentId ?? "einde") : "voor";
  const key = (blockId: string) => `${scope}:${blockId}`;
  const isExpanded = (b: AgendaBlock) =>
    expanded[key(b.id)] ?? (!run || b.id === run.currentId || b.items.some((i) => i.id === run.currentId));
  const toggle = (b: AgendaBlock) => setExpanded((e) => ({ ...e, [key(b.id)]: !isExpanded(b) }));

  // Hint: alleen als er iets ontbreekt.
  const ownerless = items.filter((i) => i.ownerIds.length === 0);
  const hint = ownerless.length
    ? `${ownerless.length} ${ownerless.length === 1 ? "agendapunt heeft" : "agendapunten hebben"} nog geen eigenaar`
    : null;
  const showHint = () => {
    const item = ownerless[0];
    const block = meeting.blocks.find((b) => b.items.some((i) => i.id === item.id));
    if (block) setExpanded((e) => ({ ...e, [key(block.id)]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`owner-${item.id}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
    });
  };

  const actionsBlock = meeting.blocks.find((b) => b.kind === "actions");
  const startAddingAction = () => {
    if (actionsBlock) setExpanded((e) => ({ ...e, [key(actionsBlock.id)]: true }));
    setAddingAction(true);
  };

  // Uit te nodigen: eigenaars van acties (behalve jijzelf), anders de deelnemers.
  const ownerIds = [
    ...new Set(meeting.actions.map((a) => a.ownerId).filter((x): x is string => !!x && x !== USER_PERSON_ID)),
  ];
  const inviteIds = ownerIds.length ? ownerIds : meeting.participants.filter((p) => p !== USER_PERSON_ID);
  const invitees = inviteIds.map((pid) => findPerson(people, pid)).filter((p): p is Person => !!p);
  const inviteLabel = ownerIds.length
    ? `${joinNl(invitees.map((p) => p.name.split(" ")[0]))} uitnodigen`
    : "Je collega's uitnodigen";

  const checklist = [
    { id: "eerste", label: "Je eerste vergadering klaarzetten", done: true },
    {
      id: "andere",
      label: "Je andere vaste vergaderingen toevoegen",
      done: moreAdded,
      meta: "1 min",
      highlight: true,
      onSelect: () => setAddMeetingsOpen(true),
    },
    { id: "uitnodigen", label: inviteLabel, done: meeting.invited, onSelect: () => setInviteOpen(true) },
    {
      id: "houden",
      label: meeting.date ? `${upperFirst(weekdayLong(meeting.date))} de vergadering houden` : "De vergadering houden",
      done: meeting.held,
    },
  ];
  const showChecklist = !run && checklist.some((c) => !c.done);
  const detailsItem: AgendaItem | null = items.find((i) => i.id === detailsId) ?? null;

  return (
    <MeetingProvider value={{ meeting, people, owners, now }}>
      <TooltipProvider>
        <MeetingHeader
          hint={run ? null : hint}
          onShowHint={showHint}
          onAddAction={startAddingAction}
          onInvite={() => setInviteOpen(true)}
        />

        {meeting.blocks.map((block, index) => {
          if (block.kind === "break") return <BreakBlock key={block.id} block={block} index={index} moves={moves} />;
          if (block.kind === "actions")
            return (
              <OpenActionsBlock
                key={block.id}
                block={block}
                index={index}
                moves={moves}
                expanded={isExpanded(block)}
                onToggle={() => toggle(block)}
                adding={addingAction}
                onAddingChange={setAddingAction}
              />
            );
          return (
            <TopicsBlock
              key={block.id}
              block={block}
              index={index}
              moves={moves}
              expanded={isExpanded(block)}
              onToggle={() => toggle(block)}
              focusInput={isFirst && block === firstTopics}
              onOpenDetails={(item) => setDetailsId(item.id)}
            />
          );
        })}

        <AddBlockButton meeting={meeting} />

        {/* Onderaan rechts, als laatste: verdwijnt zonder dat de inhoud erboven verspringt. */}
        {showChecklist && (
          <Checklist collapsible items={checklist} className="mt-4 w-full max-w-[340px] flex-none self-end" />
        )}

        <ItemDialog item={detailsItem} onClose={() => setDetailsId(null)} />
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          people={invitees}
          onInvited={() => useStore.getState().markInvited(meeting.id)}
          onAddAction={startAddingAction}
        />
      </TooltipProvider>
    </MeetingProvider>
  );
}
