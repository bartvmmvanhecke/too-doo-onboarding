"use client";

import type { ReactNode } from "react";
import { useHydrated } from "@/lib/use-hydrated";

/** Toont children pas na hydratatie (state komt uit localStorage). */
export function Hydrated({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useHydrated() ? children : fallback;
}
