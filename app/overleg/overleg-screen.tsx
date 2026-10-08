"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Loader2 } from "lucide-react";
import { MicrosoftMark } from "@/components/brand";
import { Callout } from "@/components/callout";
import { MeetingPreview } from "@/components/onboarding/meeting-preview";
import { Eyebrow, OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/date";
import { scheduleLine } from "@/lib/meeting";
import { getAppointments, SERIES, seriesSchedule } from "@/lib/mock-data";
import { useCalendarConsent } from "@/lib/simulate";
import { draftFromSeries, usePeople, useOutlookBlocked, useStore } from "@/lib/store";
import { formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";

const secondaryLink = "text-sm font-semibold text-ink-2";

/** Stap 2a · Eerste overleg (SPEC.md §3.2): vóór toestemming, lijst, of geen reeksen. */
export function OverlegScreen() {
  const router = useRouter();
  const blocked = useOutlookBlocked();
  const calendar = useStore((s) => s.calendar);
  const notice = useStore((s) => s.calendarNotice);
  const selectedId = useStore((s) => s.selectedSeriesId);
  const selectSeries = useStore((s) => s.selectSeries);
  const startManualDraft = useStore((s) => s.startManualDraft);
  const choosePending = useStore((s) => s.choosePending);
  const people = usePeople();
  const { connect, pending } = useCalendarConsent();

  // Na een geblokkeerde Microsoft-login bieden we Outlook niet meer aan.
  useEffect(() => {
    if (blocked) router.replace("/overleg/zelf");
  }, [blocked, router]);

  const onConnect = async () => {
    const outcome = await connect();
    if (outcome === "admin") router.push("/overleg/goedkeuring");
  };

  const previewSeries = SERIES.find((s) => s.id === selectedId) ?? SERIES[0];
  const previewSchedule = seriesSchedule(previewSeries);
  const previewPeople = previewSeries.participants
    .map((id) => people.find((p) => p.id === id))
    .filter((p) => p !== undefined);

  return (
    <OnboardingLayout
      panelLabel="Voorbeeld van je overleg"
      panel={
        <MeetingPreview
          name={previewSeries.name}
          line={scheduleLine(previewSchedule)}
          participants={previewPeople}
          footnote="Een eenvoudige startagenda. Punten, tijden en volgorde pas je aan wanneer je wil."
        />
      }
    >
      <StepProgress step={2} />
      <h1 className="text-[32px] leading-[1.15] font-extrabold">Welk overleg wil je als eerste opvolgen?</h1>
      <p className="text-base leading-normal text-ink-2">
        Kies je belangrijkste vaste overleg. Je andere overlegmomenten voeg je later in één keer toe.
      </p>

      {calendar === "idle" && (
        <div className="flex flex-col gap-[18px]">
          {notice === "cancelled" && (
            <Callout live variant="neutral" icon={<CalendarDays className="text-ink-2" />} title={
              <>
                Geen probleem,{" "}
                <Link href="/overleg/zelf" onClick={() => startManualDraft()}>
                  vul het zelf in
                </Link>
              </>
            } />
          )}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface-muted p-6">
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft">
                <CalendarDays className="size-[22px] text-brand" aria-hidden />
              </span>
              <span className="flex flex-col gap-1">
                <h2 className="text-lg font-extrabold">Haal je vaste overleggen uit Outlook</h2>
                <span className="text-sm leading-normal text-ink-2">
                  Uur, herhaling en deelnemers staan er meteen in. We lezen alleen je terugkerende afspraken, niets van je
                  mails.
                </span>
              </span>
            </div>
            <Button variant="dark" size="lg" className="w-full" disabled={pending} onClick={onConnect}>
              {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <MicrosoftMark />}
              {pending ? "Wachten op toestemming van Microsoft…" : "Toon mijn overleggen uit Outlook"}
            </Button>
            <p role="status" className="sr-only">
              {pending ? "Wachten op toestemming van Microsoft…" : ""}
            </p>
            <p className="text-[13px] text-ink-3">
              Microsoft vraagt je één keer om toestemming. Lukt dat niet, dan vul je het gewoon zelf in.
            </p>
          </div>
          <Link href="/overleg/zelf" className="self-start text-[15px] font-bold" onClick={() => startManualDraft()}>
            Liever niet koppelen? Vul het zelf in
          </Link>
          <div className="flex flex-wrap justify-between gap-3">
            <Link href="/voorbeeld" className={secondaryLink}>
              Eerst rondkijken met voorbeelddata
            </Link>
            <Link href="/app" className={secondaryLink}>
              Ik doe dit later
            </Link>
          </div>
        </div>
      )}

      {calendar === "none" && (
        <div className="flex flex-col gap-[18px]">
          <Callout
            live
            variant="neutral"
            icon={<CalendarDays className="text-ink-2" />}
            title="Je agenda is gekoppeld, maar we vonden geen vaste overleggen"
          >
            Misschien plan je je overleg telkens als losse afspraak in. Geen probleem: vul het zelf in, of vertrek van een
            afspraak die al in je agenda staat.
          </Callout>
          <Button asChild size="lg" className="w-full">
            <Link href="/overleg/zelf" onClick={() => startManualDraft()}>
              Vul je overleg zelf in
              <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
            </Link>
          </Button>
          <div className="flex flex-col gap-2.5">
            <Eyebrow as="h2">Of vertrek van een afspraak uit de komende 2 weken</Eyebrow>
            <ul className="flex flex-col gap-2.5">
              {getAppointments().map((a) => (
                <li key={a.id}>
                  <Link
                    href="/overleg/zelf"
                    onClick={() => startManualDraft(a)}
                    className="flex items-center gap-3.5 rounded-xl border border-line px-4 py-3.5 text-ink no-underline hover:border-brand hover:bg-brand-selected hover:text-ink"
                  >
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-base font-extrabold">{a.name}</span>
                      <span className="text-sm text-ink-2">
                        {formatShortDate(a.date)} · {formatTimeRange(a.time, a.duration)} · {a.participants.length}{" "}
                        deelnemers
                      </span>
                    </span>
                    <span className="text-sm font-bold text-brand">
                      Gebruik<span className="sr-only"> als vertrekpunt</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[13px] leading-normal text-ink-3">
              We nemen naam, uur, duur en deelnemers over. Hoe vaak het terugkomt, kies je in de volgende stap.
            </p>
          </div>
        </div>
      )}

      {calendar === "series" && (
        <div className="flex flex-col gap-[18px]">
          <fieldset className="m-0 flex flex-col gap-2.5 border-none p-0">
            <Eyebrow as="legend" className="mb-2.5">
              Terugkerend in je Outlook-agenda
            </Eyebrow>
            {SERIES.map((s) => {
              const checked = s.id === selectedId;
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3.5 rounded-xl has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                    checked ? "border-2 border-brand bg-brand-selected px-4 py-3.5" : "border border-line px-[17px] py-[15px] hover:bg-app",
                  )}
                >
                  <input
                    type="radio"
                    name="overleg"
                    checked={checked}
                    onChange={() => selectSeries(s.id)}
                    className="m-0 size-[18px] accent-brand focus-visible:outline-none"
                  />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-base font-extrabold">{s.name}</span>
                    <span className="text-sm text-ink-2">
                      {scheduleLine(seriesSchedule(s), { next: false, participants: s.participants.length })}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <Link href="/overleg/zelf" className="self-start text-[15px] font-bold" onClick={() => startManualDraft()}>
            Staat er niet tussen? Vul het zelf in
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <Link href="/voorbeeld" className={secondaryLink}>
              Eerst rondkijken met voorbeelddata
            </Link>
            <Button asChild>
              <Link href="/acties" onClick={() => choosePending(draftFromSeries(selectedId))}>
                Volgende
                <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}
