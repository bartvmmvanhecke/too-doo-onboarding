"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, ChevronRight, FileText, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { MeetingToActionStill } from "@/components/onboarding/meeting-to-action-still";
import { SHARED } from "@/components/probeer/trial-sidebar";
import { Button } from "@/components/ui/button";
import type { StartChoice } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

/** Ease van de overgang naar de app (± 700 ms). */
export const DOCK_EASE = [0.4, 0, 0.2, 1] as const;
/** Laag 2 (150–650 ms): het blauwe vlak krimpt tot de zijbalk, het logo landt. */
export const DOCK = { duration: 0.5, ease: DOCK_EASE };
/** Laag 1 (0–150 ms): links leegmaken; het logo blijft staan. */
const CLEAR = { duration: 0.15, ease: DOCK_EASE };

/** De uitlegzin links wisselt met de gekozen optie. */
const EXPLAIN: Record<StartChoice, string> = {
  meeting: "Eén zin is genoeg. Wij maken er een agenda van die je meteen kunt bijwerken.",
  notes: "Uit je vorige notities halen we de agendapunten, acties en beslissingen die nog openstaan.",
  calendar: "Kies een overleg uit je agenda. Titel, datum en deelnemers staan dan al klaar.",
};

/**
 * Startscherm, links: bewust rustig. Eén vlak navy met het logo linksboven, de illustratie en één headline met
 * een uitlegzin die meewisselt met de gekozen optie. Het keuzepaneel rechts is het hoofdvlak.
 * Bij de overgang (`retreat`) vervaagt alles behalve het logo; vlak en logo zijn gedeelde elementen die in de
 * zijbalk van de app landen. Onder 900 px staat dit vlak onder het paneel, zonder illustratie.
 */
export function WelcomeStage({
  selected,
  retreat,
  shared,
}: {
  selected: StartChoice;
  retreat: boolean;
  shared: boolean;
}) {
  return (
    <section
      aria-label="Wat too-doo doet"
      className="relative isolate order-last flex min-w-0 flex-col px-6 py-8 text-white panel:order-none panel:min-h-dvh panel:flex-[999_1_560px] panel:px-14 panel:py-10"
    >
      <motion.div
        aria-hidden
        layoutId={shared ? SHARED.panel : undefined}
        transition={DOCK}
        className="absolute inset-0 -z-10 bg-onboarding-ground"
      />
      <motion.span
        layoutId={shared ? SHARED.logo : undefined}
        transition={DOCK}
        className="self-start text-[22px] leading-none font-extrabold"
      >
        too-<span className="text-welcome-accent">doo</span>
      </motion.span>
      <motion.div
        animate={retreat ? { opacity: 0, scale: 0.98 } : { opacity: 1, scale: 1 }}
        transition={CLEAR}
        className="flex flex-1 flex-col items-center justify-center gap-10 pt-8"
      >
        <div className="hidden w-full justify-center min-[1200px]:flex">
          <MeetingToActionStill />
        </div>
        <div className="flex max-w-[480px] flex-col gap-2 text-center">
          <p className="text-[26px] leading-tight font-extrabold">Wat je afspreekt, gebeurt ook.</p>
          {/* Korte crossfade (150 ms) bij het wisselen; beide zinnen in dezelfde cel, geen andere beweging. */}
          <div className="grid">
            <AnimatePresence initial={false}>
              <motion.p
                key={selected}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "linear" }}
                className="[grid-area:1/1] text-[15px] leading-normal text-onboarding-ink"
              >
                {EXPLAIN[selected]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/** Bovenaan rechts in het keuzepaneel: "Al een account? Inloggen". Verdwijnt bij de overgang. */
export function WelcomeHeader({ onLogin, retreat }: { onLogin: () => void; retreat: boolean }) {
  return (
    <motion.div
      animate={{ opacity: retreat ? 0 : 1 }}
      transition={CLEAR}
      className="flex items-center justify-end gap-1 pt-3 pr-20 pl-6 text-[15px] text-ink-2 panel:pt-4 panel:pr-24"
    >
      Al een account?
      <Button variant="link" size="sm" className="min-h-11 px-1 text-[15px] font-bold" onClick={onLogin}>
        Inloggen
      </Button>
    </motion.div>
  );
}

const CHOICES: {
  value: StartChoice;
  label: string;
  hint: string;
  icon: typeof MessageCircle;
  badge?: string;
}[] = [
  {
    value: "meeting",
    label: "Vertel het me",
    hint: "Beschrijf je vergadering in één zin",
    icon: MessageCircle,
    badge: "Snelst",
  },
  {
    value: "notes",
    label: "Gebruik eerdere notities",
    hint: "Plak tekst, upload een bestand of spreek in",
    icon: FileText,
  },
  { value: "calendar", label: "Haal het uit mijn agenda", hint: "Outlook of Google", icon: CalendarDays },
];

export const WELCOME_LABEL: Record<StartChoice, string> = Object.fromEntries(
  CHOICES.map((c) => [c.value, c.label]),
) as Record<StartChoice, string>;

/** Na een mislukte agendakoppeling vraagt de assistent opnieuw hoe je wil starten: enkel de twee andere. */
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
      {CHOICES.filter((c) => choices.includes(c.value)).map((c) => (
        <ChoiceCard key={c.value} choice={c} selected={false} disabled={disabled} onClick={() => onChoose(c.value)} />
      ))}
    </div>
  );
}

/**
 * Eén keuzekaart: een echte knop met `aria-pressed`. Geselecteerd = 2 px primaire rand (1 px rand + 1 px ring,
 * zodat niets verschuift), `--primary-tint` en een zachte schaduw. `children` klapt open onder de knop.
 */
