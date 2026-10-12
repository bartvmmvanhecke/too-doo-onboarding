"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronRight, FileUp, Loader2, Mic, SendHorizontal, Sparkles } from "lucide-react";
import { useFileDrop } from "@/components/probeer/entry-blocks";
import { PlusMenu, type PlusMenuActions } from "@/components/probeer/plus-menu";
import { Button } from "@/components/ui/button";
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
  options,
  onSelect,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
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
}: AssistantInputProps) {
  const [text, setText] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
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

/**
 * Assistentpaneel rechts (SPEC-LAZY.md §3): kop, voortgang, berichten, invoer onderaan.
 * Inklapbaar; ingeklapt blijft een smalle knop "Assistent". Op smalle schermen een onderblad.
 */
export function AssistantPanel({
  subtitle,
  progress,
  messages,
  typing,
  renderCard,
  controls,
  input,
  open,
  onOpenChange,
  onFileDrop,
}: {
  subtitle: string;
  progress?: string;
  messages: Message[];
  typing: boolean;
  renderCard?: (card: NonNullable<Message["card"]>, isLast: boolean) => ReactNode;
  controls?: ReactNode;
  input: AssistantInputProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Een bestand slepen op het hele paneel verwerkt het als notities. */
  onFileDrop?: ((file: File) => void) | null;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const drop = useFileDrop((file) => onFileDrop?.(file), !!onFileDrop);
  // Een kaart toont altijd de huidige state, dus enkel bij het laatste bericht met die kaart.
  const lastWithCard = (card: Message["card"]) => messages.findLastIndex((m) => m.card === card);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, typing, controls]);

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Assistent tonen"
        onClick={() => onOpenChange(true)}
        className="fixed right-0 bottom-0 left-0 z-30 flex min-h-12 cursor-pointer items-center justify-center gap-2 border-t border-line-soft bg-white text-sm font-extrabold text-brand shadow-[0_-8px_24px_rgba(22,33,58,0.08)] lg:sticky lg:top-14 lg:right-auto lg:left-auto lg:mt-14 lg:h-[calc(100dvh-3.5rem)] lg:w-12 lg:flex-col lg:border-t-0 lg:border-l lg:shadow-none"
      >
        <Sparkles className="size-4" aria-hidden />
        <span className="lg:[writing-mode:vertical-rl]">Assistent</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Assistent"
      {...drop.handlers}
      className="fixed inset-x-0 bottom-0 z-30 flex h-[55dvh] flex-col rounded-t-2xl border-t border-line-soft bg-white shadow-[0_-12px_32px_rgba(22,33,58,0.14)] lg:sticky lg:top-0 lg:h-dvh lg:w-[400px] lg:shrink-0 lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none xl:w-[420px]"
    >
      <div className="flex items-center gap-3 border-b border-line-soft py-3 pr-2 pl-4 lg:py-4 lg:pr-24">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand">
          <Check className="size-[18px] text-white" strokeWidth={2.5} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-extrabold">Assistent</span>
          <span className="text-[13px] text-ink-3">{subtitle}</span>
        </span>
        {progress && (
          <span className="shrink-0 rounded-md bg-brand-soft px-2 py-1 text-xs font-extrabold text-brand">
            {progress}
          </span>
        )}
        <Button variant="ghost" size="icon" aria-label="Assistent verbergen" onClick={() => onOpenChange(false)}>
          <ChevronRight className="size-[18px] max-lg:rotate-90" strokeWidth={2.5} aria-hidden />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
            </Fragment>
          ))}
          {typing && <TypingDots />}
        </div>
        {!typing && controls && <div className="flex flex-col gap-3 px-4 pt-3">{controls}</div>}
        {/* Ruimte onderaan: de demo-knop rechtsonder bedekt zo niets blijvend. */}
        <div ref={endRef} aria-hidden className="h-16 shrink-0" />
      </div>

      <AssistantInput {...input} />

      {drop.over && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand bg-brand-selected/95 text-[15px] font-bold text-brand"
        >
          <FileUp className="size-7" aria-hidden />
          Laat los om je notities te verwerken
        </div>
      )}
    </aside>
  );
}
