"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SaveDialog } from "@/components/probeer/save-dialog";
import { saveGuestToApp } from "@/components/probeer/save-guest";
import { TrialScreen } from "@/components/probeer/trial-screen";
import { clearGuest, useGuestStore } from "@/lib/guest-store";
import { useStore, type SaveIntent } from "@/lib/store";
import { track } from "@/lib/track";

/** De proefomgeving, met het bewaar-modal dat elke handeling met een identiteit opent (SPEC-LAZY.md §5). */
export function ProbeerScreen() {
  const router = useRouter();
  const [intent, setIntent] = useState<SaveIntent | null>(null);
  const [saved, setSaved] = useState(false);

  // Activity (cacheComponents) houdt deze pagina verborgen bij na het bewaren: bij verbergen terug naar begin.
  useLayoutEffect(
    () => () => {
      setSaved(false);
      setIntent(null);
    },
    [],
  );

  const openSave = (next: SaveIntent, trigger: string) => {
    // Na "Uit mijn agenda" is er al een account: geen bewaar-modal meer, meteen naar de app.
    const user = useGuestStore.getState().account && useStore.getState().user;
    if (user) return onSaved(saveGuestToApp(user, next), next);
    track("save_prompt_shown", { intent: next, trigger });
    setIntent(next);
  };

  const onSaved = (meetingId: string | null, how: SaveIntent) => {
    setSaved(true);
    setIntent(null);
    // "Start overleg": na bewaren start het overleg meteen.
    if (meetingId && how === "start") useStore.getState().startRun(meetingId);
    router.push(meetingId ? `/app/overleg/${meetingId}?welkom=1` : "/app");
    // Alles staat nu in de app-store: de proefomgeving op dit toestel mag weg.
    clearGuest();
  };

  if (saved) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center gap-2 bg-app text-ink-2">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Je overleg wordt bewaard…
      </div>
    );
  }

  return (
    <>
      <TrialScreen onSave={openSave} />
      <SaveDialog intent={intent} onClose={() => setIntent(null)} onSaved={onSaved} />
    </>
  );
}
