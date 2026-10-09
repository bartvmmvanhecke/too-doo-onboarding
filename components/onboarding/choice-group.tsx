"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Choice<T extends string | number> {
  value: T;
  label: ReactNode;
}

const focusRing =
  "has-[:focus-visible]:z-10 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand";

const pill = (checked: boolean) =>
  checked
    ? "min-h-11 rounded-[10px] border-2 border-brand bg-brand-tint px-[15px] font-extrabold text-brand-hover"
    : "min-h-11 rounded-[10px] border border-line bg-white px-4 font-semibold text-ink hover:bg-app";

/**
 * Eén keuze uit een paar opties, opgebouwd met echte radioknoppen (pijltjestoetsen
 * werken vanzelf). Variant "pills" voor Duur, "segmented" voor Hoe vaak.
 */
export function ChoiceGroup<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  variant = "pills",
  children,
}: {
  legend: string;
  options: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  variant?: "pills" | "segmented";
  children?: ReactNode;
}) {
  const name = useId();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div
        className={cn(
          variant === "pills" && "flex flex-wrap gap-2",
          variant === "segmented" &&
            "grid grid-cols-2 overflow-hidden rounded-[10px] border border-line sm:grid-cols-4 [&>label+label]:border-l [&>label]:border-line max-sm:[&>label:nth-child(3)]:border-l-0 max-sm:[&>label:nth-child(n+3)]:border-t",
        )}
      >
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={String(o.value)}
              className={cn(
                "relative flex cursor-pointer items-center justify-center text-[15px] transition-colors",
                focusRing,
                variant === "pills" && pill(checked),
                variant === "segmented" &&
                  (checked
                    ? "min-h-[46px] bg-brand px-1.5 py-3 text-center font-extrabold text-white"
                    : "min-h-[46px] bg-white px-1.5 py-3 text-center font-semibold text-ink hover:bg-app"),
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {children}
    </fieldset>
  );
}

/** Meerdere keuzes in dezelfde pill-stijl, met echte checkboxen. */
export function MultiChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  children,
}: {
  legend: string;
  options: Choice<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  /** Komt mee op de laatste rij, bv. een vrij tekstveld naast "Iets anders". */
  children?: ReactNode;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                "relative flex cursor-pointer items-center justify-center text-[15px] transition-colors",
                focusRing,
                pill(checked),
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(checked ? value.filter((v) => v !== o.value) : [...value, o.value])}
              />
              {o.label}
            </label>
          );
        })}
        {children}
      </div>
    </fieldset>
  );
}
