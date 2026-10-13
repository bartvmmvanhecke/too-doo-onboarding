"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, ChevronRight, FileText, MessageCircle } from "lucide-react";
import { MeetingToActionIllustration } from "@/components/onboarding/MeetingToActionIllustration";
import { SHARED } from "@/components/probeer/trial-sidebar";
import { Button } from "@/components/ui/button";
import type { StartChoice } from "@/lib/assistant/types";

const EASE = [0.65, 0, 0.35, 1] as const;

/**
 * Welkom, links (SPEC-LAZY.md §4, Stap 0; C0f): blauw verloop met logo en zin, de geanimeerde illustratie en
 * de slottekst, als één gecentreerd blok. Bij de overgang (`retreat`) trekken de kaarten zich terug en
 * vervagen de teksten; paneel, logo en agendakaart zijn gedeelde elementen die in de app landen.
 * Onder 900 px geen illustratie.
 */
export function WelcomeStage({ retreat, shared }: { retreat: boolean; shared: boolean }) {
  return (
    <section
      aria-label="Wat too-doo doet"
      className="relative isolate hidden min-h-dvh flex-1 flex-col items-center justify-center gap-11 overflow-hidden px-12 py-10 text-white panel:flex"
    >
      <motion.div
        aria-hidden
        layoutId={shared ? SHARED.panel : undefined}
        transition={{ duration: 0.4, ease: EASE }}
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_20%,var(--welcome-glow)_0%,transparent_45%),linear-gradient(160deg,var(--welcome-from)_0%,var(--welcome-mid)_55%,var(--welcome-to)_100%)]"
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <motion.span
          layoutId={shared ? SHARED.logo : undefined}
          transition={{ duration: 0.4, ease: EASE }}
          className="text-[40px] leading-none font-extrabold"
        >
          too-<span className="text-welcome-accent">doo</span>
        </motion.span>
        <AnimatePresence>
          {!retreat && (
            <motion.span exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="text-[17px] text-nav-ink">
              Van losse punten in je overleg naar duidelijke opvolging.
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex w-full justify-center">
        <MeetingToActionIllustration
          retreat={retreat}
          renderAgenda={(card) => (
            <motion.div layoutId={shared ? SHARED.title : undefined} transition={{ duration: 0.4, ease: EASE }}>
              {card}
            </motion.div>
          )}
        />
      </div>
      <AnimatePresence>
        {!retreat && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex max-w-[480px] flex-col gap-1.5 text-center"
          >
            <span className="text-[26px] leading-tight font-extrabold">Wat je afspreekt, gebeurt ook.</span>
            <span className="text-[15px] leading-normal text-nav-ink">
              Uit elk agendapunt komen acties en beslissingen. Wat af is, verdwijnt. Wat volgt, staat al klaar.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Kop van het assistentpaneel op het welkomstscherm: logo en "Inloggen". */
export function WelcomeHeader({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line-soft py-3 pr-20 pl-6 panel:py-4 panel:pr-24">
      <span className="flex-1 text-[22px] font-extrabold text-logo">too-doo</span>
      <Button variant="link" size="sm" className="min-h-11 px-1 text-sm font-bold underline" onClick={onLogin}>
        Inloggen
      </Button>
    </div>
  );
}

const CHOICES: { value: StartChoice; label: string; hint: string; icon: typeof MessageCircle }[] = [
  { value: "meeting", label: "Vertel het me", hint: "Beschrijf je vergadering in één zin", icon: MessageCircle },
  {
    value: "notes",
    label: "Gebruik notities van een vorige vergadering",
    hint: "Plak tekst, upload een bestand of spreek in",
    icon: FileText,
  },
  { value: "calendar", label: "Haal het uit mijn agenda", hint: "Outlook of Google, optioneel", icon: CalendarDays },
];

export const WELCOME_LABEL: Record<StartChoice, string> = Object.fromEntries(
  CHOICES.map((c) => [c.value, c.label]),
) as Record<StartChoice, string>;

/** De drie keuzes (C0f), in deze volgorde; na een mislukte agendakoppeling enkel de twee andere. */
export function WelcomeChoices({
  choices = CHOICES.map((c) => c.value),
  disabled,
  onChoose,
}: {
  choices?: StartChoice[];
  disabled?: boolean;
  onChoose: (choice: StartChoice) => void;
}) {
  return (
    <div role="group" aria-label="Manier van starten" className="flex flex-col gap-2.5">
      {CHOICES.filter((c) => choices.includes(c.value)).map(({ value, label, hint, icon: Icon }) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(value)}
          className="flex min-h-16 cursor-pointer items-center gap-3.5 rounded-[14px] border border-track bg-white px-4 py-2.5 text-left text-ink hover:bg-app disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft">
            <Icon className="size-5 text-brand" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-base font-extrabold">{label}</span>
            <span className="text-[13px] text-ink-2">{hint}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-subtle" strokeWidth={2.5} aria-hidden />
        </button>
      ))}
    </div>
  );
}

/** Welkomstkop, keuzes en de twee secundaire links (C0f), bovenaan in het assistentpaneel. */
export function WelcomeIntro({
  disabled,
  onChoose,
  onEmpty,
  onExample,
}: {
  disabled: boolean;
  onChoose: (choice: StartChoice) => void;
  onEmpty: () => void;
  onExample: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3.5 px-6 pt-8 pb-5">
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-brand">
          <Check className="size-[18px] text-white" strokeWidth={2.5} />
        </span>
        <span className="text-sm font-extrabold text-ink-2">Assistent</span>
      </span>
      <h1 className="text-[26px] leading-tight font-extrabold">
        Welkom bij Too-doo.
        <br />
        Laten we je eerste overleg klaarzetten.
      </h1>
      <p className="text-base text-ink-2">Kies wat je al bij de hand hebt. Je kunt alles later aanpassen.</p>
      <div className="pt-1.5">
        <WelcomeChoices disabled={disabled} onChoose={onChoose} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 border-t border-line-faint pt-2.5">
        <Button
          variant="link"
          size="sm"
          disabled={disabled}
          className="min-h-11 px-0 text-[15px] font-bold underline"
          onClick={onEmpty}
        >
          Start met een lege vergadering
        </Button>
        <Link
          href="/voorbeeld?van=probeer"
          onClick={onExample}
          className="inline-flex min-h-11 items-center text-[15px] font-bold"
        >
          Bekijk eerst een voorbeeld
        </Link>
      </div>
    </div>
  );
}
