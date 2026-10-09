"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";
import { ChoiceGroup, MultiChoiceGroup } from "@/components/onboarding/choice-group";
import { MeetingPreview } from "@/components/onboarding/meeting-preview";
import { Eyebrow, OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scheduleLine } from "@/lib/meeting";
import { findPerson, usePeople, useOutlookBlocked, useStore } from "@/lib/store";

type Goal = "kort" | "beslissingen" | "team" | "herhaling" | "anders";
type Focus = "beslissen" | "afstemmen" | "acties";

const GOALS: { value: Goal; label: string }[] = [
  { value: "kort", label: "Kortere, gerichte meetings" },
  { value: "beslissingen", label: "Beslissingen opvolgen" },
  { value: "team", label: "Weten waar mijn team aan werkt" },
  { value: "herhaling", label: "Niet twee keer hetzelfde bespreken" },
  { value: "anders", label: "Iets anders" },
];

const FOCUS: { value: Focus; label: string }[] = [
  { value: "beslissen", label: "Beslissen" },
  { value: "afstemmen", label: "Afstemmen" },
  { value: "acties", label: "Acties vastleggen" },
];

/**
 * Stap 3 · alternatief (prototype): bevestig de gekozen meeting en beantwoord één
 * laagdrempelige vraag. Beide vraagvormen staan onder elkaar; later kiezen we er één.
 */
export function GoalScreen() {
  const router = useRouter();
  const pending = useStore((s) => s.pending);
  const createMeeting = useStore((s) => s.createMeetingFromPending);
  const blocked = useOutlookBlocked();
  const people = usePeople();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [other, setOther] = useState("");
  const [focus, setFocus] = useState<Focus | null>(null);

  useEffect(() => {
    if (!pending) router.replace(blocked ? "/overleg/zelf" : "/overleg");
  }, [pending, blocked, router]);

  if (!pending) return null;

  const finish = () => {
    const id = createMeeting(false);
    if (id) router.push(`/app/overleg/${id}`);
  };

  const participants = pending.participants.map((id) => findPerson(people, id)).filter((p) => p !== undefined);
  const focusLabel = FOCUS.find((f) => f.value === focus)?.label;
  const changeHref = pending.source === "outlook" ? "/overleg" : "/overleg/zelf";

  return (
    <OnboardingLayout
      contentClassName="max-w-[580px]"
      panelLabel="Voorbeeld van je overleg"
      panel={
        <MeetingPreview
          name={pending.name}
          line={scheduleLine(pending)}
          participants={participants}
          footnote={
            focusLabel
              ? `Focus: ${focusLabel}. We zetten je agenda daarop klaar.`
              : "Een eenvoudige startagenda. Punten, tijden en volgorde pas je aan wanneer je wil."
          }
        />
      }
    >
      <StepProgress step={3} suffix="laatste stap" />
      <h1 className="text-[32px] leading-[1.15] font-extrabold">Wat wil je bereiken in deze meeting?</h1>

      <div className="flex items-center gap-3.5 rounded-xl border border-line px-4 py-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft">
          <CalendarDays className="size-5 text-brand" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-extrabold break-words">{pending.name}</span>
          <span className="text-sm text-ink-2">
            {scheduleLine(pending, { next: false, participants: pending.participants.length })}
          </span>
        </span>
        <Link href={changeHref} className="text-sm font-bold">
          Wijzig<span className="sr-only"> meeting</span>
        </Link>
      </div>

      <section aria-label="Optie A" className="flex flex-col gap-2 rounded-2xl border border-dashed border-line p-5">
        <Eyebrow as="h2">Optie A · meerdere doelen</Eyebrow>
        <MultiChoiceGroup legend="Wat wil je beter doen?" options={GOALS} value={goals} onChange={setGoals}>
          {goals.includes("anders") && (
            <Input
              aria-label="Wat wil je nog bereiken?"
              placeholder="Bv. mijn strategie helpen uitvoeren"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              className="min-h-11 flex-1 basis-56 py-2"
            />
          )}
        </MultiChoiceGroup>
      </section>

      <section aria-label="Optie B" className="flex flex-col gap-2 rounded-2xl border border-dashed border-line p-5">
        <Eyebrow as="h2">Optie B · één focus</Eyebrow>
        <ChoiceGroup legend="Kies één focus" options={FOCUS} value={focus} onChange={setFocus} />
      </section>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <Button variant="link" className="min-h-11 px-0 text-sm font-semibold text-ink-2 underline" onClick={finish}>
          Sla over
        </Button>
        <Button onClick={finish}>
          Toon mijn overleg
          <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
        </Button>
      </div>
    </OnboardingLayout>
  );
}
