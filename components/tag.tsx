import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-line-faint text-ink-2",
  decision: "bg-[#EFE7FA] text-[#4B2A7A]",
  warning: "bg-warning-bg text-[#7A3F04]",
  danger: "bg-danger-bg text-danger",
  success: "bg-success-bg text-[#1E6B45]",
  brand: "bg-brand-tint text-brand-hover",
} as const;

/** Klein label, bv. "agendapunt", "beslissing", "aanbevolen start", "vr 17 okt". */
export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("rounded-md px-2.5 py-1 text-xs font-extrabold whitespace-nowrap", TONES[tone], className)}>
      {children}
    </span>
  );
}
