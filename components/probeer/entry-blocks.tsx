"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { FileUp, Loader2 } from "lucide-react";
import { GoogleMark, MicrosoftMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { CalendarOption, CalendarProvider } from "@/lib/assistant/types";
import { NOTES_ACCEPT } from "@/lib/notes-file";
import { cn } from "@/lib/utils";

/** Verborgen bestandskiezer + "Kies bestand"-knop; ook bruikbaar in het hoofdvlak. */
export function FilePicker({
  onFile,
  disabled,
  children,
  className,
  variant = "outline",
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: "outline" | "link";
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={NOTES_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Button
        variant={variant}
        size="sm"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className={className}
      >
        {children}
      </Button>
    </>
  );
}

/** Slepen van een bestand op een element. */
export function useFileDrop(onFile: (file: File) => void, enabled = true) {
  const [over, setOver] = useState(false);
  const handlers = enabled
    ? {
        onDragOver: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        },
      }
    : {};
  return { over, handlers };
}

const block = "flex flex-col gap-2.5 rounded-xl border border-line bg-white p-3.5";

/**
 * Stap 1 · "Waarmee wil je starten?" (C1): drie gelijkwaardige blokken, en een link naar het voorbeeld.
 */
export function EntryBlocks({
  busy,
  connecting,
  reading,
  onCalendar,
  onFile,
  onPaste,
  onTell,
  onExample,
}: {
  busy: boolean;
  connecting: CalendarProvider | null;
  reading: string | null;
  onCalendar: (provider: CalendarProvider) => void;
  onFile: (file: File) => void;
  onPaste: () => void;
  onTell: () => void;
  onExample: () => void;
}) {
  const { over, handlers } = useFileDrop(onFile, !busy);
  return (
    <div className="flex flex-col gap-2.5">
      <section aria-label="Uit je agenda" className={block}>
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">Uit mijn agenda</span>
          <span className="text-[13px] text-ink-2">Ik toon je vaste overleggen, jij kiest er één. Alleen lezen.</span>
        </span>
        <span className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onCalendar("outlook")}>
            {connecting === "outlook" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MicrosoftMark size={7} />
            )}
            Outlook
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onCalendar("google")}>
            {connecting === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleMark />}
            Google
          </Button>
        </span>
        {connecting && (
          <span role="status" className="text-[13px] text-ink-3">
            Verbinden met {connecting === "outlook" ? "Outlook" : "Google"}…
          </span>
        )}
      </section>

      <section aria-label="Notities van een vorig overleg" className={block}>
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">Notities van een vorig overleg</span>
          <span className="text-[13px] text-ink-2">Ik haal de acties en eigenaars eruit.</span>
        </span>
        <div
          {...handlers}
          data-dropzone="notities"
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-[10px] border-[1.5px] border-dashed p-3",
            over ? "border-brand bg-brand-selected" : "border-line bg-surface-muted",
          )}
        >
          <FileUp className="size-5 shrink-0 text-ink-3" aria-hidden />
          <span className="flex-1 text-[13px] leading-snug text-ink-2">
            Sleep een bestand hierheen
            <br />
            Word, PDF, e-mail of foto
          </span>
          <FilePicker onFile={onFile} disabled={busy}>
            {reading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Kies bestand
          </FilePicker>
        </div>
        {reading && (
          <span role="status" className="text-[13px] text-ink-3">
            {reading} wordt gelezen…
          </span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onPaste}
          className="min-h-11 cursor-pointer self-start text-sm font-bold text-brand hover:text-brand-hover hover:underline disabled:opacity-60"
        >
          Of plak de tekst
        </button>
      </section>

      <button
        type="button"
        disabled={busy}
        onClick={onTell}
        className={cn(block, "cursor-pointer gap-0.5 text-left hover:bg-app disabled:opacity-60")}
      >
        <span className="text-[15px] font-extrabold">Vertel het me</span>
        <span className="text-[13px] text-ink-2">Eén zin over je volgende overleg; ik stel een agenda voor.</span>
      </button>

      <Link href="/voorbeeld?van=probeer" onClick={onExample} className="min-h-11 self-start pt-1 text-sm font-bold">
        Eerst een voorbeeld bekijken
      </Link>
    </div>
  );
}

/** C1b: vaste overleggen (of losse afspraken) als radiolijst, met "Dit overleg opvolgen". */
export function PickMeeting({
  options,
  onPick,
  onTell,
}: {
  options: CalendarOption[];
  onPick: (option: CalendarOption) => void;
  onTell: () => void;
}) {
  const [chosen, setChosen] = useState(options[0]?.id ?? "");
  const option = options.find((o) => o.id === chosen);
  return (
    <div className="flex flex-col gap-3">
      {options.length > 0 && (
        <fieldset className="flex flex-col gap-2 border-none p-0">
          <legend className="sr-only">Kies een overleg</legend>
          {options.map((o) => (
            <label
              key={o.id}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                chosen === o.id ? "border-2 border-brand bg-brand-selected" : "border-line bg-white hover:bg-app",
              )}
            >
              <input
                type="radio"
                name="agenda-overleg"
                className="mt-1 size-4 shrink-0 accent-brand"
                checked={chosen === o.id}
                onChange={() => setChosen(o.id)}
              />
              <span className="flex flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold">
                  {o.name}
                  {o.organizer && (
                    <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-extrabold text-brand">
                      jij organiseert
                    </span>
                  )}
                </span>
                <span className="text-[13px] text-ink-2">{o.line}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {option && (
        <Button size="md" className="self-start" onClick={() => onPick(option)}>
          Dit overleg opvolgen
        </Button>
      )}
      <p className="text-[13px] text-ink-3">
        Staat het er niet tussen?{" "}
        <button type="button" onClick={onTell} className="cursor-pointer font-bold text-brand hover:underline">
          Vertel het me
        </button>
        . De andere kan je later toevoegen.
      </p>
    </div>
  );
}
