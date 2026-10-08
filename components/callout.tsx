import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  neutral: "bg-app border border-track text-ink",
  info: "bg-brand-soft text-brand-hover",
  warning: "bg-warning-bg border border-warning-line text-warning-ink",
  success: "bg-success-bg text-success-ink",
  plain: "bg-app text-ink-2",
} as const;

/** Melding of uitlegblok. Met `live` wordt het een status-regio voor schermlezers. */
export function Callout({
  variant = "neutral",
  icon,
  title,
  children,
  live = false,
  className,
}: {
  variant?: keyof typeof VARIANTS;
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <div
      role={live ? "status" : undefined}
      className={cn("flex items-start gap-3 rounded-xl px-4 py-3.5", VARIANTS[variant], className)}
    >
      {icon && <span className="mt-px shrink-0 [&_svg]:size-[22px]">{icon}</span>}
      <div className="flex min-w-0 flex-col gap-1">
        {title && <span className="text-base font-extrabold">{title}</span>}
        {children && <div className={cn("text-sm leading-normal", title && variant === "neutral" && "text-ink-2")}>{children}</div>}
      </div>
    </div>
  );
}
