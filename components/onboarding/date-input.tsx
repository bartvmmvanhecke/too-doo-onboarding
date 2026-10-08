"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatShortDate, parseDateInput, toISO, type ISODate } from "@/lib/date";

/**
 * Typbare datum ("ma 13 okt", "13 okt", "13/10", "13-10"). Bevestigen bij Enter
 * of verlaten; ongeldige invoer zet de vorige waarde terug.
 */
export function DateInput({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: ISODate;
  onChange: (d: ISODate) => void;
}) {
  const [text, setText] = useState<string | null>(null);

  const commit = () => {
    if (text !== null) {
      const parsed = parseDateInput(text);
      if (parsed) onChange(toISO(parsed));
    }
    setText(null);
  };

  return (
    <Input
      type="text"
      autoComplete="off"
      {...props}
      value={text ?? formatShortDate(value)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          setText(null);
        }
      }}
    />
  );
}
