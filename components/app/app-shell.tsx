"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddMeetingsDialog } from "@/components/app/add-meetings-dialog";
import { AppUiProvider, useAppUi } from "@/components/app/app-ui";
import { Logo } from "@/components/brand";
import { Hydrated } from "@/components/hydrated";
import { notAvailable } from "@/lib/not-available";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const active = "bg-white/15 font-semibold text-white";

const item =
  "flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-[15px] font-medium text-nav-ink no-underline hover:bg-white/10 hover:text-white";

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/20 px-2.5 py-px text-[13px] font-semibold text-white">{children}</span>;
}

/** Zijbalk van de product-app, transparant op het verloop; op smalle schermen een balk bovenaan. */
function Sidebar() {
  const pathname = usePathname();
  const meetings = useStore((s) => s.meetings);
  // Variant B (flow 3): "Dashboard" opent het overzicht.
  const bMode = useStore((s) => s.flow === 3 || s.meetings.some((m) => m.origin === "b"));
  const openActions = meetings.reduce((n, m) => n + m.actions.filter((a) => !a.done).length, 0);

  const comingSoon = (label: string, badge?: ReactNode) => (
    <a
      href={`#${label.toLowerCase()}`}
      className={item}
      onClick={(e) => {
        e.preventDefault();
        notAvailable();
      }}
    >
      {label}
      {badge}
    </a>
  );

  return (
    <nav
      aria-label="Hoofdmenu"
      className="flex flex-col gap-1 px-3.5 py-4 text-white lg:min-h-dvh lg:w-60 lg:shrink-0 lg:py-6"
    >
      <Logo href="/app" tone="white" className="self-start px-2.5 lg:pb-4" />
      <div className="flex flex-wrap gap-1 lg:flex-col">
        {bMode ? (
          <Link
            href="/b/overzicht"
            aria-current={pathname === "/b/overzicht" ? "page" : undefined}
            className={cn(item, pathname === "/b/overzicht" && active)}
          >
            Dashboard
          </Link>
        ) : (
          comingSoon("Dashboard")
        )}
        <Link
          href="/app"
          aria-current={pathname.startsWith("/app") ? "page" : undefined}
          className={cn(item, pathname.startsWith("/app") && active)}
        >
          Vergaderingen
        </Link>
        {comingSoon("Acties", openActions > 0 ? <Badge>{openActions}</Badge> : undefined)}
        {comingSoon("Beslissingen")}
        {comingSoon("Notities")}
      </div>
      <p className="mt-auto hidden border-t border-white/15 p-3 text-[13px] text-nav-muted lg:block">
        Proefperiode · nog 30 dagen
      </p>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppUiProvider>
      <div className="app-theme flex min-h-dvh flex-col bg-app-shell lg:flex-row">
        <Hydrated fallback={<div className="lg:min-h-dvh lg:w-60 lg:shrink-0" />}>
          <Sidebar />
        </Hydrated>
        <div className="relative flex min-w-0 flex-1 flex-col pt-4">
          {/* Lichte band; links sluit ze aan op de bovenkant van de zijbalk. */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-12 bg-app-band" />
          <main className="relative flex-1 rounded-tl-[24px] bg-app px-4 pt-8 pb-16 sm:px-10">
            <div className="mx-auto flex w-full max-w-[920px] flex-col gap-3.5">{children}</div>
          </main>
        </div>
      </div>
      <Hydrated>
        <AddMeetingsDialogHost />
      </Hydrated>
    </AppUiProvider>
  );
}

function AddMeetingsDialogHost() {
  const { addMeetingsOpen, setAddMeetingsOpen } = useAppUi();
  return <AddMeetingsDialog open={addMeetingsOpen} onOpenChange={setAddMeetingsOpen} />;
}
