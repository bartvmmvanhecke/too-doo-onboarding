"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Plus, GripVertical } from "lucide-react";
import { newBlock, blockDuration, type AgendaBlock, type AgendaItem, type EntryKind, type Entry } from "@/lib/agenda";
import { EntryFields } from "./entry-fields";
import { LineFields } from "./line-fields";
import { TokenInput, parseDuration } from "./inline-tokens";
import { usePeople, useStore, type Meeting } from "@/lib/store";

type Draft = { id: string; blockId: string; afterId?: string; text: string; patch?: Partial<AgendaItem>; parentId?: string; kind?: EntryKind; ownerId?: string | null; date?: string };
export function DocumentEditor({ meeting }: { meeting: Meeting }) {
  const people = usePeople().filter((p) => meeting.participants.includes(p.id));
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const sequence = useRef(0);
  const refs = useRef(new Map<string, HTMLInputElement>());
  const ops = useStore.getState();
  const blocks = meeting.blocks.filter((b) => b.kind !== "actions");
  const focus = (id: string) => requestAnimationFrame(() => { const el = refs.current.get(id); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); });
  function empty(blockId: string, afterId?: string, parentId?: string, kind?: EntryKind) {
    const id = `draft-${++sequence.current}`;
    setDraft({ id, blockId, afterId, parentId, kind, text: "" });
    focus(id);
  }
  function saveDraft() {
    if (!draft?.text.trim()) return null;
    let blockId = draft.blockId;
    if (!blockId) {
      const block = newBlock("topics", { title: "" });
      ops.putMeeting({ ...useStore.getState().meetings.find((m) => m.id === meeting.id)!, blocks: [...meeting.blocks, block] });
      blockId = block.id;
    }
    if (draft.parentId) {
      const action = /^\[\s?\]\s*/.test(draft.text);
      const text = draft.text.replace(/^\[\s?\]\s*/, "").trim();
      if (!text) return null;
      const entryId = ops.addEntry(meeting.id, draft.parentId, { kind: action ? "action" : draft.kind ?? "note", text, ownerId: draft.ownerId ?? draft.patch?.ownerIds?.[0] ?? null, date: draft.date ?? "" });
      setDraft(null);
      return { id: draft.parentId, blockId, entryId, kind: action ? "action" as const : draft.kind ?? "note" };
    }
    if (draft.text.trim().startsWith("#")) {
      const title = draft.text.trim().slice(1).trim();
      if (!title) return null;
      const id = ops.addBlock(meeting.id, "topics");
      ops.updateBlock(meeting.id, id, { title });
      setDraft(null);
      empty(id);
      return null;
    }
    const id = ops.addAgendaItem(meeting.id, blockId, parseDuration(draft.text).text);
    ops.updateItem(meeting.id, id, { ...draft.patch, ...(parseDuration(draft.text).duration !== undefined ? { duration: parseDuration(draft.text).duration } : {}) });
    const block = useStore.getState().meetings.find((m) => m.id === meeting.id)!.blocks.find((b) => b.id === blockId)!;
    if (draft.afterId) ops.moveItem(meeting.id, id, blockId, block.items.findIndex((i) => i.id === draft.afterId) + 1);
    setDraft(null);
    return { id, blockId };
  }
  function arrows(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return false;
    const inputs = [...document.querySelectorAll<HTMLInputElement>("[data-document-line]")];
    const index = inputs.indexOf(e.currentTarget);
    const target = inputs[index + (e.key === "ArrowUp" ? -1 : 1)];
    if (target) { e.preventDefault(); target.focus(); }
    return true;
  }
  function removeBlock(block: AgendaBlock) {
    const snapshot = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    const previous = blocks.slice(0, blocks.indexOf(block)).findLast((b) => b.kind === "topics");
    const target = previous ?? newBlock("topics", { title: "" });
    const rest = snapshot.blocks.filter((b) => b.id !== block.id).map((b) => b.id === target.id ? { ...b, items: [...b.items, ...block.items] } : b);
    if (!previous && block.items.length) rest.unshift({ ...target, items: block.items });
    ops.putMeeting({ ...snapshot, blocks: rest });
    toast("Blok verwijderd", { action: { label: "Ongedaan maken", onClick: () => ops.putMeeting({ ...useStore.getState().meetings.find((m) => m.id === meeting.id)!, blocks: snapshot.blocks }) } });
  }
  function addAt(itemId: string, kind: EntryKind | "break") {
    if (kind === "break") { ops.addBlock(meeting.id, "break"); return; }
    const block = meeting.blocks.find((b) => b.items.some((i) => i.id === itemId));
    if (block) empty(block.id, itemId, itemId, kind);
  }
  function saveItem(item: AgendaItem, text: string) {
    const parsed = parseDuration(text);
    if (parsed.text.trim()) ops.updateItem(meeting.id, item.id, parsed);
    else ops.removeItem(meeting.id, item.id);
    setEdits((e) => { const next = { ...e }; delete next[item.id]; return next; });
  }
  function draftRow(blockId: string, afterId?: string) {
    const active = draft?.blockId === blockId && draft.afterId === afterId;
    const id = active ? draft.id : `empty-${blockId}`;
    const text = active ? draft.text : "";
    const temp: AgendaItem = { id, text, duration: null, ownerIds: [], purposes: [], entries: [], ...(active ? draft.patch : {}) };
    const patch = (p: Partial<AgendaItem>) => setDraft((d) => d ? { ...d, patch: { ...d.patch, ...p } } : d);
    const add = (kind: EntryKind | "break") => { const saved = saveDraft(); if (saved) addAt(saved.id, kind); };
    return <div key={id} className={`document-row flex flex-wrap items-center gap-1 ${active && draft.parentId ? "ml-7" : ""}`}>
      {active && (draft.kind === "action" || /^\[\s?\]/.test(text)) ? <input type="checkbox" disabled aria-label="Nieuwe actie" /> : <Plus size={14} className="text-ink-3 shrink-0" aria-hidden />}
      <TokenInput id={id} text={text} label={active && draft.parentId ? "Nieuwe ingesprongen regel" : "Nieuw agendapunt"} people={people} inputRef={(el) => { if (el) refs.current.set(id, el); else refs.current.delete(id); }} placeholder="Typ een agendapunt…" update={patch} add={add}
        onFocus={() => { if (!active) setDraft({ id, blockId, afterId, text: "" }); }}
        onChange={(text) => setDraft((d) => ({ ...(active ? d : {}), id, blockId, afterId, text }))}
        onBlur={() => { if (active && draft.text.trim()) saveDraft(); }}
        onKeyDown={(e) => {
          if (arrows(e)) return;
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const saved = saveDraft(); if (saved) empty(saved.blockId, saved.id, "entryId" in saved ? saved.id : undefined, "kind" in saved ? saved.kind : undefined); }
          if (e.key === "Tab" || (e.key === "Enter" && !text && active && draft.parentId)) {
            const parent = afterId ?? blocks.find((b) => b.id === blockId)?.items.at(-1)?.id;
            if (e.shiftKey || (e.key === "Enter" && draft?.parentId)) { e.preventDefault(); setDraft((d) => d ? { ...d, parentId: undefined, kind: undefined } : d); }
            else if (parent) { e.preventDefault(); setDraft((d) => d ? { ...d, parentId: parent, afterId: parent, kind: "note" } : d); }
          }
          if (e.key === "Backspace" && !text) { e.preventDefault(); setDraft(null); if (afterId) focus(afterId); else { const last = blocks.find((b) => b.id === blockId)?.items.at(-1); if (last) focus(last.id); } }
        }} />
      {text && active && draft.parentId ? <EntryFields ownerId={draft.ownerId ?? draft.patch?.ownerIds?.[0] ?? null} date={draft.date ?? ""} people={people} update={(p) => setDraft((d) => d ? { ...d, ...p } : d)} /> : text ? <LineFields item={temp} people={people} update={patch} add={add} focus={() => focus(id)} /> : <span className="text-[10px] text-ink-3">Tab voor een notitie</span>}
    </div>;
  }
  function itemRow(item: AgendaItem, block: AgendaBlock) {
    const text = edits[item.id] ?? item.text;
    return <div key={item.id}>
      <div className="document-row group flex flex-wrap items-center gap-1 text-sm">
        <button type="button" aria-label={`Verplaats ${item.text}`} className="document-reveal min-h-11 w-5"><GripVertical size={14} /></button><span aria-hidden>•</span>
        <TokenInput id={item.id} text={text} label={`Agendapunt in ${block.title || "naamloos blok"}`} people={people} inputRef={(el) => { if (el) refs.current.set(item.id, el); else refs.current.delete(item.id); }} onChange={(text) => setEdits((e) => ({ ...e, [item.id]: text }))} update={(patch) => ops.updateItem(meeting.id, item.id, patch)} add={(kind) => addAt(item.id, kind)} onBlur={(text) => saveItem(item, text)} onKeyDown={(e) => {
          if (arrows(e)) return;
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) { saveItem(item, text); empty(block.id, item.id); } }
          if (e.key === "Tab" && !e.shiftKey) {
            const previous = block.items[block.items.indexOf(item) - 1];
            if (previous) { e.preventDefault(); if (text.trim()) { const eid = ops.addEntry(meeting.id, previous.id, { kind: /^\[\s?\]/.test(text) ? "action" : "note", text: text.replace(/^\[\s?\]\s*/, ""), ownerId: item.ownerIds[0] ?? null, date: "" }); ops.removeItem(meeting.id, item.id); focus(eid); } else { ops.removeItem(meeting.id, item.id); empty(block.id, previous.id, previous.id, "note"); } }
          }
          if (e.key === "Backspace" && !text) { e.preventDefault(); const index = block.items.indexOf(item); ops.removeItem(meeting.id, item.id); if (index > 0) focus(block.items[index - 1].id); }
        }} />
        {text && <LineFields item={item} people={people} update={(patch) => ops.updateItem(meeting.id, item.id, patch)} add={(kind) => addAt(item.id, kind)} focus={() => focus(item.id)} />}
        <span className="document-reveal text-[10px] text-ink-3">↵</span>
      </div>
      {item.entries.map((entry) => entryRow(entry, item, block))}
      {draft?.blockId === block.id && draft.afterId === item.id && draftRow(block.id, item.id)}
    </div>;
  }
  function entryRow(entry: Entry, item: AgendaItem, block: AgendaBlock) {
    const text = edits[entry.id] ?? entry.text;
    const update = (patch: Partial<Pick<Entry, "text" | "date" | "ownerId">>) => ops.updateEntry(meeting.id, item.id, entry.id, patch);
    const save = () => {
      if (!text.trim()) { ops.removeEntry(meeting.id, item.id, entry.id); return; }
      if (/^\[\s?\]/.test(text) && entry.kind !== "action") {
        const id = ops.addEntry(meeting.id, item.id, { kind: "action", text: text.replace(/^\[\s?\]\s*/, ""), ownerId: entry.ownerId, date: entry.date });
        ops.removeEntry(meeting.id, item.id, entry.id); focus(id);
      } else update({ text });
    };
    const action = meeting.actions.find((a) => a.id === entry.actionId);
    return <div key={entry.id} className="document-row ml-7 flex flex-wrap items-center gap-2 text-sm">
      {entry.kind === "action" ? <label className="flex min-h-11 items-center"><input type="checkbox" aria-label={`Actie afronden: ${entry.text}`} checked={action?.done ?? false} onChange={() => { if (entry.actionId) ops.toggleAction(meeting.id, entry.actionId); }} /></label> : entry.kind !== "note" ? <span className="text-xs text-brand">{entry.kind === "decision" ? "Beslissing" : "Document"}</span> : <span aria-hidden className="text-ink-3">↳</span>}
      <TokenInput id={entry.id} text={text} label={`${entry.kind === "action" ? "Actie" : "Notitie"} bij ${item.text}`} people={people} inputRef={(el) => { if (el) { refs.current.set(entry.id, el); el.dataset.entryParent = item.id; } else refs.current.delete(entry.id); }} onChange={(text) => setEdits((e) => ({ ...e, [entry.id]: text }))} update={(patch) => { if (patch.ownerIds) update({ ownerId: patch.ownerIds[0] ?? null }); }} add={(kind) => addAt(item.id, kind)} onBlur={save} onKeyDown={(e) => {
        if (arrows(e)) return;
        if ((e.key === "Enter" && !text) || (e.key === "Tab" && e.shiftKey)) { e.preventDefault(); ops.removeEntry(meeting.id, item.id, entry.id); if (text.trim()) { const id = ops.addAgendaItem(meeting.id, block.id, text); ops.moveItem(meeting.id, id, block.id, block.items.indexOf(item) + 1); focus(id); } else empty(block.id, item.id); }
        else if (e.key === "Enter") { e.preventDefault(); save(); empty(block.id, item.id, item.id, entry.kind); }
        if (e.key === "Backspace" && !text) { e.preventDefault(); ops.removeEntry(meeting.id, item.id, entry.id); focus(item.entries[item.entries.indexOf(entry) - 1]?.id ?? item.id); }
      }} />
      {entry.kind === "action" && <EntryFields ownerId={entry.ownerId} date={entry.date} people={people} update={update} focus={() => focus(entry.id)} />}
    </div>;
  }
  return <div>
    {blocks.map((b) => <section key={b.id} className="mb-5">
      {b.kind === "break" ? <div className="flex items-center gap-3 text-xs text-ink-3"><hr className="flex-1 border-line" />Pauze · {b.duration} min<hr className="flex-1 border-line" /></div> : <>
        {b.title && <div className="document-row flex items-center gap-2"><input aria-label="Bloktitel" className="flex-1 text-lg font-semibold" defaultValue={b.title} onBlur={(e) => { if (e.target.value.trim()) ops.updateBlock(meeting.id, b.id, { title: e.target.value }); }} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === "Backspace") && !e.currentTarget.value) { e.preventDefault(); removeBlock(b); } else if (e.key === "Enter") { ops.updateBlock(meeting.id, b.id, { title: e.currentTarget.value }); empty(b.id); } }} /><span className="document-reveal text-xs text-ink-3">{blockDuration(b) ? `${blockDuration(b)} min` : ""}</span></div>}
        {b.items.map((i) => itemRow(i, b))}
        {draftRow(b.id)}
      </>}
    </section>)}
    {!blocks.some((b) => b.kind === "topics") && draftRow("")}
    <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-3">Enter nieuw agendapunt · Tab notitie bij het punt · [] actie · # nieuw blok · @ eigenaar · 10m duur · / doel, beslissing of actie.</p>
  </div>;
}
