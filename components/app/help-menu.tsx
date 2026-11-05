"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, LayoutList, Route, Sparkles, type LucideIcon } from "lucide-react";
import { ASSISTANT_PATH, openAssistant } from "@/components/probeer/start-from-app";
import { requestTour } from "@/components/tour/tour-request";
import { useGuestStore } from "@/lib/guest-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Wat "Vraag het de assistent" doet op het scherm dat open staat (het assistentpaneel, of "Vertel het me"). */
let assistantOpener: (() => void) | null = null;

/** Registreert het assistentpaneel van het huidige scherm; geeft de opruimfunctie terug (voor `useEffect`). */
export function setAssistantOpener(open: () => void) {
  assistantOpener = open;
  return () => {
    if (assistantOpener === open) assistantOpener = null;
  };
}

interface HelpItem {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  onSelect: () => void;
}

/**
 * "Hulp & rondleiding" in de zijbalk: een klein menu om de rondleiding, de voorbeeldvergadering of de
 * assistent altijd terug op te roepen. Sluit bij Escape en bij een klik erbuiten; pijltjes bewegen.
 */
export function HelpMenu({ className }: { className: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // In de proefomgeving (/probeer) staat de vergadering in opbouw open, met de assistent ernaast.
  const trial = pathname === "/probeer";
  const onMeeting = trial || pathname === "/voorbeeld" || /^\/app\/overleg\/[^/]+$/.test(pathname);

  const items: HelpItem[] = [
    {
      id: "rondleiding",
      label: "Rondleiding starten",
      hint: "Thema's, agendapunten, beslissingen en acties in 4 stappen",
      icon: Route,
      // Op een vergadering: daar de rondleiding; anders de voorbeeldvergadering, waar ze vanzelf start.
      onSelect: () => (onMeeting ? requestTour() : router.push("/voorbeeld")),
    },
    {
      id: "voorbeeld",
      label: "Voorbeeldvergadering openen",
      hint: "Kijk rond in een ingevuld overleg",
      icon: LayoutList,
      onSelect: () => router.push("/voorbeeld"),
    },
    {
      id: "assistent",
      label: "Vraag het de assistent",
      hint: "Opent het assistentpaneel",
      icon: Sparkles,
      onSelect: () => {
        if (trial) return useGuestStore.getState().setAssistantOpen(true);
        if (assistantOpener) return assistantOpener();
        openAssistant();
        router.push(ASSISTANT_PATH);
      },
    },
  ];

  const onMenuKey = (e: KeyboardEvent) => {
    const list = itemRefs.current.filter((x): x is HTMLButtonElement => !!x);
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const move = (i: number) => {
      e.preventDefault();
      list[(i + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") move(index + 1);
    else if (e.key === "ArrowUp") move(index - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(list.length - 1);
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-haspopup="menu" className={cn(className, "cursor-pointer justify-start")}>
          <CircleHelp className="size-[18px] shrink-0" aria-hidden />
          <span className="flex-1 text-left">Hulp &amp; rondleiding</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={10}
        collisionPadding={12}
        className="app-theme w-[min(300px,calc(100vw-24px))] p-1.5"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          itemRefs.current[0]?.focus();
        }}
      >
        <div role="menu" aria-label="Hulp & rondleiding" onKeyDown={onMenuKey} className="flex flex-col gap-0.5">
          {items.map((item, i) => {
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
                className="flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-app focus-visible:bg-app focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-bold text-ink">{item.label}</span>
                  <span className="text-[13px] text-ink-3">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
