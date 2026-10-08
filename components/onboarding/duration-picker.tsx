"use client";

import { useId, useState } from "react";
import { ChoiceGroup } from "@/components/onboarding/choice-group";
import { Input } from "@/components/ui/input";
import { DURATION_PRESETS } from "@/lib/meeting";
import type { Minutes } from "@/lib/time";

const OTHER = -1;

/** Duur als knoppen: 15 min, 30 min, 1 uur, 1u30, Anders… (veld in minuten). */
export function DurationPicker({ value, onChange }: { value: Minutes; onChange: (m: Minutes) => void }) {
  const inputId = useId();
  const isPreset = DURATION_PRESETS.some((p) => p.value === value);
  const [other, setOther] = useState(!isPreset);
  const [text, setText] = useState<string | null>(null);
  const showOther = other || !isPreset;

  const commit = () => {
    if (text === null) return;
    const n = Math.round(Number(text) / 5) * 5;
    if (Number.isFinite(n) && n >= 5 && n <= 600) onChange(n);
    setText(null);
  };

  return (
    <ChoiceGroup
      legend="Duur"
      variant="pills"
      value={showOther ? OTHER : value}
      onChange={(v) => {
        if (v === OTHER) {
          setOther(true);
          requestAnimationFrame(() => document.getElementById(inputId)?.focus());
        } else {
          setOther(false);
          onChange(v);
        }
      }}
      options={[...DURATION_PRESETS, { value: OTHER, label: "Anders…" }]}
    >
      {showOther && (
        <div className="flex items-center gap-2">
          <label htmlFor={inputId} className="text-sm font-bold">
            Duur in minuten
          </label>
          <Input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={5}
            max={600}
            step={5}
            className="w-28"
            value={text ?? String(value)}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
          />
          <span className="text-sm text-ink-2">min</span>
        </div>
      )}
    </ChoiceGroup>
  );
}
