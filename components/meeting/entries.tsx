"use client";

import { useState, type ComponentType } from "react";
import {
  ChevronLeft,
  Clock,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Scale,
  SquareCheck,
  Target,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { DurationEditor, icon, iconButton, menuItem, PurposeEditor, reveal, STROKE } from "@/components/meeting/bits";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countEntries, ENTRY_KINDS, type AgendaItem, type Entry, type EntryKind } from "@/lib/agenda";
import { findPerson, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

export const ENTRY_ICON: Record<EntryKind, IconType> = {
  decision: Scale,
  action: SquareCheck,
  note: FileText,
  document: Paperclip,
};

function kindMeta(kind: EntryKind) {
  return ENTRY_KINDS.find((k) => k.kind === kind)!;
}

/** Eén vastgelegd item: label, tekst, eigenaar en datum. */
export function EntryRow({ entry, onRemove }: { entry: Entry; onRemove?: () => void }) {
  const { people } = useMeeting();
  const owner = findPerson(people, entry.ownerId);
  const date = entry.date ? (entry.kind === "decision" ? `uitvoeren tegen ${entry.date}` : entry.date) : "";
  return (
    <li className="group flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-[10px] px-2 hover:bg-row-hover">
      <span className="w-[84px] shrink-0 text-[11px] font-semibold tracking-[0.5px] text-ink-subtle uppercase">
        {kindMeta(entry.kind).tag}
      </span>
      <span className="min-w-0 flex-1 text-sm">{entry.text}</span>
      {owner && <Avatar person={owner} size={22} />}
      {date && <span className="text-[13px] whitespace-nowrap text-ink-3">{date}</span>}
      {onRemove && (
        <button
          type="button"
          aria-label={`${kindMeta(entry.kind).label} "${entry.text}" verwijderen`}
          onClick={onRemove}
          className={cn(iconButton, reveal)}
        >
          <Trash2 className={icon} strokeWidth={STROKE} aria-hidden />
        </button>
      )}
    </li>
  );
}

/** Tellers voor beslissingen, acties, notities en documenten; alleen als ze groter zijn dan 0. */
export function EntryCounters({ item }: { item: AgendaItem }) {
  const { meeting } = useMeeting();
  const removeEntry = useStore((s) => s.removeEntry);
  return (
    <>
      {ENTRY_KINDS.map(({ kind, label, plural }) => {
        const n = countEntries(item, kind);
        if (n === 0) return null;
        const Icon = ENTRY_ICON[kind];
        return (
          <Popover key={kind}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`${n} ${n === 1 ? label.toLowerCase() : plural} bij ${item.text}`}
                className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg px-1.5 text-[13px] text-ink-3 tabular-nums hover:bg-row-hover hover:text-ink"
              >
                <Icon className={icon} strokeWidth={STROKE} aria-hidden />
                {n}
              </button>
            </PopoverTrigger>
            <PopoverContent className="app-theme w-80">
              <p className="px-2 pt-1 pb-1.5 text-xs font-semibold text-ink-3">{n === 1 ? label : upper(plural)}</p>
              <ul className="flex flex-col">
                {item.entries
                  .filter((e) => e.kind === kind)
                  .map((e) => (
                    <EntryRow key={e.id} entry={e} onRemove={() => removeEntry(meeting.id, item.id, e.id)} />
                  ))}
              </ul>
            </PopoverContent>
          </Popover>
        );
      })}
    </>
  );
}