function ChoiceCard({
  choice: { label, hint, icon: Icon, badge },
  selected,
  disabled,
  onClick,
  children,
}: {
  choice: (typeof CHOICES)[number];
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border transition-[background-color,box-shadow,border-color] duration-150",
        selected
          ? "border-primary bg-primary-tint shadow-[0_0_0_1px_var(--primary),0_8px_24px_var(--choice-shadow)]"
          : "border-track bg-white hover:bg-app",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onClick}
        className="flex min-h-11 w-full cursor-pointer items-center gap-4 rounded-[14px] px-5 py-[18px] text-left text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            selected ? "bg-white" : "bg-brand-soft",
          )}
        >
          <Icon className="size-5 text-brand" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 text-base font-extrabold">
            {label}
            {badge && (
              <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-extrabold text-brand-hover">
                {badge}
              </span>
            )}
          </span>
          <span className="text-sm text-ink-2">{hint}</span>
        </span>
        {!badge && <ChevronRight className="size-5 shrink-0 text-ink-subtle" strokeWidth={2.5} aria-hidden />}
      </button>
      {children}
    </div>
  );
}

/**
 * "Vertel het me", opengeklapt: een zichtbaar label, een tekstvak van twee regels en "Maak mijn agenda".
 * De focus gaat enkel naar het tekstvak bij een klik op de kaart (`focusRequest`), niet bij het laden.
 */
function TellForm({
  value,
  onChange,
  onSubmit,
  busy,
  focusRequest,
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  busy: boolean;
  focusRequest: number;
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const focused = useRef(focusRequest);
  useEffect(() => {
    if (focusRequest === focused.current) return;
    focused.current = focusRequest;
    fieldRef.current?.focus();
  }, [focusRequest]);
  const submit = () => {
    if (busy) return;
    if (!value.trim()) return fieldRef.current?.focus();
    onSubmit();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2 px-5 pb-5"
    >
      <label htmlFor="welkom-zin" className="text-sm font-bold text-ink-2">
        Over welk overleg gaat het?
      </label>
      <div className="flex flex-wrap items-end justify-end gap-3">
        <textarea
          ref={fieldRef}
          id="welkom-zin"
          rows={2}
          value={value}
          disabled={busy}
          placeholder="Bv. ons wekelijks productieoverleg met het teamhoofd en planning"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="min-h-[68px] min-w-0 flex-[1_1_220px] resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] leading-normal text-ink outline-none placeholder:text-ink-3 focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)] disabled:opacity-60"
        />
        <Button type="submit" size="md" className="min-h-11" aria-disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Ik zet je agenda klaar…
            </>
          ) : (
            <>
              Maak mijn agenda
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/** Secundaire link onder de keuzes: vet, primair, niet onderlijnd (wel bij hover). */
const secondary =
  "inline-flex min-h-11 cursor-pointer items-center text-[15px] font-bold text-primary no-underline hover:text-brand-hover hover:underline disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Het keuzepaneel: label "Assistent", kop, de drie keuzekaarten en de twee secundaire links. Verticaal
 * gecentreerd; bij de overgang (`retreat`) vervaagt de inhoud, het paneel zelf blijft staan.
 */
export function WelcomeIntro({
  selected,
  disabled,
  retreat,
  sentence,
  onSentenceChange,
  onTell,
  telling,
  focusRequest,
  onChoose,
  onEmpty,
  onExample,
}: {
  selected: StartChoice;
  disabled: boolean;
  retreat: boolean;
  /** De zin in "Vertel het me". */
  sentence: string;
  onSentenceChange: (text: string) => void;
  /** "Maak mijn agenda". */
  onTell: () => void;
  /** De zin wordt verwerkt: de knop toont dat de agenda klaargezet wordt. */
  telling: boolean;
  /** Telt op bij een klik op "Vertel het me": de focus naar het tekstvak. */
  focusRequest: number;
  onChoose: (choice: StartChoice) => void;
  onEmpty: () => void;
  onExample: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      animate={{ opacity: retreat ? 0 : 1 }}
      transition={CLEAR}
      className="flex flex-1 flex-col justify-center px-6 py-8 panel:px-14 panel:py-10"
    >
      <div className="flex w-full max-w-[600px] flex-col gap-4">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-brand-tint">
            <Sparkles className="size-[18px] text-brand" strokeWidth={2.25} />
          </span>
          <span className="text-sm font-extrabold text-ink-2">Assistent</span>
        </span>
        <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-[-0.5px] panel:text-[36px]">
          Laten we je eerste overleg klaarzetten.
        </h1>
        <p className="text-[17px] leading-normal text-ink-2">
          Kies wat je al bij de hand hebt. Je kunt alles later aanpassen.
        </p>
        <div role="group" aria-label="Manier van starten" className="flex flex-col gap-3 pt-2">
          {CHOICES.map((c) => (
            <ChoiceCard
              key={c.value}
              choice={c}
              selected={selected === c.value}
              disabled={disabled}
              onClick={() => onChoose(c.value)}
            >
              {c.value === "meeting" && (
                <AnimatePresence initial={false}>
                  {selected === "meeting" && (
                    <motion.div
                      key="vertel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.2, ease: DOCK_EASE }}
                      className="overflow-hidden"
                    >
                      <TellForm
                        value={sentence}
                        onChange={onSentenceChange}
                        onSubmit={onTell}
                        busy={telling}
                        focusRequest={focusRequest}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </ChoiceCard>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 border-t border-line-faint pt-3">
          <button type="button" disabled={disabled} className={secondary} onClick={onEmpty}>
            Start met een lege vergadering
          </button>
          <Link href="/voorbeeld?van=probeer" onClick={onExample} className={secondary}>
            Bekijk eerst een voorbeeld
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
