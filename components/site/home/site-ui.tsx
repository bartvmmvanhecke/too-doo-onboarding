import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sectietitel van de website: twee regels, de gemarkeerde in het paars-blauwe verloop. */
export function SiteHeading({
  lines,
  id,
  className,
}: {
  lines: { text: ReactNode; highlight?: boolean }[];
  id?: string;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "text-center font-sans text-[28px] leading-[1.2] font-semibold text-site-navy md:text-[36px]",
        className,
      )}
    >
      {lines.map((l, i) => (
        <span key={i} className={cn("block", l.highlight && "text-gradient-site")}>
          {l.text}
        </span>
      ))}
    </h2>
  );
}

const BUTTON = {
  primary: "bg-site-navy px-10 text-white hover:text-white",
  secondary: "bg-site-pill px-[25px] text-site-navy hover:text-site-navy",
};

/** Pilvormige knopstijl van de website (voor links en knoppen). */
export function siteButton(variant: keyof typeof BUTTON = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full py-3 font-site text-base font-normal tracking-[0.5px] no-underline transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(13,14,42,0.15)]",
    BUTTON[variant],
    className,
  );
}
