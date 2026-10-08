"use client";

import { useState } from "react";
import { DurationEditor, OwnerButton, PurposeEditor } from "@/components/meeting/bits";
import { EntryForm, EntryRow } from "@/components/meeting/entries";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ENTRY_KINDS, type AgendaItem, type EntryKind } from "@/lib/agenda";
import { findPerson, useStore } from "@/lib/store";

const section = "flex flex-col gap-1.5";
const heading = "text-[13px] font-semibold text-ink-3";

/** Voor wie uitgebreid wil werken: alles van één agendapunt op één plek. */
export function ItemDialog({ item, onClose }: { item: AgendaItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="app-theme max-w-[560px] gap-4">
        {item && <ItemDialogBody item={item} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ItemDialogBody({ item, onClose }: { item: AgendaItem; onClose: () => void }) {
  const { meeting, people } = useMeeting();
  const { updateItem, addEntry, removeEntry, removeItem } = useStore.getState();
  const [title, setTitle] = useState(item.text);
  const [adding, setAdding] = useState<EntryKind | null>(null);
  const owner = findPerson(people, item.ownerId);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">Agendapunt</DialogTitle>
        <DialogDescription className="sr-only">
          Titel, eigenaar, duur, doel en wat erbij vastgelegd is.
        </DialogDescription>
      </DialogHeader>
      <div className={section}>
        <label htmlFor="item-title" className={heading}>
          Titel
        </label>
        <Input
          id="item-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && updateItem(meeting.id, item.id, { text: title.trim() })}
          className="min-h-11 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={section}>
          <span className={heading}>Eigenaar</span>
          <div className="flex items-center gap-1">
            <OwnerButton ownerId={item.ownerId} onPick={(ownerId) => updateItem(meeting.id, item.id, { ownerId })} />
            <span className="text-sm">{owner?.name ?? "Nog niemand"}</span>
          </div>
        </div>
        <div className={section}>
          <span className={heading}>Doel</span>
          <PurposeEditor value={item.purposes} onChange={(purposes) => updateItem(meeting.id, item.id, { purposes })} />
        </div>
      </div>
      <div className={section}>
        <span className={heading}>Duur</span>
        <DurationEditor value={item.duration} onChange={(duration) => updateItem(meeting.id, item.id, { duration })} />
      </div>
      {item.entries.length > 0 && (
        <div className={section}>
          <span className={heading}>Vastgelegd</span>
          <ul className="flex flex-col">
            {item.entries.map((e) => (
              <EntryRow key={e.id} entry={e} onRemove={() => removeEntry(meeting.id, item.id, e.id)} />
            ))}
          </ul>
        </div>
      )}
      {adding ? (
        <EntryForm
          kind={adding}
          defaultOwnerId={item.ownerId}
          onCancel={() => setAdding(null)}
          onSubmit={(entry) => {
            addEntry(meeting.id, item.id, entry);
            setAdding(null);
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {ENTRY_KINDS.map(({ kind, label }) => (
            <Button key={kind} variant="outline" size="sm" className="font-semibold" onClick={() => setAdding(kind)}>
              + {label}
            </Button>
          ))}
        </div>
      )}
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
