"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ME, type GuestAction, type GuestPerson } from "@/lib/assistant/types";
import { useGuestStore } from "@/lib/guest-store";
import { cn } from "@/lib/utils";

const option =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold hover:bg-app";

/** Eigenaar van een actie in de proefomgeving: deelnemers, "Ikzelf", "Later beslissen" of een nieuwe voornaam. */
export function OwnerPicker({ action, people }: { action: GuestAction; people: GuestPerson[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { updateAction, addParticipant } = useGuestStore.getState();
  const owner = people.find((p) => p.id === action.ownerId);
  const pick = (ownerId: string | null, later = false) => {
    updateAction(action.id, { ownerId, ownerLater: later });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {action.ownerId ? (
          <button
            type="button"
            aria-label={`Eigenaar van ${action.text}: ${owner?.name ?? "jij"}. Wijzigen`}
            className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 text-sm font-bold hover:bg-app"
          >
            {owner ? (
              <Avatar person={owner} size={26} decorative />
            ) : (
              <span
                aria-hidden
                className="flex size-[26px] items-center justify-center rounded-full bg-line-soft text-[11px] font-extrabold"
              >
                JIJ
              </span>
            )}
            {owner?.name ?? "Ikzelf"}
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Wie doet ${action.text}?`}
            className={cn(
              "min-h-11 shrink-0 cursor-pointer rounded-lg border px-3 text-sm font-extrabold",
              action.ownerLater
                ? "border-line bg-white text-ink-3"
                : "border-warning-line bg-white text-warning hover:bg-warning-bg",
            )}
          >
            {action.ownerLater ? "later" : "+ Wie?"}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div role="group" aria-label="Eigenaar kiezen" className="flex flex-col gap-0.5">
          {people.map((p) => (
            <button key={p.id} type="button" className={option} onClick={() => pick(p.id)}>
              <Avatar person={p} size={24} decorative />
              {p.name}
            </button>
          ))}
          <button type="button" className={option} onClick={() => pick(ME)}>
            Ikzelf
          </button>
          <button type="button" className={cn(option, "text-ink-3")} onClick={() => pick(null, true)}>
            Later beslissen
          </button>
          <form
            className="px-1 pt-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              pick(addParticipant(name.trim()).id);
              setName("");
            }}
          >
            <Input
              aria-label="Iemand anders (voornaam)"
              placeholder="Iemand anders: voornaam + Enter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 text-sm"
            />
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
