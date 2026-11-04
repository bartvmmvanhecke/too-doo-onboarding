"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SaveDialog } from "@/components/probeer/save-dialog";
import { saveGuestToApp } from "@/components/probeer/save-guest";
import { TrialScreen, type PendingDraft } from "@/components/probeer/trial-screen";
import { clearGuest, useGuestStore } from "@/lib/guest-store";
import { useStore, type SaveIntent, type User } from "@/lib/store";
import { track } from "@/lib/track";

/** De proefomgeving, met het bewaar-modal dat elke handeling met een identiteit opent (SPEC-LAZY.md §5). */
export function ProbeerScreen() {
  const router = useRouter();
  const [intent, setIntent] = useState<SaveIntent | null>(null);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<PendingDraft | null>(null);

  // Activity (cacheComponents) houdt deze pagina verborgen bij na het bewaren: bij verbergen terug naar begin.
  useLayoutEffect(
    () => () => {
      setSaved(false);
      setIntent(null);
      setDraft(null);
    },
    [],
  );

  const openSave = (next: SaveIntent, trigger: string, pending?: PendingDraft) => {
    // Na "Uit mijn agenda" is er al een account: geen bewaar-modal meer, meteen naar de app.
    const user = useGuestStore.getState().account && useStore.getState().user;
    if (user) return onSaved(saveGuestToApp(user, next), next);
    track("save_prompt_shown", { intent: next, trigger });
    setDraft(pending ?? null);
    setIntent(next);
  };

  /** Ingelogd met enkel een getypte zin: het account staat klaar en de assistent maakt er meteen de agenda van. */
  const keepDraft = (user: User) => {
    useStore.getState().signIn(user);
    useGuestStore.getState().setAccount({ firstName: user.firstName, lastName: user.lastName, email: user.email });
    const resume = draft?.resume;
    setIntent(null);
    setDraft(null);
    toast(`Ingelogd als ${user.firstName}. We maken nu je agenda van wat je typte.`);
    resume?.();
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
      <SaveDialog
        intent={intent}
        draft={draft?.text ?? null}
        onClose={() => setIntent(null)}
        onSaved={onSaved}
        onKeepDraft={keepDraft}
      />
    </>
  );
}
