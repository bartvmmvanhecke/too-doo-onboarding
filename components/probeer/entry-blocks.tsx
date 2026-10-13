"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, FileUp, Loader2, MessageCircle, Mic } from "lucide-react";
import { MicrosoftAuthorization } from "./microsoft-authorization";
import { GoogleMark, MicrosoftMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { CalendarOption, CalendarProvider, StartChoice } from "@/lib/assistant/types";
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
        // Enkel echt naar buiten: over een kindelement slepen geeft ook dragleave.
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
        },
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

const START_CHOICES: { value: StartChoice; label: string; icon: typeof CalendarDays }[] = [
  { value: "calendar", label: "Haal het uit mijn agenda", icon: CalendarDays },
  { value: "notes", label: "Ik heb notities van de vorige keer", icon: FileText },
  { value: "meeting", label: "Ik vertel het je", icon: MessageCircle },
];

export const START_LABEL: Record<StartChoice, string> = Object.fromEntries(
  START_CHOICES.map((c) => [c.value, c.label]),
) as Record<StartChoice, string>;

/**
 * Stap 1 · "Waarmee wil je starten?" (C1): drie eenvoudige tekstregels (icoon, tekst, chevron), zonder
 * knoppen of dropzone erin. De details komen pas na de keuze, als volgend bericht van de assistent.
 */
export function EntryChoices({
  choices = START_CHOICES.map((c) => c.value),
  disabled,
  onChoose,
  onExample,
}: {
  choices?: StartChoice[];
  disabled: boolean;
  onChoose: (choice: StartChoice) => void;
  onExample: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Startopties" className="flex flex-col gap-2">
        {START_CHOICES.filter((c) => choices.includes(c.value)).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(value)}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line-soft bg-white px-3.5 text-left text-[15px] font-bold text-ink hover:bg-app disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon className="size-[18px] shrink-0 text-brand" aria-hidden />
            <span className="flex-1">{label}</span>
            <ChevronRight className="size-4 shrink-0 text-ink-subtle" strokeWidth={2.5} aria-hidden />
          </button>
        ))}
      </div>
      <Link
        href="/voorbeeld?van=probeer"
        onClick={onExample}
        className="min-h-11 self-start pt-1 text-sm font-bold text-ink-2 hover:text-ink"
      >
        Of bekijk eerst een voorbeeld
      </Link>
    </div>
  );
}

/** Na "Haal het uit mijn agenda": "Outlook of Google?" met twee knoppen. */
export function ProviderChoice({
  busy,
  connecting,
  onCalendar,
}: {
  busy: boolean;
  connecting: CalendarProvider | null;
  onCalendar: (provider: CalendarProvider) => void;
}) {
  const [authorizing, setAuthorizing] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {authorizing && <MicrosoftAuthorization onCancel={() => setAuthorizing(false)} onAccept={() => {
        setAuthorizing(false);
        onCalendar("outlook");
      }} />}
      <div role="group" aria-label="Agenda kiezen" className="flex flex-wrap gap-2">
        <Button variant="outline" size="md" disabled={busy} onClick={() => setAuthorizing(true)}>
          {connecting === "outlook" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <MicrosoftMark size={7} />
          )}
          Outlook
        </Button>
        <Button variant="outline" size="md" disabled={busy} onClick={() => onCalendar("google")}>
          {connecting === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleMark />}
          Google
        </Button>
      </div>
      <span className="text-[13px] text-ink-3">
        We lezen alleen je vaste vergaderingen. Je logt meteen in, zodat je werk bewaard blijft.
      </span>
      {connecting && (
        <span role="status" className="text-[13px] text-ink-3">
          Verbinden met {connecting === "outlook" ? "Outlook" : "Google"}…
        </span>
      )}
    </div>
  );
}

/**
 * Na "Gebruik notities van een vorig overleg" (Stap 0): dropzone met "Kies bestand", de knop Inspreken en
 * de tip om te plakken.
 */
export function NotesDropzone({
  busy,
  reading,
  onFile,
  onListen,
}: {
  busy: boolean;
  /** "verslag.pdf wordt gelezen…" of "Opname wordt uitgeschreven…". */
  reading: string | null;
  onFile: (file: File) => void;
  onListen?: () => void;
}) {
  const { over, handlers } = useFileDrop(onFile, !busy);
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <div
        {...handlers}
        data-dropzone="notities"
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed px-3.5 py-4 text-center",
          over ? "border-brand bg-brand-selected" : "border-line bg-white",
        )}
      >
        <FileUp className="size-6 text-ink-2" aria-hidden />
        <span className="text-sm text-ink-2">
          Sleep een bestand hierheen
          <br />
          <span className="text-[13px] text-ink-3">Word, PDF, e-mail, foto of geluidsopname</span>
        </span>
        <span className="flex flex-wrap justify-center gap-2">
          <FilePicker onFile={onFile} disabled={busy}>
            {reading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Kies bestand
          </FilePicker>
          {onListen && (
            <Button variant="outline" size="sm" disabled={busy} onClick={onListen}>
              <Mic className="size-4" aria-hidden />
              Inspreken
            </Button>
          )}
        </span>
      </div>
      {reading && (
        <span role="status" className="text-[13px] text-ink-3">
          {reading}
        </span>
      )}
      <span className="text-[13px] text-ink-2">Of plak de tekst in het chatveld.</span>
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
