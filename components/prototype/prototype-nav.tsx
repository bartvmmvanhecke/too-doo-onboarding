"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Shuffle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const navButton =
  "flex h-9 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-[#2E3850]/85 px-2.5 text-xs font-bold text-white no-underline shadow-[0_2px_8px_rgba(10,20,40,0.25)] ring-1 ring-white/30 backdrop-blur-sm hover:bg-[#2E3850] hover:text-white";

/**
 * Prototype-element (SPEC-FLOWS.md §3): vaste knop rechtsboven terug naar /prototype.
 * Layouts houden rechtsboven ruimte vrij (zie PROTO_NAV_SPACE), zodat hij niets overlapt.
 * Op stap 3 (/acties) staat er links naast een "Toon alternatief voor stap 3"-knop om tussen beide versies te wisselen.
 */
export function PrototypeNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const flow = useStore((s) => s.flow);
  const step3Variant = useStore((s) => s.step3Variant);
  const setStep3Variant = useStore((s) => s.setStep3Variant);
  if (pathname === "/prototype") return null;

  return (
    <TooltipProvider>
      <div
        data-prototype-nav
        className="fixed top-2 right-2 z-40 flex items-center gap-2 max-sm:flex-col-reverse max-sm:items-end print:hidden"
      >
        {pathname === "/acties" && hydrated && (
          <button
            type="button"
            aria-pressed={step3Variant === "doel"}
            onClick={() => setStep3Variant(step3Variant === "doel" ? "acties" : "doel")}
            className={cn(navButton, "cursor-pointer aria-pressed:bg-brand aria-pressed:hover:bg-brand-hover")}
          >
            <Shuffle className="size-4" aria-hidden />
            Toon alternatief voor stap 3
          </button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/prototype"
              aria-label={hydrated && flow ? `Terug naar flowkeuze (flow ${flow})` : "Terug naar flowkeuze"}
              className={navButton}
            >
              <List className="size-4" aria-hidden />
              {hydrated && flow && <span aria-hidden>Flow {flow}</span>}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="left">Flowkeuze</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