function upper(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Invoer voor een nieuw item: tekst, en bij een beslissing of actie een datum. */
export function EntryForm({
  kind,
  defaultOwnerId,
  onSubmit,
  onCancel,
  autoFocus = true,
}: {
  kind: EntryKind;
  defaultOwnerId: string | null;
  onSubmit: (e: Omit<Entry, "id" | "actionId">) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const meta = kindMeta(kind);
  const withDate = kind === "decision" || kind === "action";
  const submit = () => {
    if (!text.trim()) return;
    onSubmit({ kind, text: text.trim(), ownerId: defaultOwnerId, date: date.trim() });
    setText("");
    setDate("");
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
    }
  };
  const field = "min-h-11 min-w-0 rounded-[10px] border border-line bg-white px-3 text-sm text-ink";
  return (
    <div role="group" aria-label={`Nieuwe ${meta.label.toLowerCase()}`} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        aria-label={meta.label}
        placeholder={kind === "document" ? "Naam of link van het document" : `${meta.label}…`}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        className={cn(field, "flex-[1_1_200px]")}
      />
      {withDate && (
        <input
          type="text"
          aria-label={kind === "decision" ? "Uitvoeren tegen (optioneel)" : "Deadline (optioneel)"}
          placeholder={kind === "decision" ? "uitvoeren tegen…" : "tegen wanneer?"}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(field, "w-36")}
        />
      )}
      <button
        type="button"
        onClick={submit}
        className="min-h-11 cursor-pointer rounded-[10px] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
      >
        Toevoegen
      </button>
    </div>
  );
}

type View = "menu" | "purpose" | "duration" | EntryKind;

/** De "+" bij hover: Beslissing / Actie / Notitie / Document, plus doel, duur en meer. */
export function ItemAddMenu({ item, onOpenDetails }: { item: AgendaItem; onOpenDetails: () => void }) {
  const { meeting } = useMeeting();
  const { addEntry, updateItem, removeItem } = useStore.getState();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  const back = (
    <button type="button" onClick={() => setView("menu")} className={cn(menuItem, "text-ink-3")}>
      <ChevronLeft className={icon} strokeWidth={STROKE} aria-hidden />
      Terug
    </button>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setView("menu");
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Toevoegen aan ${item.text}`} className={cn(iconButton, reveal)}>
          <Plus className={icon} strokeWidth={STROKE} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("app-theme", view === "menu" || view === "purpose" ? "w-56" : "w-80")}>
        {view === "menu" && (
          <div role="group" aria-label={`Toevoegen aan ${item.text}`} className="flex flex-col">
            {ENTRY_KINDS.map(({ kind, label }) => {
              const Icon = ENTRY_ICON[kind];
              return (
                <button key={kind} type="button" onClick={() => setView(kind)} className={menuItem}>
                  <Icon className={cn(icon, "text-ink-subtle")} strokeWidth={STROKE} aria-hidden />
                  {label}
                </button>
              );
            })}
            <div role="separator" className="my-1 h-px bg-line-soft" />
            <button type="button" onClick={() => setView("purpose")} className={menuItem}>
              <Target className={cn(icon, "text-ink-subtle")} strokeWidth={STROKE} aria-hidden />
              Doel
            </button>
            <button type="button" onClick={() => setView("duration")} className={menuItem}>
              <Clock className={cn(icon, "text-ink-subtle")} strokeWidth={STROKE} aria-hidden />
              Duur
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenDetails();
              }}
              className={menuItem}
            >
              <Pencil className={cn(icon, "text-ink-subtle")} strokeWidth={STROKE} aria-hidden />
              Alles bewerken…
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                removeItem(meeting.id, item.id);
              }}
              className={cn(menuItem, "text-danger")}
            >
              <Trash2 className={icon} strokeWidth={STROKE} aria-hidden />
              Verwijderen
            </button>
          </div>
        )}
        {view === "purpose" && (
          <div className="flex flex-col">
            {back}
            <PurposeEditor
              value={item.purposes}
              onChange={(purposes) => updateItem(meeting.id, item.id, { purposes })}
            />
          </div>
        )}
        {view === "duration" && (
          <div className="flex flex-col">
            {back}
            <DurationEditor
              value={item.duration}
              onChange={(duration) => {
                updateItem(meeting.id, item.id, { duration });
                setOpen(false);
                setView("menu");
              }}
            />
          </div>
        )}
        {view !== "menu" && view !== "purpose" && view !== "duration" && (
          <div className="flex flex-col gap-1.5 p-1">
            {back}
            <EntryForm
              kind={view}
              defaultOwnerId={item.ownerId}
              onCancel={() => setView("menu")}
              onSubmit={(entry) => {
                addEntry(meeting.id, item.id, entry);
                setOpen(false);
                setView("menu");
              }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
