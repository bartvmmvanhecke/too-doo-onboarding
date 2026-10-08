"use client";

import { cn } from "@/lib/utils";

/**
 * Suggestiechips. Klikken vult het veld; de chip staat "aan" zolang de waarde
 * exact overeenkomt, dus verder typen deselecteert vanzelf.
 */
export function ChipSuggestions({
  options,
  value,
  onSelect,
  label,
  prefix = "",
  className,
}: {
  options: string[];
  value?: string;
  onSelect: (option: string) => void;
  label: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(o)}
            className={cn(
              "min-h-11 cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors",
              on
                ? "border-brand bg-brand-tint font-bold text-brand-hover"
                : "border-line bg-white font-semibold text-ink hover:bg-app",
            )}
          >
            {prefix}
            {o}
          </button>
        );
      })}
    </div>
  );
}
