"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { ArrowRight, ChevronDown, CircleCheck, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import {
  card,
  DurationEditor,
  DurationPicker,
  Grip,
  icon,
  iconButton,
  InlineText,
  Kbd,
  menuItem,
  OwnerButton,
  OwnersPicker,
  ProgressBar,
  PurposePicker,
  reveal,
  STROKE,
} from "@/components/meeting/bits";
import { EntryColumns, EntryForm, EntryRow, ItemEditButton } from "@/components/meeting/entries";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  blockDuration,
  ENTRY_KINDS,
  formatClock,
  plural,
  type AgendaBlock,
  type AgendaItem,
  type EntryKind,
} from "@/lib/agenda";
import { findPerson, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ITEM_TYPE = "application/x-too-doo-item";
const BLOCK_TYPE = "application/x-too-doo-block";

/** Verplaatsen met slepen of pijltjestoetsen; de vergaderpagina voert het uit. */
export interface AgendaMoves {
  moveItemBy: (itemId: string, delta: -1 | 1) => void;
  dropItem: (itemId: string, blockId: string, index: number) => void;
  moveBlockBy: (blockId: string, delta: -1 | 1) => void;
  dropBlock: (blockId: string, index: number) => void;
}

function dropBefore(e: DragEvent<HTMLElement>): boolean {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientY < r.top + r.height / 2;
}

/* ---------- Agendapunt ---------- */

function ItemStatus({ status }: { status: "done" | "todo" | "postponed" }) {
  if (status === "done")
    return (
      <span role="img" aria-label="Afgerond" className="flex shrink-0">
        <CircleCheck className="size-[18px] text-success" strokeWidth={STROKE} aria-hidden />
      </span>
    );
  if (status === "postponed")
    return (
      <ArrowRight
        className="size-4 shrink-0 text-ink-subtle"
        strokeWidth={STROKE}
        aria-label="Naar volgende vergadering"
      />
    );
  return (
    <span
      role="img"
      aria-label="Nog te doen"
      className="size-4 shrink-0 rounded-full border-[1.6px] border-ink-subtle/60"
    />
  );
}

export function AgendaItemRow({
  item,
  block,
  index,
  moves,
  onOpenDetails,
}: {
  item: AgendaItem;
  block: AgendaBlock;
  index: number;
  moves: AgendaMoves;
  onOpenDetails: (item: AgendaItem) => void;
}) {
  const { meeting } = useMeeting();
  const updateItem = useStore((s) => s.updateItem);
  const [armed, setArmed] = useState(false);
  const [dropAt, setDropAt] = useState<"before" | "after" | null>(null);
  const run = meeting.run;
  const status = run
    ? run.doneIds.includes(item.id)
      ? "done"
      : run.postponedIds.includes(item.id)
        ? "postponed"
        : "todo"
    : null;
  const actual = run?.actuals[item.id];
  const update = (patch: Partial<AgendaItem>) => updateItem(meeting.id, item.id, patch);

  return (
    <li
      draggable={armed}
      onDragStart={(e) => {
        e.dataTransfer.setData(ITEM_TYPE, item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => setArmed(false)}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(ITEM_TYPE)) return;
        e.preventDefault();
        e.stopPropagation();
        setDropAt(dropBefore(e) ? "before" : "after");
      }}
      onDragLeave={() => setDropAt(null)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(ITEM_TYPE);
        setDropAt(null);
        if (!id) return;
        e.preventDefault();
        e.stopPropagation();
        moves.dropItem(id, block.id, dropBefore(e) ? index : index + 1);
      }}
      className={cn(
        "group relative flex min-h-14 flex-wrap items-center gap-x-1 rounded-[12px] border border-line-soft bg-white py-1 pr-1.5 pl-2",
        dropAt === "before" && "shadow-[0_-3px_0_var(--brand)]",
        dropAt === "after" && "shadow-[0_3px_0_var(--brand)]",
      )}
    >
      <Grip
        focusKey={item.id}
        label={`Verplaats ${item.text}`}
        onMove={(d) => moves.moveItemBy(item.id, d)}
        onArm={setArmed}
      />
      {status && <ItemStatus status={status} />}
      <InlineText
        value={item.text}
        label="Titel wijzigen"
        onSave={(text) => update({ text })}
        className={cn(
          "text-[15px] font-semibold",
          status === "done" && "text-ink-3 line-through",
          status === "postponed" && "text-ink-3",
        )}
      />
      {status !== "done" && <PurposePicker value={item.purposes} onChange={(purposes) => update({ purposes })} />}
      {status !== "done" && (
        <OwnersPicker id={`owner-${item.id}`} value={item.ownerIds} onChange={(ownerIds) => update({ ownerIds })} />
      )}
      {status === "done" && actual !== undefined ? (
        <span className="px-1.5 text-[13px] whitespace-nowrap text-ink-3 tabular-nums">
          {Math.max(1, Math.round(actual / 60))} min
        </span>
      ) : (
        <DurationPicker value={item.duration} onChange={(duration) => update({ duration })} />
      )}
      {status === "postponed" && <span className="text-[13px] text-ink-3">naar volgende vergadering</span>}
      <span className="ml-auto flex items-center">
        <EntryColumns item={item} />
        <ItemEditButton item={item} onOpen={() => onOpenDetails(item)} />
      </span>
    </li>
  );
}

