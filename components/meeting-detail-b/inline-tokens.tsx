"use client";
import { useState, type KeyboardEvent } from "react";
import { PURPOSES, ENTRY_KINDS, type AgendaItem, type EntryKind } from "@/lib/agenda";
import type { Person } from "@/lib/mock-data";

export function parseDuration(text: string): { text: string; duration?: number } {
  const match = text.match(/\s+(\d+)(m|u)(\d{1,2})?\s*$/i);
  if (!match) return { text };
  return { text: text.slice(0, match.index).trim(), duration: Number(match[1]) * (match[2].toLowerCase() === "u" ? 60 : 1) + Number(match[3] || 0) };
}
export function TokenInput({ id, text, label, people, onChange, update, add, onKeyDown, onBlur, inputRef, placeholder, autoFocus, onPaste, onFocus, purposes = [] }: {
  id: string; text: string; label: string; people: Person[]; onChange: (text: string) => void; update: (patch: Partial<AgendaItem>) => void; add: (kind: EntryKind | "break", sourceText?: string) => void; purposes?: AgendaItem["purposes"]; onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void; onBlur?: (text: string) => void; inputRef?: (el: HTMLInputElement | null) => void; placeholder?: string; autoFocus?: boolean; onPaste?: React.ClipboardEventHandler<HTMLInputElement>; onFocus?: () => void;
}) {
  const [active, setActive] = useState(0);
  const [closed, setClosed] = useState<string | null>(null);
  const match = text.match(/(?:^|\s)([@/])([^\s]*)$/);
  const open = !!match && closed !== match[0];
  const query = match?.[2].toLowerCase() ?? "";
  const clean = () => text.slice(0, match?.index).trimEnd();
  const options = (match?.[1] === "@" ? people.map((p) => ({ label: p.name, group: "Deelnemers", select: () => update({ ownerIds: [p.id] }) })) : [
    ...PURPOSES.map((p) => ({ label: p.label, group: "Doel", select: () => update({ purposes: purposes.includes(p.value) ? purposes.filter((x) => x !== p.value) : [...purposes, p.value] }) })),
    ...ENTRY_KINDS.map((k) => ({ label: k.label, group: "Toevoegen", select: () => add(k.kind, clean()) })),
    { label: "Pauze", group: "Toevoegen", select: () => add("break", clean()) },
  ]).filter((o) => o.label.toLowerCase().includes(query));
  function select(index: number) { const o = options[index]; if (!o) return; onChange(clean()); o.select(); setClosed(match?.[0] ?? null); setActive(0); }
  return <div className="relative min-w-28 flex-1">
    <input ref={inputRef} autoFocus={autoFocus} data-document-line id={id} aria-label={label} className="w-full text-sm" placeholder={placeholder} value={text.replaceAll("\n", " ↵ ")} onPaste={onPaste} onFocus={onFocus} onChange={(e) => { onChange(e.target.value.replaceAll(" ↵ ", "\n")); setClosed(null); setActive(0); }} onBlur={(e) => { if (!e.relatedTarget?.closest("[data-line-menu]")) onBlur?.(text); }} role={open ? "combobox" : undefined} aria-expanded={open || undefined} aria-controls={open ? `tokens-${id}` : undefined} aria-activedescendant={open && options[active] ? `token-${id}-${active}` : undefined} onKeyDown={(e) => {
      if (open) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive((n) => (n + (e.key === "ArrowDown" ? 1 : -1) + options.length) % Math.max(1, options.length)); return; }
        if (e.key === "Enter") { e.preventDefault(); select(active); return; }
        if (e.key === "Escape") { e.preventDefault(); setClosed(match![0]); return; }
      }
      if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); const at = e.currentTarget.selectionStart ?? text.length; onChange(text.slice(0, at) + "\n" + text.slice(at)); return; }
      onKeyDown(e);
    }} />
    {open && <div data-line-menu role="listbox" id={`tokens-${id}`} aria-label="Invoerkeuzes" className="absolute left-0 top-full z-20 w-64 rounded-lg border border-line bg-white p-2 shadow-lg">{options.map((o, i) => <div key={o.label}>{(i === 0 || options[i - 1].group !== o.group) && <p className="px-2 py-1 text-xs text-ink-3">{o.group}</p>}<button type="button" role="option" id={`token-${id}-${i}`} aria-selected={active === i} className="min-h-11 w-full rounded px-2 text-left text-sm aria-selected:bg-brand-soft" onMouseDown={(e) => e.preventDefault()} onClick={() => select(i)}>{o.label}{purposes.some((p) => PURPOSES.find((x) => x.value === p)?.label === o.label) ? " ✓" : ""}</button></div>)}{!options.length && <p className="text-sm text-ink-3">Geen resultaten</p>}</div>}
  </div>;
}
