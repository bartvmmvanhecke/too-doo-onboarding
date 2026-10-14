"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DOCK, SHARED } from "@/components/probeer/dock";
import { Menu, UserRound, Clock } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGuestStore, GUEST_TTL_MS, type GuestAccount } from "@/lib/guest-store";
import { useStore } from "@/lib/store";
import { notAvailable } from "@/lib/not-available";
import { cn } from "@/lib/utils";

export const SAVE_URGENT_DAYS = 2;

const item =
  "flex min-h-11 items-center rounded-[10px] px-3 py-2.5 text-base font-semibold text-nav-ink no-underline hover:bg-white/10 hover:text-white";

function NavItems({ meetingNames }: { meetingNames: string[] }) {
  const actions = useGuestStore((s) => s.actions);
  const open = actions.filter((a) => a.reviewStatus === "open").length;
  const count = open || actions.filter((a) => a.confirmed && !a.done).length;
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
      {label === "Acties" && count > 0 && (
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs",
            open ? "bg-[var(--review-count-bg)] text-[var(--review-count-ink)]" : "bg-white/15 text-white",
          )}
        >
          {count}
        </span>
      )}
    </a>
  );
  return (
    <>
      {soon("Dashboard")}
      <Link href="/probeer" aria-current="page" className={cn(item, "bg-white/15 font-extrabold text-white")}>
        Vergaderingen
      </Link>
      {meetingNames.length > 1 && (
        <ul aria-label="Je vergaderingen" className="flex flex-col gap-0.5 pb-1 pl-6 text-sm text-nav-muted">
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

function SaveBox({ canSave, onSave, account }: { canSave: boolean; onSave: () => void; account: GuestAccount | null }) {
  const company = useStore((s) => s.user?.company);
  const createdAt = useGuestStore((s) => s.createdAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const days = Math.max(0, Math.ceil((createdAt + GUEST_TTL_MS - now) / 86400000));
  const urgent = !account && days <= SAVE_URGENT_DAYS;
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={item} onClick={notAvailable}>
        Instellingen
      </button>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border p-3",
          urgent ? "border-[var(--save-urgent)] bg-[var(--save-urgent-bg)]" : "border-[var(--save-slot-line)]",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              urgent ? "bg-[var(--save-urgent)] text-app-nav" : "border border-dashed border-white",
            )}
          >
            {urgent ? <Clock className="size-4" aria-hidden /> : <UserRound className="size-4" aria-hidden />}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {account ? `${account.firstName} ${account.lastName}` : urgent ? `Nog ${days} dagen` : "Gast"}
            </p>
            <p className="text-xs text-nav-muted">
              {account
                ? (company ?? "Bedrijf kiezen")
                : urgent
                  ? "Daarna is je werk weg"
                  : `Niet bewaard · nog ${days} dagen`}
            </p>
          </div>
        </div>
        {account ? (
          <button type="button" className="min-h-11 text-left text-sm" onClick={notAvailable}>
            Bedrijf kiezen
          </button>
        ) : (
          <Button variant="inverse" className="h-10 min-h-11 w-full rounded-[10px]" onClick={onSave}>
            Account maken
          </Button>
        )}
        {account && canSave && (
          <Button variant="inverse" onClick={onSave}>
            Open in je account
          </Button>
        )}
      </div>
    </div>
  );
}

/** Gedeelde elementen van de overgang welkom → app (SPEC-LAZY.md §4, Stap 0). */
export { SHARED };

/**
 * Zijbalk van de proefomgeving, op het verloop van de app; op smalle schermen een menuknop.
 * `shared`: het navy vlak en het logo van het startscherm landen hier (layoutId). Het vlak kleurt tijdens de
 * overgang van `--onboarding-ground` naar het verloop, en ligt dan boven het contentvlak dat inschuift.
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
        className={cn(
          "sticky top-0 isolate hidden h-dvh w-[220px] shrink-0 flex-col gap-1 px-3.5 py-6 text-white lg:flex",
          shared && "z-10",
        )}
      >
        <motion.div
          aria-hidden
          layoutId={shared ? SHARED.panel : undefined}
          transition={DOCK}
          className="absolute inset-0 -z-10 bg-app-shell"
        >
          {shared && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={DOCK}
              className="absolute inset-0 bg-onboarding-ground"
            />
          )}
        </motion.div>
        <motion.div layoutId={shared ? SHARED.logo : undefined} transition={DOCK} className="self-start">
          <Logo href="/" tone="white" className="px-2.5 pb-5" />
        </motion.div>
        <div className="dock-nav flex flex-col gap-1">
          <NavItems meetingNames={meetingNames} />
        </div>
        <div className="dock-nav mt-auto">
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
