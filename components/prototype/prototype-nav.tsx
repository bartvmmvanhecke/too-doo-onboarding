"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FlaskConical, List, RotateCcw, Shuffle, type LucideIcon } from "lucide-react";
import { openDemoSettings } from "@/components/demo/demo-bar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GUEST_STORAGE_KEY } from "@/lib/guest-store";
import { STORAGE_KEY, useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const navButton =
  "flex h-9 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-[#2E3850]/85 px-2.5 text-xs font-bold text-white no-underline shadow-[0_2px_8px_rgba(10,20,40,0.25)] ring-1 ring-white/30 backdrop-blur-sm hover:bg-[#2E3850] hover:text-white";

/** Wist alle state (gast, demo en app) en opent de website, volledig herladen. */
function restartDemo() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
    window.sessionStorage.clear();
  } catch {
    // Opslag niet beschikbaar: herladen start toch met lege state in het geheugen.
  }
  window.location.assign(new URL("/", window.location.origin));
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

/** De items van het prototype-menu. Nieuwe items komen gewoon in deze lijst. */
const MENU_ITEMS: MenuItem[] = [
  { id: "herstart", label: "Herstart demo", icon: RotateCcw, onSelect: restartDemo },
  { id: "demo", label: "Demo-instellingen", icon: FlaskConical, onSelect: openDemoSettings },
];

/**
 * Prototype-element (SPEC-LAZY.md §1.1): vaste knop rechtsboven met een klein menu (Herstart demo,
 * Demo-instellingen).
 * Layouts houden rechtsboven ruimte vrij, zodat hij niets overlapt. Variant B blijft bereikbaar via /prototype.
 * Op stap 3 (/acties) staat er links naast een "Toon alternatief voor stap 3"-knop om tussen beide versies te wisselen.
 */
export function PrototypeNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const detail = /^\/app\/overleg\/[^/]+$/.test(pathname);
  const meeting = useStore((s) => s.meetings.find((m) => m.id === pathname.split("/").at(-1)));
  const showVariant = detail && !meeting?.run;
  const variantB = params.get("variant") === "b";
  const hydrated = useHydrated();
  const step3Variant = useStore((s) => s.step3Variant);
  const setStep3Variant = useStore((s) => s.setStep3Variant);
  const [open, setOpen] = useState(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  if (pathname === "/prototype") return null;

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
        {showVariant && variantB && <span className="rounded-lg bg-white px-2 py-1 text-xs text-ink-3">Variant B</span>}
        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-label="Prototype-menu"
                  className={cn(navButton, "cursor-pointer")}
                >
                  <List className="size-4" aria-hidden />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">Prototype</TooltipContent>
          </Tooltip>
          <PopoverContent
            align="end"
            className="w-56"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              itemRefs.current[0]?.focus();
            }}
          >
            <div role="menu" aria-label="Prototype-menu" onKeyDown={onMenuKey} className="flex flex-col gap-0.5">
              {showVariant && <div className="border-b border-line pb-2 mb-2">
                <p className="px-2 text-xs text-ink-3">Meeting detail: variant A / B</p>
                <div className="flex" role="group" aria-label="Meeting detail: variant A / B">
                  {(["a", "b"] as const).map((variant) => <button key={variant} type="button" aria-pressed={variantB === (variant === "b")} className="min-h-11 flex-1 rounded-lg text-sm font-semibold hover:bg-app aria-pressed:bg-brand-soft aria-pressed:text-brand" onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("variant", variant);
                    window.history.pushState(null, "", url);
                    setOpen(false);
                  }}>Variant {variant.toUpperCase()}</button>)}
                </div>
              </div>}
              {MENU_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-bold hover:bg-app focus-visible:bg-app focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
                  >
                    <Icon className="size-4 shrink-0 text-ink-3" aria-hidden />
                    {item.label}
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
