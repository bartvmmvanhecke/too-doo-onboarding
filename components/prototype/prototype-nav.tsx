"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, List, Shuffle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { clearGuest } from "@/lib/guest-store";
import { useStore, type OnboardingVariant } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const navButton =
  "flex h-9 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-[#2E3850]/85 px-2.5 text-xs font-bold text-white no-underline shadow-[0_2px_8px_rgba(10,20,40,0.25)] ring-1 ring-white/30 backdrop-blur-sm hover:bg-[#2E3850] hover:text-white";

const VARIANTS: { id: OnboardingVariant; title: string; subtitle: string }[] = [
  {
    id: "A",
    title: "Onboarding Flow Variant A - Lazy Registration",
    subtitle: "Proberen zonder account, account bij bewaren",
  },
  {
    id: "B",
    title: "Onboarding Flow Variant B - Classic Onboarding",
    subtitle: "Account eerst, dan eerste overleg",
  },
];

/**
 * Prototype-element (SPEC-LAZY.md §1.1): vaste knop rechtsboven met een klein menu om een
 * onboardingvariant te kiezen. Layouts houden rechtsboven ruimte vrij, zodat hij niets overlapt.
 * Op stap 3 (/acties) staat er links naast een "Toon alternatief voor stap 3"-knop om tussen beide versies te wisselen.
 */
export function PrototypeNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const flow = useStore((s) => s.flow);
  const variant = useStore((s) => s.variant);
  const setVariant = useStore((s) => s.setVariant);
  const step3Variant = useStore((s) => s.step3Variant);
  const setStep3Variant = useStore((s) => s.setStep3Variant);
  const [open, setOpen] = useState(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  if (pathname === "/prototype") return null;

  const label = variant === "A" ? "A" : flow ? `B · Flow ${flow}` : "B";

  const choose = (id: OnboardingVariant) => {
    setOpen(false);
    if (id === "A") {
      clearGuest();
      setVariant("A");
      // Volledig herladen: de proefomgeving start zo zeker leeg.
      window.location.assign(new URL("/", window.location.origin));
    } else {
      router.push("/prototype");
    }
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const items = itemRefs.current.filter((x): x is HTMLButtonElement => !!x);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") move(index + 1);
    else if (e.key === "ArrowUp") move(index - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(items.length - 1);
    else if (e.key === "Tab") setOpen(false);
  };

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
        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-label={hydrated ? `Flowkeuze (actief: variant ${label})` : "Flowkeuze"}
                  className={cn(navButton, "cursor-pointer")}
                >
                  <List className="size-4" aria-hidden />
                  {hydrated && <span aria-hidden>{label}</span>}
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">Flowkeuze</TooltipContent>
          </Tooltip>
          <PopoverContent
            align="end"
            className="w-[min(340px,calc(100vw-16px))]"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              const active = VARIANTS.findIndex((v) => v.id === variant);
              itemRefs.current[Math.max(0, active)]?.focus();
            }}
          >
            <div role="menu" aria-label="Flowkeuze" onKeyDown={onMenuKey} className="flex flex-col gap-0.5">
              {VARIANTS.map((v, i) => {
                const checked = hydrated && variant === v.id;
                return (
                  <button
                    key={v.id}
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    role="menuitemradio"
                    aria-checked={checked}
                    tabIndex={-1}
                    onClick={() => choose(v.id)}
                    className="flex min-h-11 w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-app focus-visible:bg-app focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
                  >
                    <Check
                      className={cn("mt-0.5 size-4 shrink-0 text-brand", !checked && "invisible")}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-extrabold">{v.title}</span>
                      <span className="text-[13px] text-ink-3">{v.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
