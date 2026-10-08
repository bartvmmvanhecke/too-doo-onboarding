"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCw } from "lucide-react";
import { ActionMeta } from "@/components/action-item";
import { ActionRow, ActionRowHeader } from "@/components/onboarding/action-row";
import { Eyebrow, OnboardingLayout, PanelCard } from "@/components/onboarding/onboarding-layout";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Button } from "@/components/ui/button";
import { formatShortDate, weekdayLong } from "@/lib/date";
import { AVATAR_COLORS } from "@/lib/mock-data";
import { ownerOptions } from "@/lib/owners";
import { initialsFrom } from "@/lib/people";
import { findPerson, usePeople, useOutlookBlocked, useStore } from "@/lib/store";
import { inSentence } from "@/lib/utils";

const PLACEHOLDERS = [
  "Bv. offerte nieuwe plooibank opvragen",
  "Bv. instructie heftruck bijwerken",
  "Bv. leverancier staal opnieuw contacteren",
];

/** Stap 3 · Openstaande acties (SPEC.md §3.7). */
export function ActionsScreen() {
  const router = useRouter();
  const pending = useStore((s) => s.pending);
  const rows = useStore((s) => s.actionDrafts);
  const extraPeople = useStore((s) => s.extraPeople);
  const updateRow = useStore((s) => s.updateActionDraft);
  const addPerson = useStore((s) => s.addPerson);
  const createMeeting = useStore((s) => s.createMeetingFromPending);
  const blocked = useOutlookBlocked();
  const people = usePeople();

  useEffect(() => {
    if (!pending) router.replace(blocked ? "/overleg/zelf" : "/overleg");
  }, [pending, blocked, router]);

  if (!pending) return null;

  const name = inSentence(pending.name);
  const owners = ownerOptions(
    people,
    pending.participants,
    pending.name,
    extraPeople.map((p) => p.id),
  );
  const filled = rows.filter((r) => r.what.trim());

  const finish = (withActions: boolean) => {
    const id = createMeeting(withActions);
    if (id) router.push(`/app/overleg/${id}`);
  };

  return (
    <OnboardingLayout
      contentClassName="max-w-[580px]"
      panelLabel="Agenda van je volgende overleg"
      panel={
        <>
          <Eyebrow as="h2" className="text-panel-ink">
            {pending.name}
            {pending.date ? ` · ${formatShortDate(pending.date)}` : ""}
          </Eyebrow>
          <PanelCard className="max-w-[460px] gap-3.5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">Openstaande acties</h3>
              <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[13px] font-extrabold text-brand-hover">
                {filled.length}
                <span className="sr-only"> acties</span>
              </span>
            </div>
            <ul className="flex flex-col gap-3.5">
              {filled.map((r, i) => {
                const person = findPerson(people, r.ownerId);
                const typed = r.ownerText.trim();
                const owner =
                  person ??
                  (typed ? { name: typed, initials: initialsFrom(typed), color: AVATAR_COLORS[7] } : undefined);
                return (
                  <li key={i} className="flex items-center gap-2.5 rounded-[10px] border border-line-soft p-3">
                    <span aria-hidden className="size-4 shrink-0 rounded border-2 border-checkbox" />
                    <span className="flex-1 text-[15px] font-semibold break-words">{r.what}</span>
                    <ActionMeta owner={owner} deadline={r.deadline.trim()} />
                  </li>
                );
              })}
              {filled.length < 3 && (
                <li className="rounded-[10px] border border-dashed border-checkbox p-3 text-sm text-ink-3">
                  Volgende actie verschijnt hier…
                </li>
              )}
            </ul>
            <p className="flex items-start gap-2.5 rounded-[10px] bg-brand-soft p-3 text-sm leading-[1.45] font-bold text-brand-hover">
              <RotateCw className="mt-px size-[18px] shrink-0" aria-hidden />
              Zolang een actie niet afgevinkt is, komt ze terug op elk volgend {name}.
            </p>
          </PanelCard>
        </>
      }
    >
      <StepProgress step={3} suffix="laatste stap" />
      <h1 className="text-[32px] leading-[1.15] font-extrabold">Wat moet er nog gebeuren sinds het vorige {name}?</h1>
      <p className="text-base leading-normal text-ink-2">
        Noteer tot drie acties die nu openstaan.
        {pending.date ? ` Ze staan ${weekdayLong(pending.date)} klaar op de agenda.` : ""}
      </p>

      <div role="group" aria-label="Openstaande acties" className="flex flex-col gap-2.5">
        <ActionRowHeader />
        {rows.map((row, i) => (
          <ActionRow
            key={i}
            index={i}
            value={row}
            onChange={(patch) => updateRow(i, patch)}
            owners={owners}
            people={people}
            onAddPerson={addPerson}
            whatPlaceholder={PLACEHOLDERS[i]}
          />
        ))}
      </div>

      <p className="mt-6 rounded-[10px] bg-app px-3.5 py-3 text-[13px] leading-normal text-ink-2">
        Eigenaars krijgen pas een uitnodiging als jij dat bevestigt. Tot dan zie alleen jij hun acties.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="link" className="min-h-11 px-0 text-sm font-semibold text-ink-2 underline" onClick={() => finish(false)}>
          Sla over, doe ik tijdens het overleg
        </Button>
        <Button onClick={() => finish(true)}>
          Toon mijn overleg
          <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
        </Button>
      </div>
    </OnboardingLayout>
  );
}
