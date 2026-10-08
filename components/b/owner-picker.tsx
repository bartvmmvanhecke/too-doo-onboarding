"use client";

import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Person } from "@/lib/mock-data";

/**
 * Keuzelijst met deelnemers achter "+ Wie?" en "Wijs iemand aan" (SPEC-FLOWS.md §4).
 * De trigger (children) moet een knop zijn.
 */
export function OwnerPicker({
  people,
  label,
  onPick,
  children,
}: {
  people: { person: Person; hint: string }[];
  label: string;
  onPick: (personId: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent aria-label={label}>
        <p className="px-2.5 pt-1.5 pb-1 text-xs font-extrabold tracking-[0.4px] text-ink-3 uppercase">{label}</p>
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          {people.map(({ person, hint }) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(person.id);
                  setOpen(false);
                }}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left hover:bg-brand-selected focus-visible:bg-brand-selected"
              >
                <Avatar person={person} size={26} decorative />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold">{person.name}</span>
                  <span className="truncate text-xs text-ink-3">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
