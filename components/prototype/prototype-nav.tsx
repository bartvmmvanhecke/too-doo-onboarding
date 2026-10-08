"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Prototype-element (SPEC-FLOWS.md §3): vaste knop rechtsboven terug naar /prototype.
 * Layouts houden rechtsboven ruimte vrij (zie PROTO_NAV_SPACE), zodat hij niets overlapt.
 */
export function PrototypeNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const flow = useStore((s) => s.flow);
  if (pathname === "/prototype") return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/prototype"
            aria-label={hydrated && flow ? `Terug naar flowkeuze (flow ${flow})` : "Terug naar flowkeuze"}
            data-prototype-nav
            className="fixed top-2 right-2 z-40 flex h-9 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-[#2E3850]/85 px-2.5 text-xs font-bold text-white no-underline shadow-[0_2px_8px_rgba(10,20,40,0.25)] ring-1 ring-white/30 backdrop-blur-sm hover:bg-[#2E3850] hover:text-white print:hidden"
          >
            <List className="size-4" aria-hidden />
            {hydrated && flow && <span aria-hidden>Flow {flow}</span>}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left">Flowkeuze</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
