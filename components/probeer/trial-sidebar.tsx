"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GuestAccount } from "@/lib/guest-store";
import { notAvailable } from "@/lib/not-available";
import { cn } from "@/lib/utils";

const item =
  "flex min-h-11 items-center rounded-[10px] px-3 py-2.5 text-base font-semibold text-nav-ink no-underline hover:bg-white/10 hover:text-white";

function NavItems({ meetingNames }: { meetingNames: string[] }) {
  const soon = (label: string) => (
    <a
      href={`#${label.toLowerCase()}`}
      className={item}
      onClick={(e) => {
        e.preventDefault();
        notAvailable();
      }}
    >
      {label}
    </a>
  );
  return (
    <>
      {soon("Dashboard")}
      <Link href="/probeer" aria-current="page" className={cn(item, "bg-white/15 font-extrabold text-white")}>
        Vergaderingen
      </Link>
      {meetingNames.length > 1 && (
        <ul aria-label="Je overleggen" className="flex flex-col gap-0.5 pb-1 pl-6 text-sm text-nav-muted">
          {meetingNames.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {soon("Acties")}
      {soon("Beslissingen")}
    </>
  );
}

/** Laag 2 (150–550 ms): het blauwe paneel krimpt tot de zijbalk, het logo landt. */
const PANEL = { duration: 0.4, ease: [0.65, 0, 0.35, 1] as const };

function SaveBox({ canSave, onSave, account }: { canSave: boolean; onSave: () => void; account: GuestAccount | null }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-white/15 px-3 py-3.5">
      {account ? (
        <>
          <span className="text-sm font-extrabold">
            {account.firstName} {account.lastName}
          </span>
          <span className="text-[13px] leading-snug text-nav-muted">Proefperiode · nog 30 dagen</span>
        </>
      ) : (
        <>
          <span className="text-sm font-extrabold">Nog niet bewaard</span>
          <span className="text-[13px] leading-snug text-nav-muted">
            Je werk staat op dit toestel. Bewaar het wanneer je wilt.
          </span>
        </>
      )}
      {canSave && (
        <Button variant="inverse" size="sm" className="mt-1.5" onClick={onSave}>
          {account ? "Open in je account" : "Bewaar je overleg"}
        </Button>
      )}
    </div>
  );
}

/** Gedeelde elementen van de overgang welkom → app (SPEC-LAZY.md §4, Stap 0). */
export const SHARED = { panel: "trial-nav", logo: "trial-logo", title: "trial-title" } as const;

/**
 * Zijbalk van de proefomgeving (zoals de app); op smalle schermen een menuknop.
 * `shared`: het blauwe paneel en het logo van het welkomstscherm landen hier (layoutId).
 */
export function TrialSidebar({
  meetingNames,
  canSave,
  onSave,
  account,
  shared,
}: {
  meetingNames: string[];
  canSave: boolean;
  onSave: () => void;
  account: GuestAccount | null;
  shared?: boolean;
}) {
  return (
    <>
      <nav
        aria-label="Hoofdmenu"
        className="sticky top-0 isolate hidden h-dvh w-[220px] shrink-0 flex-col gap-1 px-3.5 py-6 text-white lg:flex"
      >
        <motion.div
          aria-hidden
          layoutId={shared ? SHARED.panel : undefined}
          transition={PANEL}
          className="absolute inset-0 -z-10 bg-app-nav"
        />
        <motion.div layoutId={shared ? SHARED.logo : undefined} transition={PANEL} className="self-start">
          <Logo href="/" tone="white" className="px-2.5 pb-5" />
        </motion.div>
        <div className="dock-nav flex flex-col gap-1">
          <NavItems meetingNames={meetingNames} />
        </div>
        <div className="mt-auto">
          <SaveBox canSave={canSave} onSave={onSave} account={account} />
        </div>
      </nav>

      <div className="flex items-center gap-2 bg-app-nav py-2 pr-24 pl-3 text-white lg:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 bg-app-nav p-2 text-white">
            <nav aria-label="Hoofdmenu" className="flex flex-col gap-1">
              <NavItems meetingNames={meetingNames} />
              <SaveBox canSave={canSave} onSave={onSave} account={account} />
            </nav>
          </PopoverContent>
        </Popover>
        <Logo href="/" tone="white" />
      </div>
    </>
  );
}
