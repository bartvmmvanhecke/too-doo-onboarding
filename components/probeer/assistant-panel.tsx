"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import { Check, FileUp, Loader2, Mic, SendHorizontal, X } from "lucide-react";
import { AssistantMenu, type AssistantMenuItem } from "@/components/probeer/assistant-menu";
import { useFileDrop } from "@/components/probeer/entry-blocks";
import { PlusMenu, type PlusMenuActions } from "@/components/probeer/plus-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Message } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

/** "**vet**" → <strong>. */
export function RichText({ text }: { text: string }) {
  const parts = text.split("**");
  return <>{parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))}</>;
}

export function Bubble({ from, children }: { from: Message["from"]; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[92%] px-4 py-3 text-[15px] leading-normal whitespace-pre-line",
        from === "assistant"
          ? "self-start rounded-[16px_16px_16px_4px] bg-app text-ink"
          : "self-end rounded-[16px_16px_4px_16px] bg-brand text-white",
      )}
    >
      {children}
    </div>
  );
}

/** Verwerken duurt langer dan 600 ms vóór de overgang (C0h): een stille indicator met uitleg. */
export function Preparing({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2.5 self-start rounded-2xl bg-app px-4 py-3 text-[15px]">
      <span aria-hidden className="size-2 animate-pulse rounded-full bg-brand" />
      {label}
    </div>
  );
}

export function TypingDots() {
  return (
    <div role="status" aria-label="De assistent typt" className="flex gap-1 self-start rounded-2xl bg-app px-4 py-3.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="size-2 animate-bounce rounded-full bg-ink-3"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

/** Keuzeknoppen onder een vraag van de assistent. */
export function Chips({
  label,
  labelledBy,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  /** Id van een zichtbaar label; dan `aria-labelledby` in plaats van `aria-label`. */
  labelledBy?: string;
  options: { value: string; label: string }[];
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(o.value, o.label)}
          className="min-h-11 cursor-pointer rounded-full border border-line bg-white px-3.5 py-2 text-sm font-bold text-ink hover:bg-app disabled:cursor-not-allowed disabled:opacity-60"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface AssistantInputProps {
  label: string;
  /** Zichtbaar label boven het tekstvak (C1); anders enkel voor schermlezers. */
  visibleLabel?: boolean;
  placeholder: string;
  onSend: (text: string) => void;
  onMic?: () => void;
  listening?: boolean;
  disabled?: boolean;
  /** "+"-menu links in het chatveld: notities plakken, bestand kiezen, agenda koppelen. */
  plus?: PlusMenuActions;
  /** Telt op wanneer het chatveld de focus moet krijgen (bv. na "Ik vertel het je"). */
  focusRequest?: number;
  /** Vult het chatveld met deze tekst (zonder te versturen), focus erin en de cursor achteraan. */
  fill?: { text: string; at: number };
  /** Bij elke wijziging van de tekst in het chatveld, ook na versturen (dan leeg). */
  onDraftChange?: (text: string) => void;
}

function AssistantInput({
  label,
  visibleLabel,
  placeholder,
  onSend,
  onMic,
  listening,
  disabled,
  plus,
  focusRequest = 0,
  fill,
  onDraftChange,
}: AssistantInputProps) {
  const [text, setTextState] = useState("");
  const setText = (value: string) => {
    setTextState(value);
    onDraftChange?.(value);
  };
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // Een suggestie vult het veld; na de render de focus erin en de cursor achteraan.
  const filled = useRef(fill?.at ?? 0);
  const caretToEnd = useRef(false);
  useEffect(() => {
    if (!fill || fill.at === filled.current) return;
    filled.current = fill.at;
    caretToEnd.current = true;
    setTextState(fill.text);
    onDraftChange?.(fill.text);
  }, [fill, onDraftChange]);
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!caretToEnd.current || !field) return;
    caretToEnd.current = false;
    field.focus();
    field.setSelectionRange(text.length, text.length);
  }, [text]);
  // Enkel bij een nieuwe aanvraag; niet opnieuw wanneer de pagina weer zichtbaar wordt (Activity).
  const focused = useRef(focusRequest);
  useEffect(() => {
    if (focusRequest === focused.current) return;
    focused.current = focusRequest;
    fieldRef.current?.focus();
  }, [focusRequest]);
  const send = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex flex-col gap-2 border-t border-line-soft px-4 pt-3.5 pb-4"
    >
      <label htmlFor="assistent-bericht" className={visibleLabel ? "text-[13px] font-bold text-ink-2" : "sr-only"}>
        {label}
      </label>
      <div className="flex items-end gap-2">
        {plus && <PlusMenu {...plus} disabled={disabled} />}
        <textarea
          ref={fieldRef}
          id="assistent-bericht"
          rows={visibleLabel ? 2 : 1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-[46px] min-w-0 flex-1 resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] leading-normal text-ink outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)]"
        />
        {onMic && (
          <Button
            variant="outline"
            size="icon"
            aria-label={listening ? "Luistert…" : "Inspreken"}
            aria-pressed={listening}
            disabled={disabled && !listening}
            onClick={onMic}
            className="size-[46px] rounded-xl"
          >
            {listening ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Mic className="size-5" aria-hidden />
            )}
          </Button>
        )}
        <Button
          type="submit"
          size="icon"
          aria-label="Versturen"
          disabled={disabled || !text.trim()}
          className="size-[46px] rounded-xl"
        >
          <SendHorizontal className="size-5" aria-hidden />
        </Button>
      </div>
    </form>
  );
}

