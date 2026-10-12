"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { formatShortDate, nextWeekday } from "@/lib/date";
import { notAvailable } from "@/lib/not-available";
import { track } from "@/lib/track";
import { useHydrated } from "@/lib/use-hydrated";

/** Link naar iets buiten het prototype: toont een melding in plaats van te navigeren. */
export function NotAvailableLink({ onClick, ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        notAvailable();
      }}
    />
  );
}

/** "ma 13 okt" voor de eerstvolgende gegeven weekdag, berekend in de browser. */
export function NextWeekdayDate({ weekday }: { weekday: number }) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <>{formatShortDate(nextWeekday(weekday))}</>;
}

/** Knop naar de proefomgeving van Variant A (/probeer); meet waar erop geklikt werd. */
export function TryLink({
  location,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { location: string }) {
  return (
    <Link
      {...props}
      href="/probeer"
      onClick={(e) => {
        track("cta_clicked", { variant: "A", locatie: location });
        onClick?.(e);
      }}
    />
  );
}
