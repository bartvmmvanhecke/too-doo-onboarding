"use client";

import { useRef, useState, type ComponentType, type DragEvent, type KeyboardEvent } from "react";
import {
  Check,
  ExternalLink,
  FileText,
  Paperclip,
  Pencil,
  Scale,
  SquareCheck,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { DateChip, icon, iconButton, OwnerButton, reveal, STROKE } from "@/components/meeting/bits";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  countEntries,
  ENTRY_KINDS,
  formatSize,
  formatStamp,
  type AgendaItem,
  type Entry,
  type EntryInput,
  type EntryKind,
} from "@/lib/agenda";
import { notAvailable } from "@/lib/not-available";
import { findPerson, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

export const ENTRY_ICON: Record<EntryKind, IconType> = {
  decision: Scale,
  action: SquareCheck,
  note: StickyNote,
  document: FileText,
};

function kindMeta(kind: EntryKind) {
  return ENTRY_KINDS.find((k) => k.kind === kind)!;
}

const DATE_LABEL: Partial<Record<EntryKind, string>> = { decision: "Uitvoeren tegen", action: "Deadline" };

/** Geüploade bestanden blijven enkel in deze sessie te openen (prototype, niets wordt verstuurd). */
const fileUrls = new Map<string, string>();

/* ---------- Eén item in een lijst ---------- */

/** Rij in de kaart van een lopende vergadering: label, tekst, eigenaar en datum. */
export function EntryRow({ entry, onRemove }: { entry: Entry; onRemove?: () => void }) {
  const { people } = useMeeting();
  const owner = findPerson(people, entry.ownerId);
  const date = entry.date ? (entry.kind === "decision" ? `uitvoeren tegen ${entry.date}` : entry.date) : "";
  return (
    <li className="group flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-[10px] px-2 hover:bg-row-hover">
      <span className="w-[84px] shrink-0 text-[11px] font-semibold tracking-[0.5px] text-ink-3 uppercase">
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

/** Een eerder vastgelegd item in het paneel: bewerken en verwijderen kan meteen. */
function EntryLine({ item, entry }: { item: AgendaItem; entry: Entry }) {
  const { meeting, people } = useMeeting();
  const { updateEntry, removeEntry } = useStore.getState();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.text);
  const meta = kindMeta(entry.kind);
  const update = (patch: Parameters<typeof updateEntry>[3]) => updateEntry(meeting.id, item.id, entry.id, patch);
  const author = findPerson(people, entry.authorId);

  const commit = () => {
    if (text.trim() && text.trim() !== entry.text) update({ text: text.trim() });
    setEditing(false);
  };
  const actions = (
    <>
      {entry.kind === "document" ? (
        <button
          type="button"
          aria-label={`${entry.text} openen`}
          onClick={() => {
            const url = fileUrls.get(entry.id);
            if (url) window.open(url, "_blank", "noopener");
            else notAvailable();
          }}
          className={iconButton}
        >
          <ExternalLink className={icon} strokeWidth={STROKE} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`${meta.label} "${entry.text}" bewerken`}
          onClick={() => {
            setText(entry.text);
            setEditing(true);
          }}
          className={iconButton}
        >
          <Pencil className={icon} strokeWidth={STROKE} aria-hidden />
        </button>
      )}
      <button
        type="button"
        aria-label={`${meta.label} "${entry.text}" verwijderen`}
        onClick={() => removeEntry(meeting.id, item.id, entry.id)}
        className={iconButton}
      >
        <Trash2 className={icon} strokeWidth={STROKE} aria-hidden />
      </button>
    </>
  );

  const body = editing ? (
    <input
      type="text"
      aria-label={`${meta.label} bewerken`}
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          e.stopPropagation();
          setEditing(false);
        }
      }}
      className="min-h-11 min-w-0 flex-1 rounded-lg border border-brand bg-white px-2 text-sm text-ink outline-none"
    />
  ) : null;

  if (entry.kind === "note") {
    return (
      <li className="flex items-center gap-2 border-t border-line-faint py-1 first:border-t-0">
        {author && <Avatar person={author} size={22} className="self-start mt-2.5" />}
        {body ?? (
          <span className="flex min-w-0 flex-1 flex-col py-1.5">
            <span className="text-sm">{entry.text}</span>
            {entry.createdAt && (
              <span className="text-xs text-ink-subtle">
                {author ? `${author.name.split(" ")[0]} • ` : ""}
                {formatStamp(entry.createdAt)}
              </span>
            )}
          </span>
        )}
        {actions}
      </li>
    );
  }

  if (entry.kind === "document") {
    return (
      <li className="flex min-h-11 items-center gap-2 border-t border-line-faint first:border-t-0">
        <span className="min-w-0 flex-1 truncate text-sm">
          {entry.text}
          {entry.size !== undefined && <span className="text-ink-subtle"> • {formatSize(entry.size)}</span>}
        </span>
        {actions}
      </li>
    );
  }

  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-1 border-t border-line-faint first:border-t-0">
      {body ?? <span className="min-w-0 flex-1 py-2 text-sm text-ink-3">{entry.text}</span>}
      <span className="ml-auto flex items-center">
        <OwnerButton ownerId={entry.ownerId} onPick={(ownerId) => update({ ownerId })} />
        <DateChip value={entry.date} label={DATE_LABEL[entry.kind]!} onChange={(date) => update({ date })} />
        {actions}
      </span>
    </li>
  );
}

