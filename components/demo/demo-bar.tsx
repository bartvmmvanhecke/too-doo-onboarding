"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useStore, STORAGE_KEY, type CalendarOutcome, type LoginOutcome } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const LOGIN_OPTIONS: { value: LoginOutcome; label: string }[] = [
  { value: "success", label: "Slaagt" },
  { value: "blocked", label: "Bedrijf blokkeert" },
];

const CALENDAR_OPTIONS: { value: CalendarOutcome; label: string }[] = [
  { value: "series", label: "Reeksen gevonden" },
  { value: "none", label: "Geen reeksen" },
  { value: "admin", label: "IT-goedkeuring nodig" },
  { value: "cancelled", label: "Geannuleerd" },
];

/**
 * Demo-balk (alleen prototype, SPEC.md §4): kies de uitkomst van gesimuleerde
 * stappen en reset de demo. Inklapbaar, rechtsonder.
 */
export function DemoBar() {
  const hydrated = useHydrated();
  const router = useRouter();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const demo = useStore((s) => s.demo);
  const setDemo = useStore((s) => s.setDemo);
  const reset = useStore((s) => s.reset);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!hydrated) return null;

  const resetDemo = () => {
    reset();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* geen opslag beschikbaar */
    }
    setOpen(false);
    toast("Demo gereset");
    router.push("/");
  };

  return (
    <div className="fixed right-3 bottom-3 z-40 flex flex-col items-end gap-2 print:hidden">
      <section
        id={panelId}
        aria-label="Demo-instellingen"
        hidden={!open}
        className="w-[min(320px,calc(100vw-24px))] rounded-2xl border border-white/10 bg-ink p-4 text-white shadow-[0_20px_50px_rgba(10,20,40,0.35)]"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold">Demo-balk</p>
            <p className="text-xs text-nav-muted">Alleen in het prototype. Kies de uitkomst van gesimuleerde stappen.</p>
          </div>
          <button
            type="button"
            aria-label="Demo-balk sluiten"
            onClick={() => setOpen(false)}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <DemoGroup
          legend="Microsoft-login"
          options={LOGIN_OPTIONS}
          value={demo.login}
          onChange={(login) => setDemo({ login })}
        />
        <DemoGroup
          legend="Agendatoestemming"
          options={CALENDAR_OPTIONS}
          value={demo.calendar}
          onChange={(calendar) => setDemo({ calendar })}
        />
        <button
          type="button"
          onClick={resetDemo}
          className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-white text-sm font-extrabold text-ink hover:bg-brand-soft"
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset demo
        </button>
      </section>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(10,20,40,0.3)] hover:bg-[#0b1426]"
      >
        <FlaskConical className="size-4" aria-hidden />
        Demo
      </button>
    </div>
  );
}

function DemoGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="mb-3 border-none p-0">
      <legend className="mb-1.5 text-xs font-extrabold tracking-[0.5px] text-nav-muted uppercase">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-11 cursor-pointer items-center rounded-lg border px-3 text-[13px] font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white",
              o.value === value ? "border-white bg-white text-ink" : "border-white/25 text-white hover:bg-white/10",
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