/** Volledige klassen per breakpoint (Tailwind leest enkel letterlijke klassen). */
const LAYOUT = {
  app: {
    panel:
      "lg:sticky lg:top-0 lg:h-dvh lg:w-[400px] lg:shrink-0 lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none",
    head: "lg:py-4 lg:pr-24",
  },
  trial: {
    panel:
      "panel:sticky panel:inset-x-auto panel:top-4 panel:mx-4 panel:mt-4 panel:mb-4 panel:h-[calc(100dvh-32px)] panel:w-[400px] panel:shrink-0 panel:shadow-none lg:top-8 lg:mt-8 lg:h-[calc(100dvh-48px)] lg:max-h-[calc(100dvh-48px)]",
    head: "panel:py-4 panel:pr-24",
  },
  /**
   * Startscherm: het brede keuzepaneel (± 520 px) met schaduw naar links, het helderste vlak van het scherm.
   * Onder 900 px staat het in de flow, bovenaan en schermvullend, met het navy vlak eronder.
   */
  welcome: {
    panel:
      "max-panel:static max-panel:order-first max-panel:h-auto max-panel:min-h-dvh max-panel:rounded-none max-panel:border-t-0 max-panel:shadow-none panel:sticky panel:top-0 panel:h-dvh panel:min-w-0 panel:flex-[1_1_520px] panel:rounded-none panel:border-t-0 panel:shadow-[-24px_0_48px_var(--onboarding-panel-shadow)]",
    head: "panel:py-4 panel:pr-24",
  },
} as const;

/**
 * Assistentpaneel rechts (SPEC-LAZY.md §3): kop met ⋯ en ×, berichten, invoer onderaan. Gesloten wordt het een
 * zwevende knop "Assistent" rechtsonder (C1g). Op smalle schermen een onderblad.
 */
