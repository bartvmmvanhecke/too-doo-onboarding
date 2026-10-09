"use client";

import { useStore } from "@/lib/store";
import { ActionsScreen } from "./actions-screen";
import { GoalScreen } from "./goal-screen";

/** Prototype: "Toon alternatief voor stap 3" rechtsboven wisselt tussen beide versies van stap 3. */
export function Step3Screen() {
  const variant = useStore((s) => s.step3Variant);
  return variant === "doel" ? <GoalScreen /> : <ActionsScreen />;
}
