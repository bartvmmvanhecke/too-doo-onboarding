"use client";
import { useRef, useState, useEffect, useLayoutEffect, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandList, CommandItem } from "@/components/ui/command";
import { Plus, GripVertical, ChevronDown } from "lucide-react";
import { newBlock, blockDuration, type AgendaBlock, type AgendaItem, type EntryKind, type Entry } from "@/lib/agenda";
import { SuggestionCards } from "./suggestions";
import type { Suggestion } from "@/lib/meeting-suggestions";
import { Dictation, speechSupported } from "./dictation";
import { parsePastedLines, DOCUMENT_TEMPLATES, documentTemplate } from "@/lib/meeting-document";
import { weekdayLong } from "@/lib/date";
import { EntryFields } from "./entry-fields";
import { LineFields } from "./line-fields";
import { TokenInput, parseDuration } from "./inline-tokens";
import { useMeeting, useMeetingOps } from "@/components/meeting/meeting-context";
import { useStore, type Meeting } from "@/lib/store";

/** Linkerkantlijn van een agendapuntrij (de grip); de invoerrij houdt dezelfde ruimte vrij. */
const rowGrip = "document-reveal min-h-11 w-5";
/** "↵" rechts in een agendapuntrij; de invoerrij reserveert hem onzichtbaar, zodat beide rijen even breed lopen. */
function ReturnHint({ className = "document-reveal" }: { className?: string }) {
  return <span className={`${className} text-[10px] text-ink-3`}>↵</span>;
}

