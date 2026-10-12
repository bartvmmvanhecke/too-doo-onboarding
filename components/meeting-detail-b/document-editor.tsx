"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Plus, GripVertical } from "lucide-react";
import { newBlock, blockDuration, type AgendaBlock, type AgendaItem } from "@/lib/agenda";
import { useStore, type Meeting } from "@/lib/store";

type Draft = { id: string; blockId: string; afterId?: string; text: string };
export function DocumentEditor({ meeting }: { meeting: Meeting }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const sequence = useRef(0);
  const refs = useRef(new Map<string, HTMLInputElement>());
  const ops = useStore.getState();
  const blocks = meeting.blocks.filter((b) => b.kind !== "actions");
  const focus = (id: string) => requestAnimationFrame(() => { const el = refs.current.get(id); el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); });
  function empty(blockId: string, afterId?: string) {
    const id = `draft-${++sequence.current}`;
    setDraft({ id, blockId, afterId, text: "" });
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
    if (draft.text.trim().startsWith("#")) {
      const title = draft.text.trim().slice(1).trim();
      if (!title) return null;
      const id = ops.addBlock(meeting.id, "topics");
      ops.updateBlock(meeting.id, id, { title });
      setDraft(null);
      empty(id);
      return null;
    }
    const id = ops.addAgendaItem(meeting.id, blockId, draft.text.trim());
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
  function draftRow(blockId: string, afterId?: string) {
    const active = draft?.blockId === blockId && draft.afterId === afterId;
    const id = active ? draft.id : `empty-${blockId}`;
    return <div key={id} className="document-row flex items-center gap-2">
      <Plus size={14} className="text-ink-3 shrink-0" aria-hidden />
      <input data-document-line ref={(el) => { if (el) refs.current.set(id, el); else refs.current.delete(id); }} aria-label="Nieuw agendapunt" className="flex-1 text-sm" placeholder="Typ een agendapunt…" value={active ? draft.text : ""} onFocus={() => { if (!active) { setDraft({ id, blockId, afterId, text: "" }); } }} onChange={(e) => setDraft({ id, blockId, afterId, text: e.target.value })} onBlur={() => { if (active && draft.text.trim()) saveDraft(); }} onKeyDown={(e) => {
        if (arrows(e)) return;
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const saved = saveDraft(); if (saved) empty(saved.blockId, saved.id); }
        if (e.key === "Backspace" && !draft?.text) { e.preventDefault(); setDraft(null); if (afterId) focus(afterId); else { const last = blocks.find((b) => b.id === blockId)?.items.at(-1); if (last) focus(last.id); } }
      }} />
      {!draft?.text && <span className="text-[10px] text-ink-3">Tab voor een notitie</span>}
    </div>;
  }
  function itemRow(item: AgendaItem, block: AgendaBlock) {
    return <div key={item.id}>
      <div className="document-row group flex flex-wrap items-center gap-1 text-sm">
        <button type="button" aria-label={`Verplaats ${item.text}`} className="document-reveal min-h-11 w-5"><GripVertical size={14} /></button><span aria-hidden>•</span>
        <input data-document-line ref={(el) => { if (el) refs.current.set(item.id, el); else refs.current.delete(item.id); }} aria-label={`Agendapunt in ${block.title || "naamloos blok"}`} className="flex-1" defaultValue={item.text} onBlur={(e) => { if (e.target.value.trim()) ops.updateItem(meeting.id, item.id, { text: e.target.value }); else ops.removeItem(meeting.id, item.id); }} onKeyDown={(e) => {
          if (arrows(e)) return;
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (e.currentTarget.value.trim()) { ops.updateItem(meeting.id, item.id, { text: e.currentTarget.value }); empty(block.id, item.id); } }
          if (e.key === "Backspace" && !e.currentTarget.value) { e.preventDefault(); const index = block.items.indexOf(item); ops.removeItem(meeting.id, item.id); if (index > 0) focus(block.items[index - 1].id); }
        }} />
        {item.duration && <span className="text-xs text-ink-3">{item.duration} min</span>}
        <span className="document-reveal text-[10px] text-ink-3">↵</span>
      </div>
      {draft?.blockId === block.id && draft.afterId === item.id && draftRow(block.id, item.id)}
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