/* ---------- Toevoegen ---------- */

/** Invoer voor beslissing, actie of notitie: Enter bewaart en het veld blijft klaar voor de volgende. */
function Composer({
  item,
  kind,
  onClose,
  autoFocus = true,
}: {
  item: AgendaItem;
  kind: Exclude<EntryKind, "document">;
  onClose?: () => void;
  autoFocus?: boolean;
}) {
  const { meeting } = useMeeting();
  const addEntry = useStore((s) => s.addEntry);
  const [text, setText] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(item.ownerIds[0] ?? null);
  const [date, setDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = kindMeta(kind);
  const withMeta = kind !== "note";

  const submit = () => {
    if (!text.trim()) return;
    addEntry(meeting.id, item.id, { kind, text: text.trim(), ownerId: withMeta ? ownerId : null, date });
    setText("");
    setDate("");
    inputRef.current?.focus();
  };

  return (
    <div
      role="group"
      aria-label={`Nieuwe ${meta.label.toLowerCase()}`}
      className="flex flex-wrap items-center gap-x-1 gap-y-1"
    >
      <input
        ref={inputRef}
        type="text"
        aria-label={meta.label}
        placeholder={meta.placeholder}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="min-h-11 min-w-0 flex-[1_1_220px] rounded-[10px] border border-line bg-white px-3 text-sm text-ink"
      />
      <span className="ml-auto flex items-center">
        {withMeta && (
          <>
            <OwnerButton ownerId={ownerId} onPick={setOwnerId} />
            <DateChip value={date} label={DATE_LABEL[kind]!} onChange={setDate} />
          </>
        )}
        <button
          type="button"
          aria-label={`${meta.label} toevoegen`}
          onClick={submit}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover">
            <Check className={icon} strokeWidth={2} aria-hidden />
          </span>
        </button>
        {onClose && (
          <button type="button" aria-label="Sluiten" onClick={onClose} className={iconButton}>
            <X className={icon} strokeWidth={STROKE} aria-hidden />
          </button>
        )}
      </span>
    </div>
  );
}

/** Bestanden slepen of kiezen; ze blijven in deze sessie (er wordt niets verstuurd). */
function Dropzone({ item }: { item: AgendaItem }) {
  const { meeting } = useMeeting();
  const addEntry = useStore((s) => s.addEntry);
  const [over, setOver] = useState(false);
  const add = (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      if (f.size > 25_000_000) {
        toast(`${f.name} is groter dan 25 MB`);
        continue;
      }
      const id = addEntry(meeting.id, item.id, {
        kind: "document",
        text: f.name,
        ownerId: null,
        date: "",
        size: f.size,
      });
      fileUrls.set(id, URL.createObjectURL(f));
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    add(e.dataTransfer.files);
  };
  return (
    <label
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] border border-dashed border-line px-4 py-6 text-center focus-within:border-brand",
        over && "border-brand bg-brand-soft",
      )}
    >
      <Paperclip className="size-6 text-ink-subtle" strokeWidth={STROKE} aria-hidden />
      <span className="text-sm text-ink-3">
        Sleep bestanden hierheen of <span className="font-medium text-brand">kies bestanden</span>
      </span>
      <span className="text-xs text-ink-subtle">PDF, Office, afbeeldingen · max 25 MB</span>
      <input
        type="file"
        multiple
        className="sr-only"
        aria-label={`Documenten toevoegen aan ${item.text}`}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** Inline toevoegen van één soort, met de vorige eronder. */
