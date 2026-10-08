"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { AddMeetingsDialog } from "@/components/app/add-meetings-dialog";
import { AppUiProvider, useAppUi } from "@/components/app/app-ui";
import { Logo } from "@/components/brand";
import { Hydrated } from "@/components/hydrated";
import { notAvailable } from "@/lib/not-available";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const active = "bg-white/15 font-extrabold text-white";

const item =
  "flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-base font-semibold text-nav-ink no-underline hover:bg-white/10 hover:text-white";

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/20 px-2.5 py-px text-[13px] font-extrabold text-white">{children}</span>
  );
}

/** Zijbalk van de product-app; op smalle schermen een balk bovenaan. */
function Sidebar() {
  const pathname = usePathname();
  const meetings = useStore((s) => s.meetings);
  const { setAddMeetingsOpen } = useAppUi();
  // Variant B (flow 3): "Overzicht" bovenaan, "Vergaderingen" opent het opgevolgde overleg.
  const bMode = useStore((s) => s.flow === 3 || s.meetings.some((m) => m.origin === "b"));
  const target = useStore((s) => s.meetings.find((m) => m.id === s.b.targetMeetingId) ?? s.meetings[0]);
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
      className="flex flex-col gap-1 bg-app-nav px-3.5 py-4 text-white lg:min-h-dvh lg:w-60 lg:shrink-0 lg:py-6"
    >
      <Logo href="/app" tone="white" className="self-start px-2.5 lg:pb-4" />
      <div className="flex flex-wrap gap-1 lg:flex-col">
        {bMode ? (
          <Link
            href="/b/overzicht"
            aria-current={pathname === "/b/overzicht" ? "page" : undefined}
            className={cn(item, pathname === "/b/overzicht" && active)}
          >
            Overzicht
          </Link>
        ) : (
          comingSoon("Dashboard")
        )}
        <Link
          href={bMode && target ? `/app/overleg/${target.id}` : "/app"}
          aria-current={pathname.startsWith("/app") ? "page" : undefined}
          className={cn(item, pathname.startsWith("/app") && active)}
        >
          Vergaderingen
        </Link>
        {meetings.length > 0 && (
          <ul aria-label="Je overleggen" className="hidden flex-col gap-0.5 pb-1 pl-3 lg:flex">
            {meetings.map((m) => {
              const href = `/app/overleg/${m.id}`;
              const current = pathname === href;
              return (
                <li key={m.id}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-lg px-3 text-[15px] no-underline hover:bg-white/10 hover:text-white",
                      current ? "font-bold text-white" : "font-semibold text-nav-muted",
                    )}
                  >
                    {m.name}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setAddMeetingsOpen(true)}
                className="flex min-h-11 w-full cursor-pointer items-center gap-1.5 rounded-lg px-3 text-left text-[15px] font-semibold text-nav-muted hover:bg-white/10 hover:text-white"
              >
                <Plus className="size-4" aria-hidden />
                Overleggen toevoegen
              </button>
            </li>
          </ul>
        )}
        {comingSoon("Acties", openActions > 0 ? <Badge>{openActions}</Badge> : undefined)}
        {comingSoon("Beslissingen")}
        {meetings.length > 0 && !bMode && comingSoon("Notities")}
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
      <div className="flex min-h-dvh flex-col bg-app text-ink lg:flex-row">
        <Hydrated fallback={<div className="bg-app-nav lg:min-h-dvh lg:w-60 lg:shrink-0" />}>
          <Sidebar />
        </Hydrated>
        <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-7 pb-24 sm:px-9 lg:pt-14">{children}</main>
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
