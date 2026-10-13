"use client";

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Chips } from "@/components/probeer/assistant-panel";

/** Voorbeeldoverleggen onder "Vertel het me" (C0g). Eén lijst, zodat ze later per sector kunnen verschillen. */
export const TELL_ME_SUGGESTIONS = [
  "Wekelijks productieoverleg",
  "Maandelijks directieoverleg",
  "Teamoverleg sales",
  "1-op-1 met een medewerker",
] as const;

/**
 * "Of begin met een voorbeeld" met chips onder de vraag van het vertelpad. Een tik vult het chatveld (niet
 * versturen). Verdwijnt zolang er iets in het chatveld staat; reduced motion: enkel een fade.
 */
export function TellSuggestions({
  visible,
  disabled,
  onPick,
}: {
  visible: boolean;
  disabled?: boolean;
  onPick: (text: string) => void;
}) {
  const labelId = useId();
  const reduce = useReducedMotion();
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: -4 };
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="suggesties"
          initial={hidden}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={hidden}
          transition={{ duration: reduce ? 0.15 : 0.2, ease: [0.65, 0, 0.35, 1] }}
          className="flex flex-col gap-2"
        >
          <span id={labelId} className="text-[13px] font-bold text-ink-3">
            Of begin met een voorbeeld
          </span>
          <Chips
            label="Of begin met een voorbeeld"
            labelledBy={labelId}
            disabled={disabled}
            options={TELL_ME_SUGGESTIONS.map((s) => ({ value: s, label: s }))}
            onSelect={(v) => onPick(v)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