export function AssistantPanel({
  subtitle,
  menu,
  closedHint,
  onClosedHintDone,
  messages,
  typing,
  renderCard,
  renderBelow,
  controls,
  input,
  open,
  onOpenChange,
  onFileDrop,
  layout = "app",
  header,
  intro,
  typingLabel,
  morphFrom,
}: {
  subtitle: string;
  /** "⋯" in de kop (C1f), bv. een voorbeeldagenda of de assistent sluiten. */
  menu?: AssistantMenuItem[];
  /** De eerste keer gesloten: tooltip boven de zwevende knop (C1g), weg na 4 s of bij de eerste klik. */
  closedHint?: boolean;
  onClosedHintDone?: () => void;
  messages: Message[];
  typing: boolean;
  renderCard?: (card: NonNullable<Message["card"]>, isLast: boolean) => ReactNode;
  /** Onder de bubbel van een bericht, bv. de doelchips onder de doelvraag (C0j–C0m). */
  renderBelow?: (message: Message) => ReactNode;
  controls?: ReactNode;
  /** Het chatveld onderaan; zonder (het startscherm) geen invoer. */
  input?: AssistantInputProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Een bestand slepen op het hele paneel verwerkt het als notities. */
  onFileDrop?: ((file: File) => void) | null;
  /**
   * "app": kolom rechts vanaf 1024 px (de app na bewaren). "trial": vanaf 900 px, zodat het paneel op het
   * welkomstscherm en in de proefomgeving op exact dezelfde plek en breedte staat (SPEC-LAZY.md §4, Stap 0).
   * "welcome": het brede keuzepaneel van het startscherm; hetzelfde element versmalt bij de overgang.
   */
  layout?: "app" | "trial" | "welcome";
  /** Eigen kop in plaats van "Assistent · …" (welkomstscherm: logo en Inloggen). */
  header?: ReactNode;
  /** Inhoud vóór het gesprek, bv. de welkomstkop en de keuzes. */
  intro?: ReactNode;
  /** In plaats van de typ-indicator, bv. "Ik zet je overleg klaar…". */
  typingLabel?: string | null;
  /**
   * Overgang startscherm → app: de breedte (px) van het keuzepaneel vlak voor de overgang. Hetzelfde paneel
   * versmalt dan in 500 ms naar de breedte van het assistentpaneel, en de schaduw gaat naar de rand.
   */
  morphFrom?: number | null;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const drop = useFileDrop((file) => onFileDrop?.(file), !!onFileDrop);
  // Een kaart toont altijd de huidige state, dus enkel bij het laatste bericht met die kaart.
  const lastWithCard = (card: Message["card"]) => messages.findLastIndex((m) => m.card === card);

  const hasIntro = !!intro;
  useEffect(() => {
    // De welkomstkop blijft bovenaan staan; het gesprek scrolt mee naar het laatste bericht.
    if (!hasIntro) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, typing, controls, hasIntro]);

  const c = LAYOUT[layout];
  const reduce = useReducedMotion();

  // Vóór het eerste beeld van de app-layout: terug naar de oude breedte, dan met een CSS-transitie naar de
  // breedte uit de klassen. Geen moment zonder of met twee panelen; na afloop gewoon de klassen.
  const asideRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = asideRef.current;
    if (!el || !morphFrom) return;
    el.style.transition = "none";
    el.style.width = `${morphFrom}px`;
    el.style.boxShadow = "-24px 0 48px var(--onboarding-panel-shadow)";
    el.style.borderLeftColor = "transparent";
    void el.offsetWidth;
    el.style.transition = ["width", "box-shadow", "border-left-color"]
      .map((p) => `${p} 500ms cubic-bezier(0.4, 0, 0.2, 1)`)
      .join(", ");
    el.style.width = "";
    el.style.boxShadow = "";
    el.style.borderLeftColor = "";
    const done = setTimeout(() => (el.style.transition = ""), 550);
    return () => clearTimeout(done);
  }, [morphFrom]);
  const transition: Transition = reduce ? { duration: 0 } : { duration: 0.25, ease: [0.65, 0, 0.35, 1] };

  return (
    <AnimatePresence initial={false}>
      {!open ? (
        <FloatingAssistant
          key="knop"
          transition={transition}
          hint={!!closedHint}
          onHintDone={onClosedHintDone}
          onOpen={() => onOpenChange(true)}
        />
      ) : (
        <motion.aside
          key="paneel"
          ref={asideRef}
          aria-label="Assistent"
          data-assistant-panel
          {...drop.handlers}
          // Het paneel schuift naar de zwevende knop rechtsonder bij sluiten, en eruit bij openen.
          initial={{ opacity: 0, x: 32, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 32, scale: 0.97 }}
          transition={transition}
          style={{ transformOrigin: "bottom right" }}
          className={cn(
            layout === "trial"
              ? "fixed inset-x-4 bottom-4 z-30 flex h-[55dvh] max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-2xl border border-line-soft bg-white shadow-[0_-12px_32px_rgba(22,33,58,0.14)]"
              : "fixed inset-x-0 bottom-0 z-30 flex h-[55dvh] flex-col rounded-t-2xl border-t border-line-soft bg-white shadow-[0_-12px_32px_rgba(22,33,58,0.14)]",
            c.panel,
          )}
        >
          {header ?? (
            <div className={cn("flex items-center gap-3 border-b border-line-soft py-3 pr-2 pl-4", c.head)}>
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand">
                <Check className="size-[18px] text-white" strokeWidth={2.5} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-extrabold">Assistent</span>
                <span className="text-[13px] text-ink-3">{subtitle}</span>
              </span>
              {menu && <AssistantMenu items={menu} />}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Assistent sluiten"
                      onClick={() => onOpenChange(false)}
                    >
                      <X className="size-[18px]" strokeWidth={2.5} aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sluiten · je vindt me rechtsonder</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          <div
            // Van keuzepaneel naar gesprek: de inhoud crossfadet, het paneel blijft staan.
            key={hasIntro ? "intro" : "gesprek"}
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-y-auto",
              !hasIntro && "animate-in duration-300 fade-in motion-reduce:animate-none",
            )}
          >
            {intro}
            <div
              role="log"
              aria-live="polite"
              aria-label="Gesprek met de assistent"
              className="flex flex-col gap-3.5 px-4 pt-5"
            >
              {messages.map((m, i) => (
                <Fragment key={m.id}>
                  <Bubble from={m.from}>
                    <RichText text={m.text} />
                    {m.card && renderCard?.(m.card, i === lastWithCard(m.card))}
                  </Bubble>
                  {renderBelow?.(m)}
                </Fragment>
              ))}
              {typing && (typingLabel ? <Preparing label={typingLabel} /> : <TypingDots />)}
            </div>
            {!typing && controls && <div className="flex flex-col gap-3 px-4 pt-3">{controls}</div>}
            {/* Ruimte onderaan: de demo-knop rechtsonder bedekt zo niets blijvend. */}
            <div ref={endRef} aria-hidden className={cn("shrink-0", hasIntro ? "h-0" : "h-16")} />
          </div>

          {input && <AssistantInput {...input} />}

          {drop.over && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand bg-brand-selected/95 text-[15px] font-bold text-brand"
            >
              <FileUp className="size-7" aria-hidden />
              Laat los om je notities te verwerken
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/**
 * Gesloten assistent (C1g): een pil-knop "Assistent" rechtsonder. De eerste keer staat erboven één tooltip,
 * die na 4 s of bij de eerste klik verdwijnt.
 */
function FloatingAssistant({
  hint,
  onHintDone,
  onOpen,
  transition,
}: {
  hint: boolean;
  onHintDone?: () => void;
  onOpen: () => void;
  transition: Transition;
}) {
  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => onHintDone?.(), 4000);
    return () => clearTimeout(id);
  }, [hint, onHintDone]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={transition}
      className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-2"
    >
      {hint && (
        <p
          role="status"
          className="max-w-[260px] rounded-xl bg-ink px-3.5 py-2.5 text-[13px] leading-snug text-white shadow-[0_8px_24px_rgba(10,20,40,0.25)]"
        >
          Ik ben hier als je me nodig hebt. Ons gesprek blijft bewaard.
        </p>
      )}
      <button
        type="button"
        aria-label="Assistent openen"
        onClick={() => {
          onHintDone?.();
          onOpen();
        }}
        className="flex min-h-14 cursor-pointer items-center gap-2.5 rounded-full bg-brand pr-5 pl-2 text-[15px] font-extrabold text-white shadow-[0_10px_28px_rgba(11,95,216,0.35)] hover:bg-brand-hover"
      >
        <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-white/15">
          <Check className="size-[18px]" strokeWidth={2.5} />
        </span>
        Assistent
      </button>
    </motion.div>
  );
}
