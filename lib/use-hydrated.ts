"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False tijdens server-rendering en de eerste client-render, daarna true.
 * Schermen die uit localStorage lezen tonen pas inhoud na hydratatie,
 * zodat server- en client-HTML niet verschillen.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
