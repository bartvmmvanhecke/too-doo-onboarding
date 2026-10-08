import { cn } from "@/lib/utils";

const TONES = {
  plain: "border border-line-soft bg-white text-ink [&_[data-label]]:text-ink-2",
  warning: "bg-warning-bg text-[#7A3F04] [&_[data-label]]:text-warning-ink",
  danger: "bg-danger-bg text-[#8E1F16] [&_[data-label]]:text-[#6A1A12]",
  success: "bg-success-bg text-success-ink [&_[data-label]]:text-success-ink",
  muted: "bg-app text-ink [&_[data-label]]:text-ink-2",
} as const;

/** Tegel met een getal en een label, zoals op het overzicht en de voorbeeldschermen. */
export function StatTile({
  value,
  label,
  tone = "plain",
  className,
}: {
  value: number;
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[14px] p-4", TONES[tone], className)}>
      <p className="text-[28px] leading-tight font-extrabold">{value}</p>
      <p data-label className="text-sm font-bold">
        {label}
      </p>
    </div>
  );
}
