"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { WeekGrid } from "@/components/b/week-grid";
import { Eyebrow, OnboardingLayout, PanelCard } from "@/components/onboarding/onboarding-layout";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";
import { weekdayLong, weekdayShort } from "@/lib/date";
import { SERIES, seriesNextDate, type Series } from "@/lib/mock-data";
import { SIMULATION_DELAY } from "@/lib/simulate";
import { usePeople, useStore } from "@/lib/store";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { defaultSelection, recommendedSeries, structureSummary } from "@/lib/variant-b";

/** "Elke maandag 08:00", "Om de 2 weken, di 14:00", "Maandelijks, do 10:00" */
function whenLabel(s: Series): string {
  const date = seriesNextDate(s);
  const time = formatTime(s.time);
  if (s.rule.kind === "weekly") return `Elke ${weekdayLong(date)} ${time}`;
  if (s.rule.kind === "biweekly") return `Om de 2 weken, ${weekdayShort(date)} ${time}`;
  return `Maandelijks, ${weekdayShort(date)} ${time}`;
}

/** Variant B, stap 2 · Zo stuur jij [bedrijf] aan (SPEC-FLOWS.md §4). */
export function StructureScreen() {
  const router = useRouter();
  const calendar = useStore((s) => s.calendar);
  const setCalendar = useStore((s) => s.setCalendar);
  const stored = useStore((s) => s.b.selection);
  const setSelection = useStore((s) => s.setBSelection);
  const followSeries = useStore((s) => s.followSeries);
  const setManualReturn = useStore((s) => s.setManualReturn);
  const startManualDraft = useStore((s) => s.startManualDraft);
  const company = useStore((s) => s.user?.company) || "Metaalwerken";
  const people = usePeople();
  const [connecting, setConnecting] = useState(calendar !== "series");
  const [error, setError] = useState(false);

  // De agendatoestemming wordt gesimuleerd met een korte melding (SPEC-FLOWS.md §2).
  useEffect(() => {
    if (!connecting) return;
    const t = setTimeout(() => {
      setCalendar("series");
      setConnecting(false);
    }, SIMULATION_DELAY);
    return () => clearTimeout(t);
  }, [connecting, setCalendar]);

  const selection = stored ?? defaultSelection();
  const recommended = recommendedSeries();
  const summary = structureSummary();
  const count = selection.length;

  const toggle = (id: string) => {
    setError(false);
    setSelection(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (count === 0) {
      setError(true);
      return;
    }
    followSeries(selection, recommended.id);
    router.push("/b/acties");
  };

  return (
    <OnboardingLayout
      contentClassName="max-w-[640px] gap-4 lg:mt-9"
      panelLabel="Jouw overlegritme"
      columnClassName="lg:flex-[1_1_620px]"
      panelClassName="items-stretch lg:flex-[1_1_420px]"
      panel={
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4">
          <Eyebrow as="h2" className="text-panel-ink">
            Jouw overlegritme
          </Eyebrow>
          <PanelCard className="gap-3 p-[22px]">
            <WeekGrid series={SERIES} selected={connecting ? [] : selection} />
            <div className="flex flex-col gap-2 border-t border-line-soft pt-3 text-sm leading-[1.45]">
              <p>
                <b>Elke afspraak die daar gemaakt wordt</b>, krijgt in too-doo een eigenaar en een datum.
              </p>
              <p className="text-ink-2">
                Wat niet af is, staat vanzelf op het volgende overleg. Jij ziet over alle overleggen heen wat vastzit.
              </p>
            </div>
          </PanelCard>
          <p className="text-[13px] text-panel-ink">
            We lazen alleen je terugkerende afspraken: titel, tijdstip en deelnemers.
          </p>
        </div>
      }
    >
      <StepProgress step={2} />
      <h1 className="text-[32px] leading-[1.15] font-extrabold">Zo stuur jij {company} aan</h1>

      {connecting ? (
        <p role="status" className="flex items-center gap-2.5 rounded-xl bg-app px-4 py-3.5 text-[15px] font-bold">
          <Loader2 className="size-5 animate-spin text-brand" aria-hidden />
          Verbinden met Outlook…
        </p>
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-base leading-normal text-ink-2">
            We vonden {summary.count} vaste overleggen in je agenda, met {summary.colleagues} collega&apos;s, samen
            ongeveer {summary.hours} uur per maand. Kies welke too-doo voor jou opvolgt.
          </p>

          <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
            <Eyebrow as="legend" className="mb-2">
              Jouw vaste overleggen
            </Eyebrow>
            {SERIES.map((s) => {
              const on = selection.includes(s.id);
              const isRec = s.id === recommended.id;
              const members = s.participants.map((id) => people.find((p) => p.id === id)).filter((p) => !!p);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "grid cursor-pointer grid-cols-[24px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 rounded-xl has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand sm:grid-cols-[24px_minmax(0,1fr)_150px_110px]",
                    on
                      ? "border-2 border-brand bg-brand-selected px-3.5 py-3"
                      : "border border-line px-[15px] py-[13px] hover:bg-app",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(s.id)}
                    className="m-0 size-[18px] accent-brand focus-visible:outline-none"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold">{s.name}</span>
                      {isRec && (
                        <Tag tone="brand" className="rounded-full px-2 py-0.5">
                          aanbevolen start
                        </Tag>
                      )}
                    </span>
                    <span className="text-[13px] text-ink-2">
                      {s.organizer ? "Jij organiseert" : "Deelnemer"}
                      {isRec ? " · grootste groep" : ""}
                    </span>
                  </span>
                  <span className="col-start-2 text-sm text-ink-2 sm:col-start-auto">{whenLabel(s)}</span>
                  <span className="col-start-2 flex items-center sm:col-start-auto">
                    {on ? (
                      <>
                        <span className="flex items-center" aria-hidden>
                          {members.slice(0, 3).map((p, i) => (
                            <Avatar
                              key={p.id}
                              person={p}
                              size={24}
                              decorative
                              className={cn("border-2 border-white text-[10px]", i > 0 && "-ml-1.5")}
                            />
                          ))}
                        </span>
                        {members.length > 3 && (
                          <span className="ml-1 text-xs font-bold text-ink-2" aria-hidden>
                            +{members.length - 3}
                          </span>
                        )}
                        <span className="sr-only">{members.length} personen</span>
                      </>
                    ) : (
                      <span className="text-[13px] font-bold text-ink-2">{members.length} personen</span>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {error && (
            <p role="alert" className="text-[13px] font-bold text-danger">
              Kies minstens één overleg om op te volgen.
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/overleg/zelf"
              className="text-sm font-bold"
              onClick={() => {
                if (count > 0) followSeries(selection, recommended.id);
                setManualReturn("/b/acties");
                startManualDraft();
              }}
            >
              Mis je een overleg? Voeg het toe
            </Link>
            <Button type="submit">
              {count === 1
                ? "Volg dit overleg op"
                : count === 0
                  ? "Volg deze overleggen op"
                  : `Volg deze ${count} overleggen op`}
              <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
            </Button>
          </div>
        </form>
      )}
    </OnboardingLayout>
  );
}
