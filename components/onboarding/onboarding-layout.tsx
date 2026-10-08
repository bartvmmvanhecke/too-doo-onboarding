import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";

/**
 * Twee kolommen: formulier links, verlooppaneel rechts (radius 24px).
 * Op smalle schermen valt het paneel onder het formulier (SPEC.md §5).
 */
export function OnboardingLayout({
  children,
  panel,
  panelLabel,
  headerAside,
  contentClassName,
  panelClassName,
}: {
  children: ReactNode;
  panel: ReactNode;
  panelLabel: string;
  headerAside?: ReactNode;
  /** Breedte en bovenmarge van de formulierkolom, bv. "max-w-[520px] lg:mt-12". */
  contentClassName?: string;
  panelClassName?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col gap-6 bg-white p-4 text-ink sm:p-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col px-1 py-2 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          {headerAside}
        </header>
        <main className={cn("mx-auto mt-8 flex w-full max-w-[520px] flex-col gap-5 lg:mt-12", contentClassName)}>
          {children}
        </main>
      </div>
      <aside
        aria-label={panelLabel}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-3.5 rounded-panel bg-onboarding-panel p-5 py-10 sm:p-12 lg:min-h-[852px]",
          panelClassName,
        )}
      >
        {panel}
      </aside>
    </div>
  );
}

/** Wit kaartje in het rechterpaneel. */
export function PanelCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full max-w-[480px] flex-col gap-[18px] rounded-[18px] bg-white p-6 shadow-[0_20px_50px_rgba(14,60,140,0.14)] sm:p-[26px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Kleine hoofdletterkop, bv. "Zo komt jouw overleg in too-doo". */
export function Eyebrow({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: "p" | "h2" | "h3" | "span" | "legend" }) {
  return (
    <Tag className={cn("text-[13px] font-extrabold tracking-[0.5px] text-ink-3 uppercase", className)}>{children}</Tag>
  );
}
