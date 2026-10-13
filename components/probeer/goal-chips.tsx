"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEETING_GOALS, type MeetingGoal } from "@/lib/assistant/goals";
import { cn } from "@/lib/utils";

/**
 * De vier doelchips onder de vrijblijvende doelvraag (C0j–C0m). Een gekozen chip blijft staan met een
 * vinkje (`aria-pressed`), zodat er een tweede doel bij kan. Verdwijnt zodra de gebruiker typt of links
 * iets bewerkt; reduced motion: enkel een fade.
 */
export function GoalChips({
  visible,
  chosen,
  disabled,
  onPick,
}: {
  visible: boolean;
  chosen: MeetingGoal[];
  disabled?: boolean;
  onPick: (goal: MeetingGoal, label: string) => void;
}) {
  const reduce = useReducedMotion();
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y: -4 };
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="doelen"
          role="group"
          aria-label="Doel van dit overleg"
          initial={hidden}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={hidden}
          transition={{ duration: reduce ? 0.15 : 0.2, ease: [0.65, 0, 0.35, 1] }}
          className="flex flex-wrap gap-2 self-start"
        >
          {MEETING_GOALS.map((g) => {
            const pressed = chosen.includes(g.value);
            return (
              <Button
                key={g.value}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={pressed}
                disabled={disabled && !pressed}
                onClick={() => !pressed && onPick(g.value, g.label)}
                className={cn(
                  "h-auto rounded-full px-3.5 py-2 text-left whitespace-normal",
                  pressed && "border-primary bg-brand-selected text-primary hover:bg-brand-selected hover:text-primary",
                )}
              >
                {pressed && <Check className="size-4" strokeWidth={2.5} aria-hidden />}
                {g.label}
              </Button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
