"use client";

import { useState } from "react";
import { DurationPicker, OwnersPicker, PurposePicker } from "@/components/meeting/bits";
import { EntryPanel } from "@/components/meeting/entries";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ENTRY_KINDS, type AgendaItem } from "@/lib/agenda";
import { useStore } from "@/lib/store";

const heading = "text-[13px] font-semibold text-ink-3";

/** Voor wie uitgebreid wil werken: alles van één agendapunt op één plek. */
export function ItemDialog({ item, onClose }: { item: AgendaItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="app-theme max-w-[640px] gap-4">
        {item && <ItemDialogBody item={item} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ItemDialogBody({ item, onClose }: { item: AgendaItem; onClose: () => void }) {
  const { meeting } = useMeeting();
  const { updateItem, removeItem } = useStore.getState();
  const [title, setTitle] = useState(item.text);
  const update = (patch: Partial<AgendaItem>) => updateItem(meeting.id, item.id, patch);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">Agendapunt</DialogTitle>
        <DialogDescription className="sr-only">
          Titel, eigenaars, doel, duur en wat erbij vastgelegd is.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-title" className={heading}>
          Titel
        </label>
        <Input
          id="item-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && update({ text: title.trim() })}
          className="min-h-11 text-sm"
        />
      </div>
      <div className="-ml-1 flex flex-wrap items-center gap-1">
        <OwnersPicker value={item.ownerIds} onChange={(ownerIds) => update({ ownerIds })} />
        <PurposePicker showEmpty value={item.purposes} onChange={(purposes) => update({ purposes })} />
        <DurationPicker showEmpty value={item.duration} onChange={(duration) => update({ duration })} />
      </div>
      {ENTRY_KINDS.map(({ kind, plural }) => (
        <section key={kind} aria-label={plural} className="flex flex-col gap-1.5">
          <h3 className={heading}>{plural.charAt(0).toUpperCase() + plural.slice(1)}</h3>
          <EntryPanel item={item} kind={kind} autoFocus={false} />
        </section>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-faint pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="font-semibold text-danger hover:text-danger"
          onClick={() => {
            removeItem(meeting.id, item.id);
            onClose();
          }}
        >
          Agendapunt verwijderen
        </Button>
        <Button size="sm" className="font-semibold" onClick={onClose}>
          Klaar
        </Button>
      </div>
    </>
  );
}
