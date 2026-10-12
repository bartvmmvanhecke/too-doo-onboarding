"use client";
import { Command, CommandList, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command";
import { useState, type KeyboardEvent } from "react";
import { PURPOSES, ENTRY_KINDS, type AgendaItem, type EntryKind } from "@/lib/agenda";
import type { Person } from "@/lib/mock-data";

export function parseDuration(text: string): { text: string; duration?: number } {
  const match = text.match(/\s+(\d+)(m|u)(\d{1,2})?\s*$/i);
  if (!match) return { text };
  return {
    text: text.slice(0, match.index).trim(),
    duration: Number(match[1]) * (match[2].toLowerCase() === "u" ? 60 : 1) + Number(match[3] || 0),
  };
}
export function TokenInput({
  id,
  text,
  label,
  people,
  onChange,
  update,
  add,
  onKeyDown,
  onBlur,
  inputRef,
  placeholder,
  autoFocus,
  onPaste,
  onFocus,
  purposes = [],
}: {
  id: string;
  text: string;
  label: string;
  people: Person[];
  onChange: (text: string) => void;
  update: (patch: Partial<AgendaItem>) => void;
  add: (kind: EntryKind | "break", sourceText?: string) => void;
  purposes?: AgendaItem["purposes"];
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (text: string) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
  onFocus?: () => void;
}) {
  const [active, setActive] = useState(0);
  const [closed, setClosed] = useState<string | null>(null);
  const match = text.match(/(?:^|\s)([@/])([^\s]*)$/);
  const open = !!match && closed !== match[0];
  const query = match?.[2].toLowerCase() ?? "";
  const clean = () => text.slice(0, match?.index).trimEnd();
  const options = (
    match?.[1] === "@"
      ? people.map((p) => ({ label: p.name, group: "Deelnemers", select: () => update({ ownerIds: [p.id] }) }))
      : [
          ...PURPOSES.map((p) => ({
            label: p.label,
            group: "Doel",
            select: () =>
              update({
                purposes: purposes.includes(p.value) ? purposes.filter((x) => x !== p.value) : [...purposes, p.value],
              }),
          })),
          ...ENTRY_KINDS.map((k) => ({ label: k.label, group: "Toevoegen", select: () => add(k.kind, clean()) })),
          { label: "Pauze", group: "Toevoegen", select: () => add("break", clean()) },
        ]
  ).filter((o) => o.label.toLowerCase().includes(query));
  function select(index: number) {
    const o = options[index];
    if (!o) return;
    onChange(clean());
    o.select();
    setClosed(match?.[0] ?? null);
    setActive(0);
  }
  return (
    <div className="relative min-w-28 flex-1" data-line-source={id}>
      {text.split("\n").map((line, lineIndex) => (
        <input
          key={lineIndex}
          ref={lineIndex === 0 ? inputRef : undefined}
          autoFocus={autoFocus && lineIndex === 0}
          data-document-line
          id={lineIndex === 0 ? id : `${id}-continuation-${lineIndex}`}
          data-source-id={id}
          aria-label={lineIndex === 0 ? label : `${label}, vervolg ${lineIndex + 1}`}
          className="w-full text-sm"
          placeholder={placeholder}
          value={line}
          onPaste={onPaste}
          onFocus={onFocus}
          onChange={(e) => {
            const lines = text.split("\n");
            lines[lineIndex] = e.target.value;
            onChange(lines.join("\n"));
            setClosed(null);
            setActive(0);
          }}
          onBlur={(e) => {
            if (
              e.relatedTarget?.closest("[data-line-source]")?.getAttribute("data-line-source") !== id &&
              !e.relatedTarget?.closest("[data-line-menu], .suggestion-card, [data-slot=popover-content]") &&
              !(e.relatedTarget instanceof HTMLButtonElement && e.relatedTarget.closest(".document-row"))
            )
              onBlur?.(text);
          }}
          role={open ? "combobox" : undefined}
          aria-expanded={open || undefined}
          aria-controls={open ? `tokens-${id}` : undefined}
          aria-activedescendant={open && options[active] ? `token-${id}-${active}` : undefined}
          onKeyDown={(e) => {
            if (open) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((n) => (n + (e.key === "ArrowDown" ? 1 : -1) + options.length) % Math.max(1, options.length));
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                select(active);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setClosed(match![0]);
                return;
              }
            }
            if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              const prefix = text
                .split("\n")
                .slice(0, lineIndex)
                .reduce((n, line) => n + line.length + 1, 0);
              const at = prefix + (e.currentTarget.selectionStart ?? line.length);
              onChange(text.slice(0, at) + "\n" + text.slice(at));
              requestAnimationFrame(() => {
                const next = document.getElementById(`${id}-continuation-${lineIndex + 1}`) as HTMLInputElement | null;
                next?.focus();
                next?.setSelectionRange(0, 0);
              });
              return;
            }
            onKeyDown(e);
          }}
        />
      ))}
      {open && (
        <div
          data-line-menu
          role="listbox"
          id={`tokens-${id}`}
          aria-label="Invoerkeuzes"
          className="absolute left-0 top-full z-20 w-64 rounded-lg border border-line bg-white p-2 shadow-lg"
        >
          <Command
            label="Invoerkeuzes"
            shouldFilter={false}
            value={options[active]?.label ?? ""}
            onValueChange={(value) => {
              const index = options.findIndex((o) => o.label === value);
              if (index >= 0) setActive(index);
            }}
          >
            <CommandList>
              <CommandEmpty>Geen resultaten</CommandEmpty>
              {[...new Set(options.map((o) => o.group))].map((group) => (
                <CommandGroup key={group} heading={group}>
                  {options
                    .filter((o) => o.group === group)
                    .map((o) => (
                      <CommandItem
                        key={o.label}
                        id={`token-${id}-${options.indexOf(o)}`}
                        value={o.label}
                        onSelect={() => select(options.indexOf(o))}
                        asChild
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          tabIndex={0}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {o.label}
                          {purposes.some((p) => PURPOSES.find((x) => x.value === p)?.label === o.label) ? " ✓" : ""}
                        </button>
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
