"use client";

import { Check, CircleCheck } from "lucide-react";
import type { GuestAccount } from "@/lib/guest-store";

/** Bovenaan de proefomgeving: de statusbanner, of na "Uit mijn agenda" de melding dat het werk bewaard wordt. */
export function StatusBanner({ account, onLogin }: { account: GuestAccount | null; onLogin: () => void }) {
  if (account) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-[10px] bg-success-bg px-4 py-2.5 text-sm font-semibold text-success-ink"
      >
        <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
        <span>
          Verbonden met {account.provider === "outlook" ? "Outlook" : "Google"} als {account.email}. Je werk wordt vanaf
          nu automatisch bewaard.
        </span>
      </div>
    );
  }
  return <TrialBanner onLogin={onLogin} />;
}

/**
 * Statusbanner bovenaan de proefomgeving. Breed genoeg: alles op één regel; anders titel en link bovenaan
 * met de uitleg eronder; op een telefoon de link onder de uitleg. Gebaseerd op de breedte van de banner zelf.
 */
function TrialBanner({ onLogin }: { onLogin: () => void }) {
  return (
    <section aria-label="Proefomgeving" className="@container">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-0.5 rounded-[18px] border border-trial-line bg-trial-bg px-4 py-3 @[30rem]:grid-cols-[auto_minmax(0,1fr)_auto] @[70rem]:grid-cols-[auto_auto_minmax(0,1fr)_auto] @[70rem]:items-center @[70rem]:gap-x-4 @[70rem]:rounded-full @[70rem]:px-5">
        <span
          aria-hidden
          className="col-start-1 row-start-1 mt-0.5 flex size-8 items-center justify-center rounded-full bg-trial-accent @[70rem]:mt-0"
        >
          <Check className="size-4 text-white" strokeWidth={2.5} />
        </span>
        <p className="col-start-2 row-start-1 self-center text-[17px] leading-snug font-extrabold text-ink">
          Proefomgeving: geen account nodig
        </p>
        <p className="col-start-2 row-start-2 text-[15px] leading-snug text-ink-3 @[30rem]:col-[2/4] @[70rem]:col-[3/4] @[70rem]:row-start-1">
          Je werk blijft 7 dagen op dit toestel. Maak een account om het te bewaren.
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="col-start-2 row-start-3 min-h-11 cursor-pointer justify-self-start text-left text-[15px] font-semibold text-brand underline-offset-4 hover:text-brand-hover hover:underline @[30rem]:col-start-3 @[30rem]:row-start-1 @[30rem]:-my-1.5 @[30rem]:justify-self-end @[70rem]:col-start-4 @[70rem]:my-0"
        >
          Inloggen of account aanmaken
        </button>
      </div>
    </section>
  );
}

/**
 * Hoofdvlak van de proefomgeving (C1–C4): het echte overleg in opbouw. Lege velden gestippeld,
 * voorstellen met blauwe rand; alles is rechtstreeks aanpasbaar.
 */
