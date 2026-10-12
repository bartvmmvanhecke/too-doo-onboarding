"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";

const LENGTH = 6;

/** Zes vakjes voor een code van 6 cijfers. Plakken van 6 cijfers vult alles in. */
export function CodeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  const setAt = (i: number, d: string) => {
    const next = [...digits];
    next[i] = d;
    onChange(next.join("").slice(0, LENGTH));
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, "");
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < LENGTH - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {digits.map((d, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          autoFocus={i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Cijfer ${i + 1} van ${LENGTH}`}
          value={d}
          onPaste={onPaste}
          onKeyDown={(e) => onKeyDown(e, i)}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, v);
            if (v && i < LENGTH - 1) refs.current[i + 1]?.focus();
          }}
          className="size-12 px-0 text-center text-xl font-extrabold"
        />
      ))}
    </div>
  );
}