export function EntryPanel({
  item,
  kind,
  onClose,
  autoFocus,
}: {
  item: AgendaItem;
  kind: EntryKind;
  onClose?: () => void;
  autoFocus?: boolean;
}) {
  const entries = item.entries.filter((e) => e.kind === kind);
  return (
    <div className="flex flex-col gap-1.5">
      {kind === "document" ? (
        <Dropzone item={item} />
      ) : (
        <Composer item={item} kind={kind} onClose={onClose} autoFocus={autoFocus} />
      )}
      {entries.length > 0 && (
        <ul className="flex flex-col px-1">
          {entries.map((e) => (
            <EntryLine key={e.id} item={item} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Tellers ---------- */

/** Wat in de tooltip komt: de eerste items als opsomming. */
function EntryTooltip({ entries }: { entries: Entry[] }) {
  const shown = entries.slice(0, 5);
  return (
    <ul className="flex max-w-72 list-disc flex-col gap-0.5 pl-4 font-medium">
      {shown.map((e) => (
        <li key={e.id}>{e.text}</li>
      ))}
      {entries.length > shown.length && (
        <li className="list-none text-white/70">+{entries.length - shown.length} meer</li>
      )}
    </ul>
  );
}

/**
 * Beslissingen, acties, notities en documenten in vaste kolommen, ook als ze leeg zijn.
 * Hover toont de inhoud; klikken opent het paneel.
 */
export function EntryColumns({ item }: { item: AgendaItem }) {
  return (
    <div className="flex shrink-0 items-center">
      {ENTRY_KINDS.map(({ kind }) => (
        <EntryColumn key={kind} item={item} kind={kind} />
      ))}
    </div>
  );
}

function EntryColumn({ item, kind }: { item: AgendaItem; kind: EntryKind }) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(false);
  const meta = kindMeta(kind);
  const Icon = ENTRY_ICON[kind];
  const n = countEntries(item, kind);
  const entries = item.entries.filter((e) => e.kind === kind);

  const trigger = (
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={
          n
            ? `${n} ${n === 1 ? meta.label.toLowerCase() : meta.plural} bij ${item.text}`
            : `${meta.label} toevoegen bij ${item.text}`
        }
        className={cn(
          "flex min-h-11 w-12 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg text-sm tabular-nums hover:bg-row-hover sm:w-20",
          n === 0 ? "text-ink-subtle" : kind === "decision" || kind === "action" ? "text-brand" : "text-ink-3",
        )}
      >
        <Icon
          className={cn(
            icon,
            n === 0
              ? "opacity-40"
              : kind === "decision"
                ? "text-purpose-decide"
                : kind === "action"
                  ? ""
                  : "text-ink-3",
          )}
          strokeWidth={STROKE}
          aria-hidden
        />
        {n}
      </button>
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Hover of focus toont de inhoud; zolang het paneel open is niet. */}
      <Tooltip open={tip && !open && n > 0} onOpenChange={setTip}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        {n > 0 && (
          <TooltipContent side="bottom">
            <EntryTooltip entries={entries} />
          </TooltipContent>
        )}
      </Tooltip>
      <PopoverContent
        align="end"
        aria-label={meta.plural}
        className={cn(
          "app-theme p-2.5",
          kind === "note" || kind === "document"
            ? "w-[min(480px,calc(100vw-32px))]"
            : "w-[min(600px,calc(100vw-32px))]",
        )}
      >
        <EntryPanel item={item} kind={kind} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Invoer in de lopende vergadering ---------- */

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
  onSubmit: (e: EntryInput) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const meta = kindMeta(kind);
  const withDate = kind === "decision" || kind === "action";
  const submit = () => {
    if (!text.trim()) return;
    onSubmit({ kind, text: text.trim(), ownerId: defaultOwnerId, date });
    setText("");
    setDate("");
  };
  return (
    <div role="group" aria-label={`Nieuwe ${meta.label.toLowerCase()}`} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        aria-label={meta.label}
        placeholder={meta.placeholder || `${meta.label}…`}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        className="min-h-11 min-w-0 flex-[1_1_200px] rounded-[10px] border border-line bg-white px-3 text-sm text-ink"
      />
      {withDate && <DateChip value={date} label={DATE_LABEL[kind]!} onChange={setDate} />}
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

/** Potlood: alles van het punt op één plek (dialoog). */
export function ItemEditButton({ item, onOpen }: { item: AgendaItem; onOpen: () => void }) {
  return (
    <button type="button" aria-label={`${item.text} uitgebreid bewerken`} onClick={onOpen} className={iconButton}>
      <Pencil className={icon} strokeWidth={STROKE} aria-hidden />
    </button>
  );
}