type Draft = {
  id: string;
  blockId: string;
  afterId?: string;
  text: string;
  patch?: Partial<AgendaItem>;
  parentId?: string;
  afterEntryId?: string;
  kind?: EntryKind;
  ownerId?: string | null;
  date?: string;
};
export function DocumentEditor({ meeting, simplified = false }: { meeting: Meeting; simplified?: boolean }) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [preview, setPreview] = useState<AgendaBlock[] | null>(null);
  const insertedFocus = useRef<string | null>(null);
  const context = useMeeting();
  const people = context.people.filter((p) => meeting.participants.includes(p.id));
  const currentMeeting = () =>
    context.getCurrentMeeting?.() ?? useStore.getState().meetings.find((m) => m.id === meeting.id)!;
  const [supportsSpeech] = useState(speechSupported);
  const [reviewed, setReviewed] = useState<Record<string, string>>({});
  const [structured, setStructured] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [currentDraft, setDraft] = useState<Draft | null>(null);
  const draft = currentDraft;
  const pendingFocus = useRef<string | null>(null);
  const committedDraft = useRef<string | null>(null);
  const sequence = useRef(0);
  const documentFile = useRef<HTMLInputElement>(null);
  const documentParent = useRef<string | null>(null);
  const refs = useRef(new Map<string, HTMLInputElement>());
  const ops = useMeetingOps();
  const content = meeting.blocks.some((b) => b.items.some((i) => i.text.trim()));
  const hasCustomBlocks = meeting.blocks.some(
    (b) => b.kind === "break" || (b.kind === "topics" && b.title && !["Lopende zaken", "Varia"].includes(b.title)),
  );
  const pristine = !content && !structured && !hasCustomBlocks;
  const blocks = pristine ? [] : meeting.blocks.filter((b) => b.kind !== "actions");
  const showExamples = !simplified && !content && !draft?.text;
  useEffect(() => {
    if (!content && (!simplified || document.activeElement === document.body || document.activeElement === null))
      refs.current.get("empty-")?.focus();
  }, [content, simplified]);
  function applyFocus(id: string) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return false;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    return true;
  }
  useLayoutEffect(() => {
    if (pendingFocus.current && applyFocus(pendingFocus.current)) pendingFocus.current = null;
  });
  const focus = (id: string) => {
    pendingFocus.current = id;
    requestAnimationFrame(() => {
      if (pendingFocus.current === id && applyFocus(id)) pendingFocus.current = null;
    });
  };
  function empty(blockId: string, afterId?: string, parentId?: string, kind?: EntryKind, afterEntryId?: string) {
    const id = `draft-${++sequence.current}`;
    setDraft({ id, blockId, afterId, parentId, kind, afterEntryId, text: "" });
    focus(id);
  }
  function saveDraft(sourceText?: string) {
    const draft = sourceText !== undefined && currentDraft ? { ...currentDraft, text: sourceText } : currentDraft;
    if (
      !draft?.text.trim() ||
      committedDraft.current === draft.id ||
      /^#\s*$/.test(draft.text.trim()) ||
      /^\[\s?\]\s*$/.test(draft.text.trim())
    )
      return null;
    committedDraft.current = draft.id;
    let blockId = draft.blockId;
    if (!blockId) {
      const block = newBlock("topics", { title: "" });
      ops.putMeeting({
        ...currentMeeting(),
        blocks: [...meeting.blocks.filter((b) => b.kind === "actions" || b.items.length || !pristine), block],
      });
      blockId = block.id;
    }
    if (draft.parentId) {
      const action = /^\[\s?\]\s*/.test(draft.text);
      const text = draft.text.replace(/^\[\s?\]\s*/, "").trim();
      if (!text) return null;
      const entryId = ops.addEntry(meeting.id, draft.parentId, {
        kind: action ? "action" : (draft.kind ?? "note"),
        text,
        ownerId: draft.ownerId ?? draft.patch?.ownerIds?.[0] ?? null,
        date: draft.date ?? "",
      });
      if (draft.afterEntryId) {
        const item = currentMeeting()
          .blocks.flatMap((b) => b.items)
          .find((i) => i.id === draft.parentId)!;
        const added = item.entries.find((e) => e.id === entryId)!;
        const entries = item.entries.filter((e) => e.id !== entryId);
        entries.splice(entries.findIndex((e) => e.id === draft.afterEntryId) + 1, 0, added);
        ops.updateItem(meeting.id, item.id, { entries });
      }
      setDraft(null);
      return { id: draft.parentId, blockId, entryId, kind: action ? ("action" as const) : (draft.kind ?? "note") };
    }
    if (draft.text.trim().startsWith("#")) {
      const title = draft.text.trim().slice(1).trim();
      if (!title) return null;
      setStructured(true);
      const current = currentMeeting();
      const unnamed = current.blocks.find((b) => b.kind === "topics" && !b.title);
      if (unnamed?.items.length) ops.updateBlock(meeting.id, unnamed.id, { title: "Lopende zaken" });
      else if (unnamed) ops.removeBlock(meeting.id, unnamed.id);
      const id = ops.addBlock(meeting.id, "topics");
      ops.updateBlock(meeting.id, id, { title });
      setDraft(null);
      empty(id);
      return null;
    }
    const id = ops.addAgendaItem(meeting.id, blockId, parseDuration(draft.text).text);
    setReviewed((r) => ({ ...r, [id]: parseDuration(draft.text).text }));
    ops.updateItem(meeting.id, id, {
      ...draft.patch,
      ...(parseDuration(draft.text).duration !== undefined ? { duration: parseDuration(draft.text).duration } : {}),
    });
    const block = currentMeeting().blocks.find((b) => b.id === blockId)!;
    if (draft.afterId) ops.moveItem(meeting.id, id, blockId, block.items.findIndex((i) => i.id === draft.afterId) + 1);
    setDraft(null);
    return { id, blockId };
  }
  function arrows(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return false;
    const inputs = [...document.querySelectorAll<HTMLInputElement>("[data-document-line]")];
    const index = inputs.indexOf(e.currentTarget);
    const target = inputs[index + (e.key === "ArrowUp" ? -1 : 1)];
    if (target) {
      e.preventDefault();
      target.focus();
    }
    return true;
  }
  function removeBlock(block: AgendaBlock) {
    const snapshot = currentMeeting();
    const previous = blocks.slice(0, blocks.indexOf(block)).findLast((b) => b.kind === "topics");
    const target = previous ?? newBlock("topics", { title: "" });
    const rest = snapshot.blocks
      .filter((b) => b.id !== block.id)
      .map((b) => (b.id === target.id ? { ...b, items: [...b.items, ...block.items] } : b));
    if (!previous && block.items.length) rest.unshift({ ...target, items: block.items });
    ops.putMeeting({ ...snapshot, blocks: rest });
    toast("Blok verwijderd", {
      action: {
        label: "Ongedaan maken",
        onClick: () =>
          ops.putMeeting({
            ...currentMeeting(),
            blocks: snapshot.blocks,
          }),
      },
    });
  }
  function paste(text: string, initialBlockId: string, afterId?: string, parentId?: string) {
    const lines = parsePastedLines(text);
    if (!lines.length) return;
    let blockId = initialBlockId;
    if (!blockId) {
      const block = newBlock("topics", { title: "" });
      const current = currentMeeting();
      ops.putMeeting({
        ...current,
        blocks: [...current.blocks.filter((b) => b.kind === "actions" || b.items.length || !pristine), block],
      });
      blockId = block.id;
    }
    let previous = parentId ?? afterId;
    let last = previous;
    let index = afterId
      ? currentMeeting()
          .blocks.find((b) => b.id === blockId)!
          .items.findIndex((i) => i.id === afterId) + 1
      : currentMeeting().blocks.find((b) => b.id === blockId)!.items.length;
    for (const line of lines) {
      if ((line.indented || parentId) && previous) {
        const action = /^\[\s?\]/.test(line.text);
        last = ops.addEntry(meeting.id, previous, {
          kind: action ? "action" : "note",
          text: line.text.replace(/^\[\s?\]\s*/, ""),
          ownerId: null,
          date: "",
        });
      } else {
        const parsed = parseDuration(line.text);
        previous = ops.addAgendaItem(meeting.id, blockId, parsed.text);
        ops.updateItem(meeting.id, previous, parsed);
        ops.moveItem(meeting.id, previous, blockId, index++);
        last = previous;
      }
    }
    setDraft(null);
    if (last) focus(last);
  }
  function addAt(itemId: string, kind: EntryKind | "break") {
    if (kind === "document") {
      documentParent.current = itemId;
      documentFile.current?.click();
      return;
    }
    if (kind === "break") {
      const id = ops.addBlock(meeting.id, "break");
      const bi = meeting.blocks.findIndex((b) => b.items.some((i) => i.id === itemId));
      if (bi >= 0) ops.moveBlock(meeting.id, id, bi + 1);
      return;
    }
    const block = meeting.blocks.find((b) => b.items.some((i) => i.id === itemId));
    if (block) empty(block.id, itemId, itemId, kind);
  }
  function saveItem(item: AgendaItem, text: string) {
    setReviewed((r) => ({ ...r, [item.id]: parseDuration(text).text }));
    const parsed = parseDuration(text);
    if (parsed.text.trim()) ops.updateItem(meeting.id, item.id, parsed);
    else ops.removeItem(meeting.id, item.id);
    setEdits((e) => {
      const next = { ...e };
      delete next[item.id];
      return next;
    });
  }
  function confirmSuggestion(itemId: string, suggestion: Suggestion, note = false) {
    const current = currentMeeting();
    const item = current.blocks.flatMap((b) => b.items).find((i) => i.id === itemId);
    if (!item) return;
    if (suggestion.kind === "decision" && !note) {
      const before = item.purposes;
      ops.updateItem(meeting.id, itemId, { purposes: [...new Set([...before, "decide" as const])] });
      toast("Doel Beslissen toegevoegd", {
        action: { label: "Ongedaan maken", onClick: () => ops.updateItem(meeting.id, itemId, { purposes: before }) },
      });
      return;
    }
    const id = ops.addEntry(meeting.id, itemId, {
      kind: suggestion.kind,
      text: suggestion.title,
      ownerId: suggestion.ownerId,
      date: suggestion.date,
    });
    toast(suggestion.kind === "action" ? "Actie toegevoegd" : "Beslissing toegevoegd", {
      action: { label: "Ongedaan maken", onClick: () => ops.removeEntry(meeting.id, itemId, id) },
    });
  }
  function proposals(sourceId: string, text: string, itemId?: string, note = false) {
    if (!text.trim() || text.trim().startsWith("#") || /^\[\s?\]/.test(text)) return null;
    return (
      <SuggestionCards
        sourceId={sourceId}
        text={text}
        meetingId={meeting.id}
        participants={people}
        meetingDate={meeting.date || ""}
        immediate={reviewed[sourceId] === text}
        onResolved={() => {
          if (draft?.id === sourceId) {
            const saved = saveDraft();
            if (saved) focus(("entryId" in saved ? saved.entryId : undefined) ?? saved.id);
          } else if (itemId) {
            if (sourceId === itemId) ops.updateItem(meeting.id, itemId, parseDuration(text));
            else ops.updateEntry(meeting.id, itemId, sourceId, { text });
          }
        }}
        confirm={(suggestion) => {
          let target = itemId;
          if (!target || draft?.id === sourceId) {
            const saved = saveDraft();
            target = saved?.id ?? target;
            if (saved) focus(("entryId" in saved ? saved.entryId : undefined) ?? saved.id);
          }
          if (target) confirmSuggestion(target, suggestion, note);
        }}
      />
    );
  }
  function insertTemplate(template: AgendaBlock[]) {
    const snapshot = currentMeeting();
    ops.putMeeting({ ...snapshot, blocks: [...snapshot.blocks, ...template] });
    setStructured(true);
    setDraft(null);
    insertedFocus.current = template.flatMap((b) => b.items)[0]?.id ?? null;
    setTemplatesOpen(false);
    setPreview(null);
    const ids = new Set(template.map((b) => b.id));
    toast("Sjabloon toegevoegd", {
      action: {
        label: "Ongedaan maken",
        onClick: () => {
          ops.putMeeting({ ...currentMeeting(), blocks: currentMeeting().blocks.filter((b) => !ids.has(b.id)) });
        },
      },
    });
  }
  function draftRow(blockId: string, afterId?: string) {
    const active = draft?.blockId === blockId && draft.afterId === afterId;
    const baseId = `empty-${blockId}`;
    const id = active ? draft.id : draft?.id === baseId ? `${baseId}-available` : baseId;
    const text = active ? draft.text : "";
    const temp: AgendaItem = {
      id,
      text,
      duration: null,
      ownerIds: [],
      purposes: [],
      entries: [],
      ...(active ? draft.patch : {}),
    };
    const patch = (p: Partial<AgendaItem>) => setDraft((d) => (d ? { ...d, patch: { ...d.patch, ...p } } : d));
    const add = (kind: EntryKind | "break", sourceText?: string) => {
      if (kind === "break") {
        const bid = ops.addBlock(meeting.id, "break");
        const bi = meeting.blocks.findIndex((b) => b.id === blockId);
        if (bi >= 0) ops.moveBlock(meeting.id, bid, bi + 1);
        setDraft(null);
        empty(blockId, afterId);
        return;
      }
      const saved = saveDraft(sourceText);
      if (saved) addAt(saved.id, kind);
    };
    const indented = active && !!draft.parentId;
    return (
      <div key={id}>
        <div className={`document-row flex flex-wrap items-center gap-1 ${indented ? "ml-7" : ""}`}>
          {!indented && <span aria-hidden className={rowGrip} />}
          {active && (draft.kind === "action" || /^\[\s?\]/.test(text)) ? (
            <input type="checkbox" disabled aria-label="Nieuwe actie" />
          ) : (
            <Plus size={14} className="text-ink-3 shrink-0" aria-hidden />
          )}
          <TokenInput
            id={id}
            text={text}
            label={active && draft.parentId ? "Nieuwe ingesprongen regel" : "Nieuw agendapunt"}
            people={people}
            inputRef={(el) => {
              if (el) refs.current.set(id, el);
              else refs.current.delete(id);
            }}
            placeholder={
              simplified
                ? content
                  ? "Nieuw agendapunt…"
                  : "+ Wat wil je bespreken? Typ of plak je agenda..."
                : "Typ een agendapunt…"
            }
            purposes={temp.purposes}
            update={patch}
            add={add}
            onPaste={(e) => {
              if (e.clipboardData.getData("text").includes("\n")) {
                e.preventDefault();
                paste(e.clipboardData.getData("text"), blockId, afterId, active ? draft.parentId : undefined);
              }
            }}
            onFocus={() => {
              if (!active) {
                committedDraft.current = null;
                setDraft({ id, blockId, afterId, text: "" });
              }
            }}
            onChange={(text) => {
              if (committedDraft.current === id) committedDraft.current = null;
              setDraft((d) => ({ ...(active ? d : {}), id, blockId, afterId, text }));
            }}
            onBlur={() => {
              if (active && draft.text.trim() && committedDraft.current !== id) saveDraft();
            }}
            onKeyDown={(e) => {
              if (arrows(e)) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const saved = saveDraft();
                if (saved)
                  empty(
                    saved.blockId,
                    saved.id,
                    "entryId" in saved ? saved.id : undefined,
                    "kind" in saved ? saved.kind : undefined,
                    "entryId" in saved ? saved.entryId : undefined,
                  );
              }
              if (e.key === "Tab" || (e.key === "Enter" && !text && active && draft.parentId)) {
                const parent = afterId ?? blocks.find((b) => b.id === blockId)?.items.at(-1)?.id;
                if (e.shiftKey || (e.key === "Enter" && draft?.parentId)) {
                  e.preventDefault();
                  setDraft((d) => (d ? { ...d, parentId: undefined, kind: undefined } : d));
                  focus(id);
                } else if (parent) {
                  e.preventDefault();
                  setDraft((d) => (d ? { ...d, parentId: parent, afterId: parent, kind: "note" } : d));
                  focus(id);
                }
              }
              if (e.key === "Backspace" && !text) {
                e.preventDefault();
                setDraft(null);
                if (afterId) focus(afterId);
                else {
                  const last = blocks.find((b) => b.id === blockId)?.items.at(-1);
                  if (last) focus(last.id);
                }
              }
            }}
          />
          {!text && supportsSpeech && (
            <Dictation
              onText={(spoken) => {
                setDraft((d) => ({ ...(d ?? {}), id, blockId, afterId, text: spoken }));
                focus(id);
              }}
            />
          )}
          {text && active && draft.parentId ? (
            <EntryFields
              ownerId={draft.ownerId ?? draft.patch?.ownerIds?.[0] ?? null}
              date={draft.date ?? ""}
              people={people}
              update={(p) => setDraft((d) => (d ? { ...d, ...p } : d))}
            />
          ) : text ? (
            <LineFields item={temp} people={people} update={patch} add={add} focus={() => focus(id)} />
          ) : (
            <>
              {!simplified && <span className="text-[10px] text-ink-3">Tab voor een notitie</span>}
              {/* Zelfde plek als de toevoegen-+ van een agendapunt (LineFields). */}
              <Plus size={16} aria-hidden className="invisible shrink-0" />
            </>
          )}
          {!indented && <ReturnHint className="invisible" />}
        </div>
        {active &&
          draft.kind !== "action" &&
          draft.kind !== "decision" &&
          proposals(id, text, draft.parentId, !!draft.parentId)}
      </div>
    );
  }
  function itemRow(item: AgendaItem, block: AgendaBlock) {
    const text = edits[item.id] ?? item.text;
    return (
      <div
        key={item.id}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("text/agenda-item")) e.preventDefault();
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData("text/agenda-item");
          if (id) {
            e.preventDefault();
            e.stopPropagation();
            const from = block.items.findIndex((i) => i.id === id);
            ops.moveItem(
              meeting.id,
              id,
              block.id,
              Math.max(0, block.items.indexOf(item) - (from >= 0 && from < block.items.indexOf(item) ? 1 : 0)),
            );
            setAnnouncement("Agendapunt verplaatst");
          }
        }}
      >
        <div className="document-row group flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/agenda-item", item.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                const index = block.items.indexOf(item);
                const delta = e.key === "ArrowUp" ? -1 : 1;
                const target = index + delta;
                const topics = blocks.filter((b) => b.kind === "topics");
                const next = topics[topics.indexOf(block) + delta];
                if (target >= 0 && target < block.items.length) ops.moveItem(meeting.id, item.id, block.id, target);
                else if (next) ops.moveItem(meeting.id, item.id, next.id, delta > 0 ? 0 : next.items.length);
                setAnnouncement(`${item.text} verplaatst`);
                requestAnimationFrame(() =>
                  document.querySelector<HTMLButtonElement>(`[data-b-grip="${item.id}"]`)?.focus(),
                );
              }
            }}
            data-b-grip={item.id}
            aria-label={`Verplaats ${item.text}`}
            className={rowGrip}
          >
            <GripVertical size={14} />
          </button>
          <span aria-hidden>•</span>
          <TokenInput
            id={item.id}
            text={text}
            label={`Agendapunt in ${block.title || "naamloos blok"}`}
            people={people}
            inputRef={(el) => {
              if (el) refs.current.set(item.id, el);
              else refs.current.delete(item.id);
            }}
            onPaste={(e) => {
              if (e.clipboardData.getData("text").includes("\n")) {
                e.preventDefault();
                paste(e.clipboardData.getData("text"), block.id, item.id);
              }
            }}
            onChange={(text) => setEdits((e) => ({ ...e, [item.id]: text }))}
            update={(patch) => ops.updateItem(meeting.id, item.id, patch)}
            purposes={item.purposes}
            add={(kind, sourceText) => {
              if (sourceText !== undefined) saveItem(item, sourceText);
              addAt(item.id, kind);
            }}
            onBlur={(text) => saveItem(item, text)}
            onKeyDown={(e) => {
              if (arrows(e)) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) {
                  saveItem(item, text);
                  empty(block.id, item.id);
                }
              }
              if (e.key === "Tab" && !e.shiftKey) {
                const previous = block.items[block.items.indexOf(item) - 1];
                if (previous) {
                  e.preventDefault();
                  if (text.trim()) {
                    const eid = ops.addEntry(meeting.id, previous.id, {
                      kind: /^\[\s?\]/.test(text) ? "action" : "note",
                      text: text.replace(/^\[\s?\]\s*/, ""),
                      ownerId: item.ownerIds[0] ?? null,
                      date: "",
                    });
                    ops.removeItem(meeting.id, item.id);
                    focus(eid);
                  } else {
                    ops.removeItem(meeting.id, item.id);
                    empty(block.id, previous.id, previous.id, "note");
                  }
                }
              }
              if (e.key === "Backspace" && !text) {
                e.preventDefault();
                const index = block.items.indexOf(item);
                ops.removeItem(meeting.id, item.id);
                if (index > 0) focus(block.items[index - 1].id);
              }
            }}
          />
          {text && (
            <LineFields
              item={item}
              people={people}
              update={(patch) => ops.updateItem(meeting.id, item.id, patch)}
              add={(kind) => addAt(item.id, kind)}
              focus={() => focus(draft?.parentId === item.id ? draft.id : item.id)}
            />
          )}
          <ReturnHint />
        </div>
        {proposals(item.id, text, item.id)}
        {item.entries.map((entry) => (
          <div key={entry.id}>
            {entryRow(entry, item, block)}
            {draft?.afterEntryId === entry.id && draftRow(block.id, item.id)}
          </div>
        ))}
        {draft?.blockId === block.id && draft.afterId === item.id && !draft.afterEntryId && draftRow(block.id, item.id)}
      </div>
    );
  }
  function entryRow(entry: Entry, item: AgendaItem, block: AgendaBlock) {
    const text = edits[entry.id] ?? entry.text;
    const update = (patch: Partial<Pick<Entry, "text" | "date" | "ownerId">>) =>
      ops.updateEntry(meeting.id, item.id, entry.id, patch);
    const save = () => {
      setReviewed((r) => ({ ...r, [entry.id]: text }));
      if (!text.trim()) {
        ops.removeEntry(meeting.id, item.id, entry.id);
        return;
      }
      if (/^\[\s?\]/.test(text) && entry.kind !== "action") {
        const id = ops.addEntry(meeting.id, item.id, {
          kind: "action",
          text: text.replace(/^\[\s?\]\s*/, ""),
          ownerId: entry.ownerId,
          date: entry.date,
        });
        ops.removeEntry(meeting.id, item.id, entry.id);
        focus(id);
      } else update({ text });
    };
    const action = meeting.actions.find((a) => a.id === entry.actionId);
    return (
      <div key={entry.id}>
        <div className="document-row ml-7 flex flex-wrap items-center gap-2 text-sm">
          {entry.kind === "action" ? (
            <label className="flex min-h-11 items-center">
              <input
                type="checkbox"
                aria-label={`Actie afronden: ${entry.text}`}
                checked={action?.done ?? false}
                onChange={() => {
                  if (entry.actionId) ops.toggleAction(meeting.id, entry.actionId);
                }}
              />
            </label>
          ) : entry.kind !== "note" ? (
            <span className="text-xs text-brand">{entry.kind === "decision" ? "Beslissing" : "Document"}</span>
          ) : (
            <span aria-hidden className="text-ink-3">
              ↳
            </span>
          )}
          <TokenInput
            id={entry.id}
            text={text}
            label={`${entry.kind === "action" ? "Actie" : "Notitie"} bij ${item.text}`}
            people={people}
            inputRef={(el) => {
              if (el) {
                refs.current.set(entry.id, el);
                el.dataset.entryParent = item.id;
              } else refs.current.delete(entry.id);
            }}
            onChange={(text) => setEdits((e) => ({ ...e, [entry.id]: text }))}
            update={(patch) => {
              if (patch.ownerIds) update({ ownerId: patch.ownerIds[0] ?? null });
            }}
            purposes={item.purposes}
            add={(kind, sourceText) => {
              if (sourceText !== undefined) saveItem(item, sourceText);
              addAt(item.id, kind);
            }}
            onBlur={save}
            onKeyDown={(e) => {
              if (arrows(e)) return;
              if ((e.key === "Enter" && !text) || (e.key === "Tab" && e.shiftKey)) {
                e.preventDefault();
                ops.removeEntry(meeting.id, item.id, entry.id);
                if (text.trim()) {
                  const id = ops.addAgendaItem(meeting.id, block.id, text);
                  ops.moveItem(meeting.id, id, block.id, block.items.indexOf(item) + 1);
                  focus(id);
                } else empty(block.id, item.id);
              } else if (e.key === "Enter") {
                e.preventDefault();
                save();
                empty(block.id, item.id, item.id, entry.kind, entry.id);
              }
              if (e.key === "Backspace" && !text) {
                e.preventDefault();
                ops.removeEntry(meeting.id, item.id, entry.id);
                focus(item.entries[item.entries.indexOf(entry) - 1]?.id ?? item.id);
              }
            }}
          />
          {entry.kind === "action" && (
            <EntryFields
              ownerId={entry.ownerId}
              date={entry.date}
              people={people}
              update={update}
              focus={() => focus(entry.id)}
            />
          )}
        </div>
        {entry.kind === "note" && proposals(entry.id, text, item.id, true)}
      </div>
    );
  }
  return (
    <div
      className={
        simplified
          ? `onboarding-notepad ${content || hasCustomBlocks ? "" : "onboarding-notepad-empty"} flex min-h-[380px] flex-col`
          : undefined
      }
    >
      {simplified && (
        <div className="relative z-10 mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Agendapunten</h2>
          <Popover
            open={templatesOpen}
            onOpenChange={(open) => {
              setTemplatesOpen(open);
              if (!open) setPreview(null);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs text-ink-3 hover:bg-app hover:text-ink"
              >
                Gebruik een sjabloon
                <ChevronDown size={14} aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="app-theme max-w-[calc(100vw-24px)] w-80"
              onCloseAutoFocus={(e) => {
                if (insertedFocus.current) {
                  e.preventDefault();
                  focus(insertedFocus.current);
                  insertedFocus.current = null;
                }
              }}
            >
              {preview ? (
                <div className="p-3 text-sm">
                  <p className="mb-2 font-semibold">Agenda van vorige vergadering</p>
                  {preview.length ? (
                    <>
                      <ul className="max-h-60 overflow-y-auto mb-3">
                        {preview.flatMap((b) => [
                          ...(b.title
                            ? [
                                <li key={b.id} className="font-medium mt-2">
                                  {b.title}
                                </li>,
                              ]
                            : []),
                          ...b.items.map((i) => (
                            <li key={i.id} className="py-1 text-ink-3">
                              {i.text}
                            </li>
                          )),
                        ])}
                      </ul>
                      <button type="button" className="min-h-11 text-brand" onClick={() => insertTemplate(preview)}>
                        Agenda toevoegen
                      </button>
                    </>
                  ) : (
                    <p className="text-ink-3">Er is nog geen vorige vergadering met een agenda in deze reeks.</p>
                  )}
                  <button type="button" className="block min-h-11 text-ink-3" onClick={() => setPreview(null)}>
                    Terug naar sjablonen
                  </button>
                </div>
              ) : (
                <Command loop tabIndex={0} aria-label="Sjablonen">
                  <CommandList aria-label="Sjablonen">
                    {DOCUMENT_TEMPLATES.map((name, index) => (
                      <CommandItem
                        key={name}
                        onSelect={() => {
                          const current = currentMeeting();
                          if (index === 1) {
                            const cutoffDate = current.date ?? new Date().toISOString().slice(0, 10);
                            const previous = useStore
                              .getState()
                              .meetings.filter(
                                (m) =>
                                  m.id !== current.id &&
                                  (current.seriesId ? m.seriesId === current.seriesId : m.name === current.name) &&
                                  !!m.date &&
                                  (m.date < cutoffDate ||
                                    (m.date === cutoffDate &&
                                      m.time !== null &&
                                      current.time !== null &&
                                      m.time < current.time)) &&
                                  m.blocks.some((b) => b.items.length),
                              )
                              .sort(
                                (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.time ?? 0) - (a.time ?? 0),
                              )[0];
                            setPreview(
                              previous ? documentTemplate(name, { ...current, name: previous.name }, [previous]) : [],
                            );
                          } else insertTemplate(documentTemplate(name, current, useStore.getState().meetings));
                        }}
                      >
                        {index === 1 ? "Agenda van vorige vergadering" : name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div className={simplified ? "flex-1" : undefined}>
        <input
          ref={documentFile}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-label="Document toevoegen"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const itemId = documentParent.current;
            if (file && itemId)
              ops.addEntry(meeting.id, itemId, {
                kind: "document",
                text: file.name,
                size: file.size,
                ownerId: null,
                date: "",
              });
            e.target.value = "";
            if (itemId) focus(itemId);
          }}
        />
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        {blocks.map((b) => (
          <section
            key={b.id}
            className="mb-5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const itemId = e.dataTransfer.getData("text/agenda-item");
              const blockId = e.dataTransfer.getData("text/agenda-block");
              if (itemId && b.kind === "topics") ops.moveItem(meeting.id, itemId, b.id, b.items.length);
              if (blockId) {
                const from = meeting.blocks.findIndex((x) => x.id === blockId);
                const to = meeting.blocks.indexOf(b);
                ops.moveBlock(meeting.id, blockId, Math.max(0, to - (from < to ? 1 : 0)));
              }
              setAnnouncement("Agenda verplaatst");
            }}
          >
            {b.kind === "break" ? (
              <div className="flex items-center gap-3 text-xs text-ink-3">
                <hr className="flex-1 border-line" />
                Pauze · {b.duration} min
                <hr className="flex-1 border-line" />
              </div>
            ) : (
              <>
                {b.title && (
                  <div className="document-row flex items-center gap-2">
                    <button
                      type="button"
                      draggable
                      aria-label={`Verplaats blok ${b.title}`}
                      className="document-reveal min-h-11 w-5"
                      onDragStart={(e) => e.dataTransfer.setData("text/agenda-block", b.id)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          ops.moveBlock(
                            meeting.id,
                            b.id,
                            Math.max(0, meeting.blocks.indexOf(b) + (e.key === "ArrowUp" ? -1 : 1)),
                          );
                          setAnnouncement(`${b.title} verplaatst`);
                        }
                      }}
                    >
                      <GripVertical size={14} aria-hidden />
                    </button>
                    <input
                      aria-label="Bloktitel"
                      className="flex-1 text-lg font-semibold"
                      defaultValue={b.title}
                      onBlur={(e) => {
                        if (e.target.value.trim()) ops.updateBlock(meeting.id, b.id, { title: e.target.value });
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === "Backspace") && !e.currentTarget.value) {
                          e.preventDefault();
                          removeBlock(b);
                        } else if (e.key === "Enter") {
                          ops.updateBlock(meeting.id, b.id, { title: e.currentTarget.value });
                          empty(b.id);
                        }
                      }}
                    />
                    <span className="document-reveal text-xs text-ink-3">
                      {blockDuration(b) ? `${blockDuration(b)} min` : ""}
                    </span>
                  </div>
                )}
                {b.items.map((i) => itemRow(i, b))}
                {draftRow(b.id)}
              </>
            )}
          </section>
        ))}
        {!blocks.some((b) => b.kind === "topics") && (
          <div>
            {showExamples && (
              <p className="mb-4 text-lg font-semibold" style={{ color: "var(--document-placeholder)" }}>
                {meeting.name} · {meeting.date ? weekdayLong(meeting.date) : "maandag"}
              </p>
            )}
            {draftRow("")}
            {showExamples && (
              <div
                className="pointer-events-none mt-3 whitespace-pre-line text-sm leading-8"
                style={{ color: "var(--document-placeholder)" }}
              >{`Typ, plak${supportsSpeech ? " of spreek" : ""} zoals je normaal doet…\n\n• Staal-leverancier opnieuw te laat\n• Jan maakt nieuwe offerte voor vrijdag\n• Beslissen welke orders deze week voorrang krijgen`}</div>
            )}
          </div>
        )}
        {!simplified && !content && (
          <>
            <p className="mt-5 text-xs text-ink-3">
              Een titel volstaat. Eigenaar, duur en doel voeg je later toe — of nooit.
            </p>
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-sm text-ink-3">Liever een vertrekpunt?</p>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_TEMPLATES.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className="document-dashed rounded-full px-3"
                    onClick={() => {
                      const current = currentMeeting();
                      const template = documentTemplate(name, current, useStore.getState().meetings);
                      ops.putMeeting({
                        ...current,
                        blocks: [...current.blocks.filter((b) => b.kind === "actions"), ...template],
                      });
                      setDraft(null);
                      if (
                        name === DOCUMENT_TEMPLATES[1] &&
                        !useStore
                          .getState()
                          .meetings.some(
                            (m) =>
                              m.id !== meeting.id && m.name === meeting.name && m.blocks.some((b) => b.items.length),
                          )
                      )
                        toast("Geen vorige agenda beschikbaar. Een voorbeeld is ingevuld.");
                      focus(template[0].items[0].id);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-3">
        {simplified
          ? "Enter = nieuw punt · Tab = notitie · / = meer opties"
          : "Enter nieuw agendapunt · Tab notitie bij het punt · [] actie · # nieuw blok · @ eigenaar · 10m duur · / doel, beslissing of actie."}
      </p>
    </div>
  );
}
