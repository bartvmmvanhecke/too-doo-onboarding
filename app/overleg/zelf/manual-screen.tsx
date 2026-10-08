"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ChipSuggestions } from "@/components/onboarding/chip-suggestions";
import { ChoiceGroup } from "@/components/onboarding/choice-group";
import { DateInput } from "@/components/onboarding/date-input";
import { DurationPicker } from "@/components/onboarding/duration-picker";
import { describedBy, Field } from "@/components/onboarding/field";
import { MeetingPreview } from "@/components/onboarding/meeting-preview";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { StepProgress } from "@/components/onboarding/step-progress";
import { TimeInput } from "@/components/onboarding/time-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deriveMeetingType, NAME_SUGGESTIONS, RECURRENCE_OPTIONS, scheduleLine } from "@/lib/meeting";
import { emptyManualDraft, usePeople, useOutlookBlocked, useStore } from "@/lib/store";

/** Stap 2b · Overleg zelf invullen (SPEC.md §3.3). Het rechterpaneel volgt live. */
export function ManualScreen() {
  const router = useRouter();
  const stored = useStore((s) => s.manualDraft);
  const update = useStore((s) => s.updateManualDraft);
  const choosePending = useStore((s) => s.choosePending);
  const blocked = useOutlookBlocked();
  const people = usePeople();
  const [fallback] = useState(emptyManualDraft);
  const [nameError, setNameError] = useState<string | null>(null);

  const draft = stored ?? fallback;
  const participants = draft.participants.map((id) => people.find((p) => p.id === id)).filter((p) => p !== undefined);
  const type = draft.name.trim() ? deriveMeetingType(draft.name) : null;

  const next = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setNameError("Geef je overleg een naam.");
      document.getElementById("naam")?.focus();
      return;
    }
    choosePending({ ...draft, name: draft.name.trim() });
    router.push("/acties");
  };

  return (
    <OnboardingLayout
      contentClassName="lg:mt-10"
      panelLabel="Voorbeeld van je overleg"
      panel={
        <MeetingPreview
          name={draft.name.trim()}
          line={scheduleLine(draft)}
          participants={participants}
          footnote={
            type
              ? `Het overlegtype ("${type}") leiden we af uit de naam. Je kunt het later wijzigen.`
              : "Het overlegtype leiden we af uit de naam. Je kunt het later wijzigen."
          }
        />
      }
    >
      <StepProgress step={2} />
      <h1 className="text-[32px] leading-[1.15] font-extrabold">Welk overleg wil je als eerste opvolgen?</h1>

      <form noValidate onSubmit={next} className="flex flex-col gap-5">
        <Field id="naam" label="Naam van het overleg" error={nameError}>
          <Input
            id="naam"
            autoComplete="off"
            placeholder="Bijv. Productieoverleg"
            value={draft.name}
            aria-invalid={!!nameError}
            aria-describedby={describedBy("naam", { error: !!nameError })}
            onChange={(e) => {
              update({ name: e.target.value });
              if (nameError) setNameError(null);
            }}
          />
          <ChipSuggestions
            label="Suggesties voor de naam"
            options={NAME_SUGGESTIONS}
            value={draft.name}
            onSelect={(name) => {
              update({ name });
              setNameError(null);
            }}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="dag" label="Volgende keer">
              <DateInput id="dag" value={draft.date ?? fallback.date!} onChange={(date) => update({ date })} />
            </Field>
            <Field id="uur" label="Uur">
              <TimeInput
                id="uur"
                value={draft.time ?? 8 * 60}
                onChange={(time) => update({ time })}
                describedBy="uur-hint"
              />
            </Field>
          </div>
          <p id="uur-hint" className="text-[13px] text-ink-3">
            Typ het uur (&quot;8u&quot;, &quot;0800&quot;, &quot;8:30&quot;), gebruik − en + per kwartier, of kies uit
            de lijst.
          </p>
        </div>

        <DurationPicker value={draft.duration} onChange={(duration) => update({ duration })} />

        <ChoiceGroup
          legend="Hoe vaak?"
          variant="segmented"
          options={RECURRENCE_OPTIONS}
          value={draft.recurrence}
          onChange={(recurrence) => update({ recurrence })}
        />

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          {blocked ? (
            <span />
          ) : (
            <Link href="/overleg" className="text-sm font-semibold text-ink-2">
              Toch kiezen uit je Outlook-agenda
            </Link>
          )}
          <Button type="submit">
            Volgende
            <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
          </Button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
