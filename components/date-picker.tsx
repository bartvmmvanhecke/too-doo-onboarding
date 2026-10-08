"use client";

import * as React from "react";
import { nlBE } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, formatShortDate, parseDateInput, today } from "@/lib/date";
import { cn } from "@/lib/utils";

/** "vr 17 okt"; met jaartal als de datum verder dan een jaar weg ligt (anders leest parseDateInput het jaar fout). */
function formatPicked(d: Date): string {
  const short = formatShortDate(d);
  return d < addDays(today(), 365) ? short : `${short} ${d.getFullYear()}`;
}

/**
 * Datumveld volgens het shadcn date picker-patroon (Popover + Calendar + Input).
 * Klikken in het veld of ↓ opent de kalender; typen blijft mogelijk ("vr 17 okt", "17/10", "vrijdag").
 */
export function DatePicker({
  value,
  onChange,
  className,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [viaKeyboard, setViaKeyboard] = React.useState(false);
  const selected = React.useMemo(() => parseDateInput(value) ?? undefined, [value]);
  const [month, setMonth] = React.useState<Date | undefined>(selected);

  const show = (keyboard: boolean) => {
    setMonth(selected);
    setViaKeyboard(keyboard);
    setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        onClick={(e) => {
          // Klikken in een open veld (bv. om de cursor te zetten) sluit de kalender niet.
          e.preventDefault();
          if (!open) show(false);
        }}
      >
        <Input
          type="text"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            const parsed = parseDateInput(e.target.value);
            if (parsed) setMonth(parsed);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              show(true);
              return;
            }
            onKeyDown?.(e);
          }}
          className={cn(className)}
          {...props}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden p-0"
        align="start"
        // Muis: focus blijft in het veld zodat je kan typen. Toetsenbord (↓): de kalender krijgt focus.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          locale={nlBE}
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          disabled={{ before: today() }}
          autoFocus={viaKeyboard}
          onSelect={(d) => {
            if (d) onChange(formatPicked(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
