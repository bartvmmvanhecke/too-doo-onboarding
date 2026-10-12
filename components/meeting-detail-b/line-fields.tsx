"use client";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ENTRY_KINDS, PURPOSES, PURPOSE_CLASS, type AgendaItem, type EntryKind } from "@/lib/agenda";
import type { Person } from "@/lib/mock-data";

type Option = { label: string; group?: string; checked?: boolean; select: () => void };
/** Command-style keuzelijst met zoeken en volledige toetsenbordbediening, zonder extra dependency. */
export function LinePicker({ label, children, options, onClose }: { label: string; children: React.ReactNode; options: Option[]; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  function select(option: Option) { option.select(); setOpen(false); setQuery(""); onClose?.(); }
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" aria-label={label} className="min-h-11 text-xs">{children}</button></PopoverTrigger>
    <PopoverContent className="app-theme w-64" onCloseAutoFocus={(e) => { if (onClose) { e.preventDefault(); onClose(); } }}>
      <input aria-label={`Zoeken: ${label}`} role="combobox" aria-expanded="true" aria-controls={`picker-${label}`} aria-activedescendant={filtered.length ? `picker-${label}-${active}` : undefined} className="min-h-11 w-full border-b border-line px-2 text-sm outline-none" placeholder="Zoeken…" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive((n) => (n + (e.key === "ArrowDown" ? 1 : -1) + filtered.length) % Math.max(1, filtered.length)); }
        if (e.key === "Enter" && filtered[active]) { e.preventDefault(); select(filtered[active]); }
      }} />
      <div role="listbox" id={`picker-${label}`} aria-label={label}>{filtered.map((o, i) => <div key={o.label}>{o.group && (i === 0 || filtered[i - 1].group !== o.group) && <p className="px-2 pt-2 text-xs text-ink-3">{o.group}</p>}<button id={`picker-${label}-${i}`} role="option" aria-selected={active === i} type="button" className="flex min-h-11 w-full items-center justify-between rounded px-2 text-left text-sm aria-selected:bg-brand-soft" onClick={() => select(o)}>{o.label}{o.checked && <Check size={14} aria-hidden />}</button></div>)}{!filtered.length && <p className="p-2 text-sm text-ink-3">Geen resultaten</p>}</div>
    </PopoverContent>
  </Popover>;
}
export function LineFields({ item, people, update, add, focus }: { item: AgendaItem; people: Person[]; update: (patch: Partial<AgendaItem>) => void; add: (kind: EntryKind | "break") => void; focus: () => void }) {
  const owner = people.find((p) => item.ownerIds.includes(p.id));
  const goals = PURPOSES.map((p) => ({ label: p.label, group: "Doel", checked: item.purposes.includes(p.value), select: () => update({ purposes: item.purposes.includes(p.value) ? item.purposes.filter((x) => x !== p.value) : [...item.purposes, p.value] }) }));
  return <>
    <span className={owner ? "" : "document-reveal"}><LinePicker label={`Eigenaar ${item.id}`} onClose={focus} options={[{ label: "Geen eigenaar", select: () => update({ ownerIds: [] }) }, ...people.map((p) => ({ label: p.name, select: () => update({ ownerIds: [p.id] }) }))]}>{owner ? <Avatar person={owner} size={24} /> : <span className="document-dashed">+ eigenaar</span>}</LinePicker></span>
    <span className={item.duration ? "" : "document-reveal"}><Popover><PopoverTrigger asChild><button className={item.duration ? "min-h-11 text-xs text-ink-3" : "document-dashed"} aria-label={`Duur ${item.id}`} type="button">{item.duration ? `${item.duration} min` : "+ duur"}</button></PopoverTrigger><PopoverContent className="app-theme"><label className="text-sm">Duur in minuten<input aria-label="Duur in minuten" type="number" min="0" className="min-h-11 w-full border border-line rounded px-2" defaultValue={item.duration ?? ""} onChange={(e) => update({ duration: e.target.value ? Number(e.target.value) : null })} /></label></PopoverContent></Popover></span>
    <span className={item.purposes.length ? "flex gap-1" : "document-reveal"}><LinePicker label={`Doel ${item.id}`} options={goals} onClose={focus}>{item.purposes.length ? item.purposes.map((p) => <span key={p} className={`rounded-full px-2 py-1 ${PURPOSE_CLASS[p]}`}>{PURPOSES.find((x) => x.value === p)?.label}</span>) : <span className="document-dashed">+ doel</span>}</LinePicker></span>
    <span className="ml-auto flex items-center gap-1">{ENTRY_KINDS.map((k) => { const n = item.entries.filter((e) => e.kind === k.kind).length; return n > 0 ? <button type="button" key={k.kind} aria-label={`${n} ${k.plural}`} className="min-h-11 text-[11px] text-ink-3" onClick={() => document.querySelector<HTMLInputElement>(`[data-entry-parent="${item.id}"]`)?.focus()}>{k.label.slice(0, 1)} {n}</button> : null; })}<span className="document-reveal"><LinePicker label={`Toevoegen bij ${item.id}`} onClose={focus} options={[...goals, ...ENTRY_KINDS.map((k) => ({ label: k.label, group: "Toevoegen", select: () => add(k.kind) })), { label: "Pauze", group: "Toevoegen", select: () => add("break") }]}><Plus size={16} aria-hidden /></LinePicker></span></span>
  </>;
}
