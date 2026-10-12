import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { ProbeerScreen } from "./probeer-screen";

export const metadata: Metadata = { title: "Probeer too-doo · proefomgeving" };

/** Variant A · Lazy Registration: meteen in de app, zonder account (SPEC-LAZY.md §3). */
export default function Page() {
  return (
    <Hydrated fallback={<div className="min-h-dvh bg-app" />}>
      <ProbeerScreen />
    </Hydrated>
  );
}
