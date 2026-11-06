"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Check, ChevronUp, Ellipsis, Clock, Coffee, Play, Plus } from "lucide-react";
import { PendingFollowUp } from "./pending-follow-up";
import { isHandled } from "@/lib/meeting-wrap-up";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/avatar";
import { BreakBlock, TopicsBlock } from "@/components/meeting/agenda";
import { InlineText } from "@/components/meeting/bits";
import { EntryPanel } from "@/components/meeting/entries";
import { ItemDialog } from "@/components/meeting/item-dialog";
import { MeetingProvider, useMeetingOps } from "@/components/meeting/meeting-context";
import { agendaMoves } from "@/components/meeting/meeting-detail";
import { OpenActionsBlock } from "@/components/meeting/open-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { allItems, plannedMinutes } from "@/lib/agenda";
import { formatShortDate } from "@/lib/date";
import { formatTime } from "@/lib/time";
import { ownerOptions } from "@/lib/owners";
import { usePeople, useStore, type Meeting } from "@/lib/store";
import { cn } from "@/lib/utils";

type Tab = "agenda" | "decision" | "note" | "action" | "people";
const pill = "inline-flex items-center gap-1.5 rounded-full bg-line-soft px-2.5 py-1 text-xs font-bold text-ink-2";
const addButton = "rounded-full border-brand-tint bg-brand-soft text-brand hover:bg-brand-tint hover:text-brand";

