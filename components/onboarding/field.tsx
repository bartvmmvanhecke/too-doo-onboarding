import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** ids voor aria-describedby van een veld met optionele hint en fout. */
export function describedBy(id: string, opts: { hint?: boolean; error?: boolean }): string | undefined {
  const ids = [opts.hint && `${id}-hint`, opts.error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/**
 * Label + veld + hint/fout. Het veld zelf (children) zet `id={id}` en
 * `aria-describedby={describedBy(id, …)}`.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
