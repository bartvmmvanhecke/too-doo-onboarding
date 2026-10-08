"use client";

import type { ComponentProps } from "react";
import { formatShortDate, nextWeekday } from "@/lib/date";
import { notAvailable } from "@/lib/not-available";
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