/** Detail vanuit het vergaderoverzicht, met de bestaande agenda- en opslagfuncties. */
export function MeetingOverviewDetail({ meeting }: { meeting: Meeting }) {
  const people = usePeople();
  const user = useStore((s) => s.user);
  const ops = useMeetingOps();
  const [tab, setTab] = useState<Tab>("agenda");
  const pending = !!meeting.endedAt && meeting.followUpStatus === "pending";
  const compactOption = useStore((s) => s.demo.wrapUpCompact);
  const compact = pending && !!compactOption;
  const [infoOpen, setInfoOpen] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [adding, setAdding] = useState<"theme" | "item" | null>(null);
  const [title, setTitle] = useState("");
  const [targetBlock, setTargetBlock] = useState("");
  const [addingAction, setAddingAction] = useState(false);
  const items = allItems(meeting.blocks);
  const topics = meeting.blocks.filter((b) => b.kind === "topics");
  const attendees = people.filter((p) => meeting.participants.includes(p.id));
  const entries = items.flatMap((i) => i.entries);
  const planned = plannedMinutes(meeting.blocks) ?? 0;
  const remaining = meeting.duration - planned;
  const preparation = items.length
    ? Math.round(
        (items.reduce(
          (sum, i) => sum + Number(!!i.ownerIds.length) + Number(i.duration !== null) + Number(!!i.purposes.length),
          0,
        ) /
          (items.length * 3)) *
          100,
      )
    : 0;
  const moves = agendaMoves(meeting, ops);
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "agenda", label: "Agenda", count: items.length },
    { id: "decision", label: "Beslissingen", count: entries.filter((e) => e.kind === "decision").length },
    { id: "note", label: "Notities", count: entries.filter((e) => e.kind === "note").length },
    { id: "action", label: "Acties", count: meeting.actions.length },
    { id: "people", label: "Deelnemers", count: attendees.length },
  ];
  const openAdd = (kind: "theme" | "item") => {
    setTitle("");
    setTargetBlock(topics[0]?.id ?? "");
    setAdding(kind);
  };
  const toggle = (id: string) =>
    setCollapsed((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <MeetingProvider
      value={{ meeting, people, owners: ownerOptions(people, meeting.participants, meeting.name, []), now: 0 }}
    >
      <TooltipProvider>
        <div data-meeting-detail className="flex min-w-0 flex-col gap-6">
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-ink-3 no-underline hover:text-brand"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Terug naar overzicht
          </Link>
          <header className="flex flex-wrap items-center justify-between gap-5 py-2">
            <div className="flex min-w-0 flex-col items-start gap-2">
              {compact ? (
                <span className="rounded-full bg-[var(--wrap-amber-bg)] px-3 py-1 text-sm font-bold text-[var(--wrap-amber-ink)]">
                  Nog af te ronden
                </span>
              ) : (
                <span className={pill}>
                  <CalendarCheck className="size-4" aria-hidden />
                  {meeting.held ? "Afgerond" : "Ingepland"}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="max-w-full text-[36px] leading-tight font-semibold sm:text-[40px]">{meeting.name}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-ink-3">
                  {meeting.date ? formatShortDate(meeting.date) : "Nog niet ingepland"}
                  {meeting.time !== null &&
                    ` · ${formatTime(meeting.time)} – ${formatTime(meeting.time + meeting.duration)}`}
                  {pending &&
                    ` · gehouden · ${Math.round((meeting.endedAt! - (meeting.startedAt ?? meeting.endedAt!)) / 60000)} min`}
                </p>
                {compact && (
                  <>
                    <div className="flex -space-x-1">
                      {attendees.slice(0, 2).map((p) => (
                        <Avatar key={p.id} person={p} size={32} />
                      ))}
                      {attendees.length > 2 && (
                        <span className="flex size-8 items-center justify-center rounded-full bg-line-soft text-xs font-bold">
                          +{attendees.length - 2}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-expanded={infoOpen}
                      onClick={() => setInfoOpen(!infoOpen)}
                      className="min-h-11 text-sm font-bold text-brand"
                    >
                      Details {infoOpen ? "▴" : "▾"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {pending ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Meer opties voor vergadering">
                    <Ellipsis className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="app-theme">
                  <Button variant="ghost" onClick={() => ops.startRun(meeting.id)}>
                    Vergadering hervatten
                  </Button>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-3 font-bold",
                    remaining < 0 ? "text-warning" : "text-success",
                  )}
                >
                  <span className="flex items-center gap-2 text-lg">
                    <Clock className="size-5" aria-hidden />
                    {planned}min / {meeting.duration}min gepland
                  </span>
                  <span
                    className={cn(
                      pill,
                      remaining < 0 ? "bg-warning-bg text-warning" : "bg-success-bg text-success-ink",
                    )}
                  >
                    {Math.abs(remaining)} min {remaining < 0 ? "te veel" : "over"}
                  </span>
                </div>
                {meeting.endedAt && meeting.followUpStatus === "pending" ? (
                  <button
                    type="button"
                    onClick={() => ops.putMeeting({ ...meeting, wrapUpOpen: true })}
                    className="flex min-h-11 items-center gap-2 rounded-full bg-danger px-4 text-sm font-bold text-white hover:bg-danger/90"
                  >
                    <Check className="size-4" aria-hidden />
                    Afronden
                  </button>
                ) : (
                  <Button className="rounded-full" onClick={() => ops.startRun(meeting.id)}>
                    <Play className="size-5" aria-hidden />
                    Start vergadering
                  </Button>
                )}
              </div>
            )}
          </header>

          {infoOpen && !compact && (
            <section aria-label="Vergaderinformatie" className="rounded-2xl border border-line bg-line-soft/30 p-5">
              <h2 className={cn(pill, "mb-4")}>Vergaderinformatie</h2>
              <dl className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1.5fr_1.5fr_2fr_auto]">
                {(
                  [
                    { key: "location", label: "Vestiging", value: meeting.location || user?.company || "—" },
                    { key: "type", label: "Vergadertype", value: meeting.type || "—" },
                    { key: "room", label: "Locatie", value: meeting.room || "—" },
                  ] as const
                ).map((field) => (
                  <div key={field.key} className="min-w-0">
                    <dt className="mb-1.5 text-sm text-ink-3">{field.label}</dt>
                    <dd>
                      <InlineText
                        value={field.value}
                        label={field.label}
                        onSave={(value) => ops.updateDetails(meeting.id, { [field.key]: value })}
                        className="max-w-full text-sm font-bold text-ink-3"
                      />
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="mb-2 text-sm text-ink-3">Deelnemers</dt>
                  <dd className="flex flex-wrap -space-x-1">
                    {attendees.length ? (
                      attendees.map((p) => <Avatar key={p.id} person={p} size={26} className="ring-2 ring-white" />)
                    ) : (
                      <span className="text-sm text-ink-3">Nog geen deelnemers</span>
                    )}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="mb-1.5 text-sm text-ink-3">Vergaderbeschrijving</dt>
                  <dd>
                    <InlineText
                      value={meeting.description || "—"}
                      label="Vergaderbeschrijving"
                      onSave={(description) => ops.updateDetails(meeting.id, { description })}
                      className="max-w-full text-sm font-bold text-ink-3"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1.5 text-sm text-ink-3">Voorbereidingsscore</dt>
                  <dd>
                    <span
                      title="Aandeel ingevulde eigenaars, doelen en tijden van agendapunten"
                      className={cn(pill, "bg-success-bg text-success-ink")}
                    >
                      {preparation}%
                    </span>
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {pending && <PendingFollowUp meeting={meeting} />}
          {!compact && (
            <div className="flex min-w-0 items-center gap-2 border-b border-line pb-2">
              <div role="tablist" aria-label="Vergadering" className="flex min-w-0 flex-1 overflow-x-auto">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    id={`meeting-tab-${t.id}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    aria-controls="meeting-tab-panel"
                    tabIndex={tab === t.id ? 0 : -1}
                    onClick={() => setTab(t.id)}
                    onKeyDown={(e) => {
                      const index = tabs.findIndex((x) => x.id === tab);
                      const next =
                        e.key === "ArrowRight"
                          ? (index + 1) % tabs.length
                          : e.key === "ArrowLeft"
                            ? (index + tabs.length - 1) % tabs.length
                            : e.key === "Home"
                              ? 0
                              : e.key === "End"
                                ? tabs.length - 1
                                : null;
                      if (next !== null) {
                        e.preventDefault();
                        setTab(tabs[next].id);
                        document.getElementById(`meeting-tab-${tabs[next].id}`)?.focus();
                      }
                    }}
                    className={cn(
                      "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-bold",
                      tab === t.id ? "bg-brand-soft text-brand" : "text-ink hover:bg-line-soft",
                    )}
                  >
                    {t.label}
                    {!!t.count && (
                      <span className={cn(pill, "px-2 py-0", tab === t.id && "bg-brand-tint text-brand")}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={infoOpen ? "Vergaderinformatie inklappen" : "Vergaderinformatie uitklappen"}
                aria-expanded={infoOpen}
                onClick={() => setInfoOpen(!infoOpen)}
              >
                <ChevronUp className={cn("size-4", !infoOpen && "rotate-180")} />
              </Button>
            </div>
          )}

          <section
            id="meeting-tab-panel"
            role="tabpanel"
            aria-labelledby={compact ? "pending-agenda-title" : `meeting-tab-${tab}`}
            className="flex min-w-0 flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={compact ? "pending-agenda-title" : undefined} className="text-[30px] font-semibold">
                {tabs.find((t) => t.id === tab)?.label}
              </h2>
              {pending && (
                <p className="text-sm text-ink-3">
                  {items.filter((i) => isHandled(meeting, i.id)).length} van {items.length} voltooid
                </p>
              )}
              {!compact && tab === "agenda" && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className={addButton} onClick={() => openAdd("theme")}>
                    <Plus className="size-5" />
                    Thema toevoegen
                  </Button>
                  <Button variant="outline" className={addButton} onClick={() => openAdd("item")}>
                    <Plus className="size-5" />
                    Agendapunt toevoegen
                  </Button>
                  <Button variant="outline" className={addButton} onClick={() => ops.addBlock(meeting.id, "break")}>
                    <Coffee className="size-5" />
                    Pauze
                  </Button>
                </div>
              )}
            </div>
            {tab === "agenda" && (
              <>
                {!meeting.blocks.length && (
                  <p className="rounded-xl border border-dashed border-line p-6 text-sm text-ink-3">
                    Voeg een thema of agendapunt toe om de agenda klaar te zetten.
                  </p>
                )}
                {meeting.blocks.map((block, index) =>
                  block.kind === "break" ? (
                    <BreakBlock key={block.id} block={block} index={index} moves={moves} />
                  ) : block.kind === "topics" ? (
                    <TopicsBlock
                      key={block.id}
                      block={block}
                      index={index}
                      moves={moves}
                      showBudget
                      expanded={!collapsed.has(block.id)}
                      onToggle={() => toggle(block.id)}
                      onOpenDetails={(item) => setDetailsId(item.id)}
                    />
                  ) : (
                    <OpenActionsBlock
                      key={block.id}
                      block={block}
                      index={index}
                      moves={moves}
                      expanded={!collapsed.has(block.id)}
                      onToggle={() => toggle(block.id)}
                      adding={addingAction}
                      onAddingChange={setAddingAction}
                    />
                  ),
                )}
              </>
            )}
            {(tab === "decision" || tab === "note") && (
              <>
                {!items.length && (
                  <p className="text-sm text-ink-3">
                    Voeg eerst een agendapunt toe om {tab === "decision" ? "beslissingen" : "notities"} vast te leggen.
                  </p>
                )}
                {items.map((item) => (
                  <section key={item.id} className="rounded-xl border border-line bg-white p-4">
                    <h3 className="mb-3 font-bold">{item.text}</h3>
                    <EntryPanel item={item} kind={tab} autoFocus={false} />
                  </section>
                ))}
              </>
            )}
            {tab === "action" && (
              <>
                {!meeting.actions.length && (
                  <p className="text-sm text-ink-3">
                    Nog geen acties. Open een agendapunt om een actie vast te leggen.
                  </p>
                )}
                {meeting.actions.map((action) => (
                  <label
                    key={action.id}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-white px-4"
                  >
                    <input
                      type="checkbox"
                      checked={action.done}
                      onChange={() => ops.toggleAction(meeting.id, action.id)}
                      className="size-4 accent-brand"
                    />
                    <span className={cn("flex-1 text-sm font-semibold", action.done && "line-through text-ink-3")}>
                      {action.what}
                    </span>
                    <span className="text-sm text-ink-3">
                      {people.find((p) => p.id === action.ownerId)?.name}
                      {action.deadline && ` · ${action.deadline}`}
                    </span>
                  </label>
                ))}
              </>
            )}
            {tab === "people" && (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {attendees.length ? (
                  attendees.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
                      <Avatar person={p} size={32} />
                      <span className="text-sm font-semibold">{p.name}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-ink-3">Nog geen deelnemers.</li>
                )}
              </ul>
            )}
          </section>
        </div>
        <ItemDialog item={items.find((i) => i.id === detailsId) ?? null} onClose={() => setDetailsId(null)} />
        <Dialog open={!!adding} onOpenChange={(open) => !open && setAdding(null)}>
          <DialogContent className="app-theme">
            <DialogTitle>{adding === "theme" ? "Thema toevoegen" : "Agendapunt toevoegen"}</DialogTitle>
            <DialogDescription>
              {adding === "theme" ? "Groepeer agendapunten onder een thema." : "Wat wil je bespreken?"}
            </DialogDescription>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim()) return;
                if (adding === "theme") {
                  const id = ops.addBlock(meeting.id, "topics");
                  ops.updateBlock(meeting.id, id, { title: title.trim() });
                } else {
                  const id = targetBlock || ops.addBlock(meeting.id, "topics");
                  ops.addAgendaItem(meeting.id, id, title.trim());
                }
                setAdding(null);
              }}
            >
              <label className="text-sm font-semibold">
                Titel
                <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2" />
              </label>
              {adding === "item" && !!topics.length && (
                <label className="text-sm font-semibold">
                  Thema
                  <select
                    value={targetBlock}
                    onChange={(e) => setTargetBlock(e.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3"
                  >
                    {topics.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Button type="submit" disabled={!title.trim()}>
                Toevoegen
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </MeetingProvider>
  );
}