/* ---------- Huidig agendapunt (lopende vergadering) ---------- */

const CAPTURE: { kind: EntryKind; label: string }[] = [
  { kind: "decision", label: "Beslissing" },
  { kind: "action", label: "Actie" },
  { kind: "note", label: "Notitie" },
];

export function CurrentItemCard({ item }: { item: AgendaItem }) {
  const { meeting, now } = useMeeting();
  const { updateItem, addEntry, removeEntry, nextStep } = useStore.getState();
  const [adding, setAdding] = useState<EntryKind | null>(null);
  const run = meeting.run!;
  const elapsed = (now - run.stepStartedAt) / 1000;
  const planned = item.duration ? item.duration * 60 : null;
  const update = (patch: Partial<AgendaItem>) => updateItem(meeting.id, item.id, patch);

  return (
    <li
      aria-current="step"
      className="my-1 flex flex-col gap-3 rounded-[14px] border border-current-line bg-current-bg px-4 py-3.5"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="min-w-0 flex-1 text-base font-semibold">{item.text}</h3>
        <PurposePicker value={item.purposes} onChange={(purposes) => update({ purposes })} />
        <OwnersPicker value={item.ownerIds} onChange={(ownerIds) => update({ ownerIds })} />
        <span
          className={cn(
            "text-[13px] font-medium whitespace-nowrap tabular-nums",
            planned && elapsed > planned ? "text-warning" : "text-ink-3",
          )}
        >
          {formatClock(elapsed)}
          {item.duration && ` / ${item.duration} min`}
        </span>
      </div>
      {planned && <ProgressBar value={elapsed / planned} over={elapsed > planned} label={`Tijd voor ${item.text}`} />}
      {item.entries.length > 0 && (
        <ul className="-mx-2 flex flex-col">
          {item.entries.map((e) => (
            <EntryRow key={e.id} entry={e} onRemove={() => removeEntry(meeting.id, item.id, e.id)} />
          ))}
        </ul>
      )}
      {adding && (
        <EntryForm
          kind={adding}
          defaultOwnerId={item.ownerIds[0] ?? null}
          onCancel={() => setAdding(null)}
          onSubmit={(entry) => addEntry(meeting.id, item.id, entry)}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {CAPTURE.map(({ kind, label }) => (
          <Button
            key={kind}
            variant="outline"
            size="sm"
            className="px-3 font-semibold"
            aria-pressed={adding === kind}
            onClick={() => setAdding(adding === kind ? null : kind)}
          >
            + {label}
          </Button>
        ))}
        <span className="flex-1" />
        <Button variant="ghost" size="sm" className="font-semibold" onClick={() => nextStep(meeting.id, "postpone")}>
          Naar volgende vergadering
        </Button>
        <Button size="sm" className="font-semibold" onClick={() => nextStep(meeting.id, "done")}>
          Afronden
        </Button>
      </div>
    </li>
  );
}

/* ---------- Blokken ---------- */

function BlockMenu({ block, onRename }: { block: AgendaBlock; onRename: () => void }) {
  const { meeting } = useMeeting();
  const { removeBlock, updateBlock } = useStore.getState();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setDuration(false);
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Meer voor ${block.title}`} className={cn(iconButton, reveal)}>
          <MoreHorizontal className={icon} strokeWidth={STROKE} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="app-theme w-60">
        {duration ? (
          <DurationEditor
            value={block.duration}
            onChange={(d) => updateBlock(meeting.id, block.id, { duration: d })}
            onPick={() => setOpen(false)}
          />
        ) : (
          <div className="flex flex-col">
            <button
              type="button"
              className={menuItem}
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            >
              <Pencil className={cn(icon, "text-ink-subtle")} strokeWidth={STROKE} aria-hidden />
              Hernoemen
            </button>
            {block.kind === "actions" && (
              <button type="button" className={menuItem} onClick={() => setDuration(true)}>
                <span className="w-4" aria-hidden />
                Duur
              </button>
            )}
            <button
              type="button"
              className={cn(menuItem, "text-danger")}
              onClick={() => {
                setOpen(false);
                removeBlock(meeting.id, block.id);
              }}
            >
              <Trash2 className={icon} strokeWidth={STROKE} aria-hidden />
              Blok verwijderen
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Kop en sleepgedrag die alle kaartblokken delen. */
export function BlockCard({
  block,
  index,
  moves,
  expanded,
  onToggle,
  summary,
  aside,
  meta,
  children,
  bodyId,
  tinted,
}: {
  block: AgendaBlock;
  index: number;
  moves: AgendaMoves;
  expanded: boolean;
  onToggle: () => void;
  /** Rechts in de kop, bv. de duur of "2 punten · 30 min". */
  summary?: ReactNode;
  /** Naast de titel, bv. de presentator. */
  aside?: ReactNode;
  /** Onder de titel. */
  meta?: ReactNode;
  children: ReactNode;
  bodyId: string;
  /** Lichtgrijs blok met witte kaarten per agendapunt. */
  tinted?: boolean;
}) {
  const { meeting } = useMeeting();
  const updateBlock = useStore((s) => s.updateBlock);
  const [armed, setArmed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [dropAt, setDropAt] = useState<"before" | "after" | null>(null);

  return (
    <section
      aria-label={block.title}
      draggable={armed}
      onDragStart={(e) => {
        e.dataTransfer.setData(BLOCK_TYPE, block.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => setArmed(false)}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(BLOCK_TYPE)) return;
        e.preventDefault();
        setDropAt(dropBefore(e) ? "before" : "after");
      }}
      onDragLeave={() => setDropAt(null)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(BLOCK_TYPE);
        setDropAt(null);
        if (!id) return;
        e.preventDefault();
        moves.dropBlock(id, dropBefore(e) ? index : index + 1);
      }}
      className={cn(
        card,
        "flex flex-col px-3 py-1.5 sm:px-4",
        tinted && "bg-row-hover",
        dropAt === "before" && "shadow-[0_-3px_0_var(--brand)]",
        dropAt === "after" && "shadow-[0_3px_0_var(--brand)]",
      )}
    >
      <div className="group flex min-h-14 items-center gap-1">
        <Grip
          focusKey={block.id}
          label={`Verplaats blok ${block.title}`}
          onMove={(d) => moves.moveBlockBy(block.id, d)}
          onArm={setArmed}
        />
        <div className="flex min-w-0 flex-1 flex-col py-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1">
            <h2
              className={cn(
                "flex max-w-full min-w-0 shrink-0 font-semibold",
                tinted ? "text-[17px] font-bold" : "text-[15px]",
              )}
            >
              <InlineText
                value={block.title}
                label="Blok hernoemen"
                editing={renaming || undefined}
                onEditingChange={setRenaming}
                onSave={(title) => updateBlock(meeting.id, block.id, { title })}
                inputClassName="text-[15px] font-semibold"
              />
            </h2>
            {aside}
          </div>
          {meta}
        </div>
        {summary}
        <BlockMenu block={block} onRename={() => setRenaming(true)} />
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={expanded ? `${block.title} inklappen` : `${block.title} uitklappen`}
          onClick={onToggle}
          className={iconButton}
        >
          <ChevronDown
            className={cn(icon, "transition-transform", !expanded && "-rotate-90")}
            strokeWidth={STROKE}
            aria-hidden
          />
        </button>
      </div>
      {expanded && (
        <div id={bodyId} className="flex flex-col pb-2.5">
          {children}
        </div>
      )}
    </section>
  );
}

export function TopicsBlock({
  block,
  index,
  moves,
  expanded,
  onToggle,
  focusInput,
  onOpenDetails,
}: {
  block: AgendaBlock;
  index: number;
  moves: AgendaMoves;
  expanded: boolean;
  onToggle: () => void;
  /** Lege staat: het invoerveld staat in focus, met uitleg. */
  focusInput?: boolean;
  onOpenDetails: (item: AgendaItem) => void;
}) {
  const { meeting, people } = useMeeting();
  const { addAgendaItem, updateBlock } = useStore.getState();
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const run = meeting.run;
  const total = blockDuration(block);
  const current = run && block.items.find((i) => i.id === run.currentId);
  const presenter = findPerson(people, block.presenterId);
  const inputId = `add-${block.id}`;
  const hintId = `${inputId}-hint`;
  const showInput = adding || focusInput;

  const summary = !expanded
    ? block.items.length === 0
      ? ""
      : [plural(block.items.length, "punt", "punten"), total ? `${total} min` : ""].filter(Boolean).join(" · ")
    : total
      ? `${total} min`
      : "";

  return (
    <BlockCard
      block={block}
      index={index}
      moves={moves}
      expanded={expanded}
      onToggle={onToggle}
      bodyId={`block-${block.id}`}
      tinted
      aside={
        <>
          <OwnerButton
            role="Presentator"
            ownerId={block.presenterId}
            onPick={(presenterId) => updateBlock(meeting.id, block.id, { presenterId })}
          />
          {summary && <span className="px-1 text-[13px] whitespace-nowrap text-ink-3 tabular-nums">{summary}</span>}
        </>
      }
      meta={block.subtitle && <p className="px-1 text-[13px] text-ink-3">{block.subtitle}</p>}
    >
      {presenter && <span className="sr-only">Presentator: {presenter.name}</span>}
      {block.items.length > 0 && (
        // Kolomkoppen; elke teller heeft zelf een volledig label.
        <div aria-hidden className="hidden justify-end pr-[51px] pb-1.5 sm:flex">
          {ENTRY_KINDS.map(({ kind, plural: label }) => (
            <span
              key={kind}
              className={cn(
                "w-20 text-center text-[13px] font-medium",
                kind === "decision" || kind === "action" ? "text-brand" : "text-ink-3",
              )}
            >
              {label === "documenten" ? "Docs" : label.charAt(0).toUpperCase() + label.slice(1)}
            </span>
          ))}
        </div>
      )}
      <ul
        className="flex flex-col gap-2"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(ITEM_TYPE)) e.preventDefault();
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData(ITEM_TYPE);
          if (!id) return;
          e.preventDefault();
          moves.dropItem(id, block.id, block.items.length);
        }}
      >
        {block.items.map((item, i) =>
          current && item.id === current.id ? (
            <CurrentItemCard key={item.id} item={item} />
          ) : (
            <AgendaItemRow
              key={item.id}
              item={item}
              block={block}
              index={i}
              moves={moves}
              onOpenDetails={onOpenDetails}
            />
          ),
        )}
      </ul>
      {showInput ? (
        <>
          <div className="relative mt-2">
            <input
              id={inputId}
              type="text"
              aria-label={`Agendapunt toevoegen aan ${block.title}`}
              aria-describedby={focusInput ? hintId : undefined}
              placeholder="Typ een agendapunt en druk Enter"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              // Ook in de lege staat blijft het veld open zolang je typt.
              onFocus={() => setAdding(true)}
              onBlur={() => !text.trim() && setAdding(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setText("");
                  setAdding(false);
                }
                if (e.key === "Enter" && text.trim()) {
                  e.preventDefault();
                  addAgendaItem(meeting.id, block.id, text.trim());
                  setText("");
                }
              }}
              className={cn(
                "min-h-11 w-full rounded-[10px] border border-dashed border-line bg-white px-3 text-sm text-ink outline-none",
                "focus-visible:border-solid focus-visible:border-brand focus-visible:outline-none",
                focusInput && "pr-20",
              )}
            />
            {focusInput && (
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" aria-hidden>
                <Kbd>Enter</Kbd>
              </span>
            )}
          </div>
          {focusInput && (
            <p id={hintId} className="mt-1.5 px-1 text-[13px] text-ink-3">
              Eigenaar, duur en doel voeg je later toe — of nooit. Een titel volstaat om te starten.
            </p>
          )}
        </>
      ) : (
        <button
          id={inputId}
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-[10px] px-2 text-[15px] font-medium text-brand hover:bg-white"
        >
          <Plus className="size-5" strokeWidth={STROKE} aria-hidden />
          Agendapunt toevoegen<span className="sr-only"> aan {block.title}</span>
        </button>
      )}
    </BlockCard>
  );
}

/** Pauze: geen kaart, maar een gecentreerd label met een lijn links en rechts. */
export function BreakBlock({ block, index, moves }: { block: AgendaBlock; index: number; moves: AgendaMoves }) {
  const { meeting } = useMeeting();
  const { updateBlock, removeBlock } = useStore.getState();
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <div
      role="group"
      aria-label={`Pauze, ${block.duration ?? 0} minuten`}
      draggable={armed}
      onDragStart={(e) => e.dataTransfer.setData(BLOCK_TYPE, block.id)}
      onDragEnd={() => setArmed(false)}
      onDragOver={(e) => e.dataTransfer.types.includes(BLOCK_TYPE) && e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(BLOCK_TYPE);
        if (!id) return;
        e.preventDefault();
        moves.dropBlock(id, dropBefore(e) ? index : index + 1);
      }}
      className="group flex items-center gap-3 px-1"
    >
      <Grip
        focusKey={block.id}
        label="Verplaats pauze"
        onMove={(d) => moves.moveBlockBy(block.id, d)}
        onArm={setArmed}
      />
      <span aria-hidden className="h-px flex-1 bg-line" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Pauze · ${block.duration ?? 0} min. Wijzigen`}
            className="min-h-11 cursor-pointer rounded-[10px] px-3 text-[13px] font-medium text-ink-3 hover:bg-white hover:text-ink"
          >
            Pauze · {block.duration ?? 0} min
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="app-theme w-60">
          <DurationEditor
            value={block.duration}
            allowEmpty={false}
            onChange={(duration) => updateBlock(meeting.id, block.id, { duration: duration ?? 5 })}
            onPick={() => setOpen(false)}
          />
          <button
            type="button"
            className={cn(menuItem, "text-danger")}
            onClick={() => {
              setOpen(false);
              removeBlock(meeting.id, block.id);
            }}
          >
            <Trash2 className={icon} strokeWidth={STROKE} aria-hidden />
            Pauze verwijderen
          </button>
        </PopoverContent>
      </Popover>
      <span aria-hidden className="h-px flex-1 bg-line" />
      <span className="w-8" aria-hidden />
    </div>
  );
}
