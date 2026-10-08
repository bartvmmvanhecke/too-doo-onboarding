import Link from "next/link";
import { cn } from "@/lib/utils";

/** Woordmerk "too-doo"; linkt naar de website-hero. */
export function Logo({
  className,
  href = "/",
  tone = "brand",
}: {
  className?: string;
  href?: string;
  tone?: "brand" | "white";
}) {
  return (
    <Link
      href={href}
      aria-label="too-doo, naar de startpagina"
      className={cn(
        "inline-flex min-h-11 items-center text-[26px] font-extrabold tracking-[-0.5px] no-underline",
        tone === "brand" ? "text-logo hover:text-logo" : "text-white hover:text-white",
        className,
      )}
    >
      too-doo
    </Link>
  );
}

/** Vier gekleurde vierkantjes van het Microsoft-logo. */
export function MicrosoftMark({ size = 9 }: { size?: number }) {
  const colors = ["#F25022", "#7FBA00", "#00A4EF", "#FFB900"];
  return (
    <span aria-hidden className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(2, ${size}px)` }}>
      {colors.map((c) => (
        <span key={c} style={{ width: size, height: size, background: c }} />
      ))}
    </span>
  );
}

export function GoogleMark() {
  return (
    <span
      aria-hidden
      className="flex size-5 items-center justify-center rounded-full border-2 border-[#4A5470] text-xs font-extrabold"
    >
      G
    </span>
  );
}
