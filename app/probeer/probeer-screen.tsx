"use client";

import { useState } from "react";
import { TrialScreen } from "@/components/probeer/trial-screen";
import type { SaveIntent } from "@/lib/store";
import { track } from "@/lib/track";

/** De proefomgeving, met het bewaar-modal dat elke handeling met een identiteit opent (SPEC-LAZY.md §5). */
export function ProbeerScreen() {
  const [, setIntent] = useState<SaveIntent | null>(null);
  const openSave = (intent: SaveIntent, trigger: string) => {
    track("save_prompt_shown", { intent, trigger });
    setIntent(intent);
  };
  return <TrialScreen onSave={openSave} />;
}
