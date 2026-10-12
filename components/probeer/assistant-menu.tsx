"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";

export interface AssistantMenuItem {
  label: string;
  hint: string;
  icon: LucideIcon;
  onSelect: () => void;
}

const item =
  "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2 text-ink outline-none select-none data-[highlighted]:bg-brand-selected";

/** "⋯" (Meer opties) in de kop van de assistent (SPEC-LAZY.md §4, Stap 0; C1f). */
export function AssistantMenu({ items }: { items: AssistantMenuItem[] }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Meer opties">
          <MoreHorizontal className="size-[18px]" strokeWidth={2.5} aria-hidden />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label="Meer opties"
          align="end"
          sideOffset={6}
          className="app-theme z-50 flex w-[290px] flex-col rounded-xl border border-line-soft bg-white p-1.5 text-ink shadow-[0_12px_28px_rgba(22,33,58,0.16)]"
        >
          {items.map(({ label, hint, icon: Icon, onSelect }) => (
            <DropdownMenu.Item key={label} className={item} onSelect={onSelect}>
              <Icon className="mt-0.5 size-[18px] shrink-0 text-ink-2" aria-hidden />
              <span className="flex flex-col">
                <span className="text-[15px] font-bold">{label}</span>
                <span className="text-[13px] text-ink-3">{hint}</span>
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
