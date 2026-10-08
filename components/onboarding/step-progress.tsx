import { cn } from "@/lib/utils";

/** Voortgangsbalk "Stap 1 van 3 · ongeveer 3 minuten". */
export function StepProgress({
  step,
  total = 3,
  suffix,
  className,
}: {
  step: number;
  total?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("h-1 rounded", i < step ? "bg-brand" : "bg-track")} />
        ))}
      </div>
      <p className="text-[13px] font-bold text-ink-3">
        Stap {step} van {total}
        {suffix ? ` · ${suffix}` : ""}
      </p>
    </div>
  );
}
