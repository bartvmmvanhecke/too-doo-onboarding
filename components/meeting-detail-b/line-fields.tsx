"use client";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command";
import { DurationPicker, OwnersPicker, PurposePicker } from "@/components/meeting/bits";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Avatar } from "@/components/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ENTRY_KINDS, PURPOSES, PURPOSE_CLASS, type AgendaItem, type EntryKind } from "@/lib/agenda";
import type { Person } from "@/lib/mock-data";

type Option = { label: string; group?: string; checked?: boolean; select: () => void };
/** Shadcn Command in een popover; sluiten brengt de focus terug naar de bronregel. */
export function LinePicker({
  label,
  children,
  options,
  onClose,
}: {
  label: string;
  children: React.ReactNode;
  options: Option[];
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  function select(option: Option) {
    option.select();
    setOpen(false);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="min-h-11 text-xs">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="app-theme w-64"
        onCloseAutoFocus={(e) => {
          if (onClose) {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <Command label={label} loop>
          <CommandInput aria-label={`Zoeken: ${label}`} placeholder="Zoeken…" />
          <CommandList>
            <CommandEmpty>Geen resultaten</CommandEmpty>
            {[...new Set(options.map((o) => o.group ?? ""))].map((group) => (
              <CommandGroup key={group} heading={group || undefined}>
                {options
                  .filter((o) => (o.group ?? "") === group)
                  .map((o) => (
                    <CommandItem key={o.label} value={o.label} onSelect={() => select(o)} asChild>
                      <button type="button" className="w-full text-left" tabIndex={0}>
                        {o.label}
                        {o.checked && <Check size={14} aria-hidden />}
                      </button>
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
export function LineFields({
  item,
  people,
  update,
  add,
  focus,
}: {
  item: AgendaItem;
  people: Person[];
  update: (patch: Partial<AgendaItem>) => void;
  add: (kind: EntryKind | "break") => void;
  focus: () => void;
}) {
  const { trial } = useMeeting();
  const owner = people.find((p) => item.ownerIds.includes(p.id));
  const goals = PURPOSES.map((p) => ({
    label: p.label,
    group: "Doel",
    checked: item.purposes.includes(p.value),
    select: () =>
      update({
        purposes: item.purposes.includes(p.value)
          ? item.purposes.filter((x) => x !== p.value)
          : [...item.purposes, p.value],
      }),
  }));
  return (
    <>
      {trial ? (
        <span className="flex flex-wrap items-center gap-1">
          <PurposePicker value={item.purposes} onChange={(purposes) => update({ purposes })} />
          <OwnersPicker value={item.ownerIds} onChange={(ownerIds) => update({ ownerIds })} />
          <DurationPicker value={item.duration} onChange={(duration) => update({ duration })} />
        </span>
      ) : (
        <>
          <span className={owner ? "" : "document-reveal"}>
            <LinePicker
              label={`Eigenaar ${item.id}`}
              onClose={focus}
              options={[
                { label: "Geen eigenaar", select: () => update({ ownerIds: [] }) },
                ...people.map((p) => ({ label: p.name, select: () => update({ ownerIds: [p.id] }) })),
              ]}
            >
              {owner ? <Avatar person={owner} size={24} /> : <span className="document-dashed">+ eigenaar</span>}
            </LinePicker>
          </span>
          <span className={item.duration ? "" : "document-reveal"}>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={item.duration ? "min-h-11 text-xs text-ink-3" : "document-dashed"}
                  aria-label={`Duur ${item.id}`}
                  type="button"
                >
                  {item.duration ? `${item.duration} min` : "+ duur"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="app-theme">
                <label className="text-sm">
                  Duur in minuten
                  <input
                    aria-label="Duur in minuten"
                    type="number"
                    min="0"
                    className="min-h-11 w-full border border-line rounded px-2"
                    defaultValue={item.duration ?? ""}
                    onChange={(e) => update({ duration: e.target.value ? Number(e.target.value) : null })}
                  />
                </label>
              </PopoverContent>
            </Popover>
          </span>
          <span className={item.purposes.length ? "flex gap-1" : "document-reveal"}>
            <LinePicker label={`Doel ${item.id}`} options={goals} onClose={focus}>
              {item.purposes.length ? (
                item.purposes.map((p) => (
                  <span key={p} className={`rounded-full px-2 py-1 ${PURPOSE_CLASS[p]}`}>
                    {PURPOSES.find((x) => x.value === p)?.label}
                  </span>
                ))
              ) : (
                <span className="document-dashed">+ doel</span>
              )}
            </LinePicker>
          </span>
        </>
      )}
      <span className="ml-auto flex items-center gap-1">
        {ENTRY_KINDS.map((k) => {
          const n = item.entries.filter((e) => e.kind === k.kind).length;
          return n > 0 ? (
            <Popover key={k.kind}>
              <PopoverTrigger asChild>
                <button type="button" aria-label={`${n} ${k.plural}`} className="min-h-11 text-[11px] text-ink-3">
                  {k.label.slice(0, 1)} {n}
                </button>
              </PopoverTrigger>
              <PopoverContent className="app-theme w-72">
                <p className="px-2 py-1 text-xs font-semibold text-ink-3">{k.plural}</p>
                {item.entries
                  .filter((e) => e.kind === k.kind)
                  .map((e) => (
                    <p key={e.id} className="px-2 py-2 text-sm">
                      {e.text}
                      {e.date && <span className="ml-2 text-xs text-ink-3">{e.date}</span>}
                    </p>
                  ))}
              </PopoverContent>
            </Popover>
          ) : null;
        })}
        <span className="document-reveal">
          <LinePicker
            label={`Toevoegen bij ${item.id}`}
            onClose={focus}
            options={[
              ...goals,
              ...ENTRY_KINDS.map((k) => ({ label: k.label, group: "Toevoegen", select: () => add(k.kind) })),
              { label: "Pauze", group: "Toevoegen", select: () => add("break") },
            ]}
          >
            <Plus size={16} aria-hidden />
          </LinePicker>
        </span>
      </span>
    </>
  );
}
