"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ItEmailForm } from "@/components/onboarding/it-email-form";
import { Eyebrow, OnboardingLayout, PanelCard } from "@/components/onboarding/onboarding-layout";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Button } from "@/components/ui/button";
import { IT_MESSAGE } from "@/lib/mock-data";
import { useStore, useUserFirstName } from "@/lib/store";

/** Stap 2c · Agenda vraagt goedkeuring van de IT-beheerder (SPEC.md §3.4). */
export function ApprovalScreen() {
  const startManualDraft = useStore((s) => s.startManualDraft);
  const firstName = useUserFirstName();
  const domain = useStore((s) => s.user?.email.split("@")[1]) || "metaalwerken.be";

  return (
    <OnboardingLayout
      contentClassName="gap-[18px] lg:mt-14"
      panelLabel="Voorbeeld van het bericht voor IT"
      panel={
        <PanelCard className="max-w-[460px] gap-3 shadow-[0_20px_50px_rgba(14,60,140,0.12)]">
          <Eyebrow as="h2">Voorbeeld: bericht voor IT</Eyebrow>
          <div className="flex flex-col gap-2.5 text-[15px] leading-[1.6]">
            {IT_MESSAGE(firstName).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </PanelCard>
      }
    >
      <StepProgress step={2} />
      <h1 className="text-[30px] leading-[1.2] font-extrabold">Je IT-beheerder moet de agendakoppeling eerst goedkeuren</h1>
      <p className="text-base leading-[1.55] text-ink-2">
        Je bedrijf laat apps niet zelf in agenda&apos;s lezen. Dat is een veilige standaardinstelling, geen fout. Je hoeft er
        niet op te wachten.
      </p>

      <Button asChild size="lg" className="w-full">
        <Link href="/overleg/zelf" onClick={() => startManualDraft()}>
          Vul je overleg zelf in
          <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
        </Link>
      </Button>

      <section
        aria-labelledby="later-titel"
        className="flex flex-col gap-3 rounded-[14px] border border-track bg-surface-muted p-[18px]"
      >
        <h2 id="later-titel" className="text-[15px] font-extrabold">
          Wil je de koppeling later toch?
        </h2>
        <ItEmailForm
          label="E-mail van je IT-beheerder (optioneel)"
          placeholder={`it@${domain}`}
          buttonLabel="Stuur uitleg"
        />
        <p className="text-[13px] leading-normal text-ink-3">
          We sturen een korte handleiding: welke rechten too-doo vraagt (alleen agenda lezen), en hoe hij goedkeurt. Zodra
          het rond is, krijg jij een mail om je agenda te koppelen.
        </p>
      </section>
    </OnboardingLayout>
  );
}
