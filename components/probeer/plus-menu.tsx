"use client";

import { useRef } from "react";
import { CalendarDays, ClipboardPaste, FileText, Plus } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { NOTES_ACCEPT } from "@/lib/notes-file";

export interface PlusMenuActions {
  onPasteNotes: () => void;
  onFile: (file: File) => void;
  onCalendar: () => void;
}

const item =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[15px] whitespace-nowrap font-bold text-ink outline-none select-none data-[highlighted]:bg-brand-selected data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

const hint = "ml-auto pl-3 text-xs font-semibold text-ink-3";

/**
 * "+"-knop links in het chatveld (SPEC-LAZY.md §4, Ingangen blijven bereikbaar; C2): notities plakken,
 * een bestand kiezen of de agenda koppelen, op elk scherm met de assistent.
 */
export function PlusMenu({ onPasteNotes, onFile, onCalendar, disabled }: PlusMenuActions & { disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={NOTES_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <Button
            variant="outline"
            size="icon"
            aria-label="Toevoegen: notities, bestand of agenda"
            className="size-[46px] shrink-0 rounded-xl data-[state=open]:border-brand data-[state=open]:bg-brand-soft"
          >
            <Plus className="size-5" strokeWidth={2.4} aria-hidden />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            aria-label="Toevoegen"
            side="top"
            align="start"
            sideOffset={8}
            className="app-theme z-50 flex w-[290px] flex-col rounded-xl border border-line-soft bg-white p-1.5 text-ink shadow-[0_12px_28px_rgba(22,33,58,0.16)]"
          >
            <DropdownMenu.Item className={item} onSelect={onPasteNotes}>
              <ClipboardPaste className="size-[18px] shrink-0 text-ink-2" aria-hidden />
              Notities plakken
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => fileRef.current?.click()}>
              <FileText className="size-[18px] shrink-0 text-ink-2" aria-hidden />
              Bestand kiezen
              <span className={hint}>Word, PDF, foto</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={onCalendar}>
              <CalendarDays className="size-[18px] shrink-0 text-ink-2" aria-hidden />
              Agenda koppelen
              <span className={hint}>Outlook, Google</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
