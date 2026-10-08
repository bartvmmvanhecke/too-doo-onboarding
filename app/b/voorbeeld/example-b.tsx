"use client";

import Link from "next/link";
import { StatTile } from "@/components/b/stat-tile";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

const FRUSTRATIONS = [
  {
    label: "Het blijft liggen",
    color: "text-danger",
    card: "border-[#F3C7C1] bg-[#FFF7F6]",
    title: "Offerte nieuwe plooibank",
    meta: "Open sinds 3 weken · al 2 keer besproken",
    answer: "te late acties springen eruit en staan bovenaan elk volgend overleg tot ze af zijn.",
  },
  {
    label: "Niemand voelt zich verantwoordelijk",
    color: "text-[#7A3F04]",
    card: "border-[#F1D5A8] bg-[#FFFAF2]",
    title: "Leverancier staal opnieuw bellen",
    meta: '"Iemand moet dat eens doen" · geen eigenaar',
    answer: "geen actie zonder naam en datum. De eigenaar krijgt ze per mail, met een herinnering.",
  },
  {
    label: "Altijd opnieuw dezelfde discussie",
    color: "text-[#4B2A7A]",
    card: "border-[#DCCDF2] bg-[#FBF8FF]",
    title: "Planning week 42",
    meta: "Besproken in 3 overleggen · nog geen beslissing",
    answer: "open punten komen terug tot er een beslissing ligt, en die beslissing is achteraf terug te vinden.",
  },
];

/** Variant B · Voorbeeld rond frustraties (mockup B5). Statisch; niets wordt bewaard. */
export function ExampleB() {
  const company = useStore((s) => s.user?.company) || "Metaalwerken";
  return (
    <div className="flex min-h-dvh flex-col bg-app text-ink">
      <div
        role="region"
        aria-label="Voorbeeldmodus"
        className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-ink py-3 pr-24 pl-4 text-white sm:pl-6"
      >
        <span className="rounded-md bg-[#FFD66B] px-2.5 py-1 text-[13px] font-extrabold tracking-[0.5px] text-[#3A2A00] uppercase">
          Voorbeeld
        </span>
        <span className="flex-[1_1_320px] text-[15px] font-semibold">
          Zo ziet een maand opvolging eruit bij {company}. Niets hiervan wordt bewaard.
        </span>
        <Button asChild variant="inverse" size="sm" className="text-[15px] font-extrabold">
          <Link href="/prototype">Zet het op voor jouw bedrijf</Link>
        </Button>
      </div>

      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-[18px] px-4 pt-7 pb-36 sm:px-10">
        <div>
          <h1 className="text-[30px] font-extrabold">Herken je dit?</h1>
          <p className="mt-1.5 text-base text-ink-2">
            Drie dingen die in elk bedrijf blijven hangen, en wat too-doo eraan doet.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {FRUSTRATIONS.map((f) => (
            <section
              key={f.label}
              aria-label={f.label}
              className="flex flex-col gap-3 rounded-2xl border border-line-soft bg-white p-5"
            >
              <h2 className={`text-[13px] font-extrabold ${f.color}`}>{f.label}</h2>
              <div className={`flex flex-col gap-1.5 rounded-xl border p-3.5 ${f.card}`}>
                <p className="text-[15px] font-extrabold">{f.title}</p>
                <p className="text-[13px] text-ink-2">{f.meta}</p>
              </div>
              <p className="text-sm leading-normal">
                <b>too-doo:</b> {f.answer}
              </p>
            </section>
          ))}
        </div>

        <section
          aria-labelledby="maand-titel"
          className="flex flex-col gap-3.5 rounded-2xl border border-line-soft bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="maand-titel" className="text-[17px] font-extrabold">
              Na een maand too-doo bij {company}
            </h2>
            <span className="text-[13px] text-ink-3">voorbeelddata</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile value={31} label="acties afgerond" tone="success" />
            <StatTile value={4} label="te laat, zichtbaar voor jou" tone="danger" />
            <StatTile value={0} label="acties zonder eigenaar" tone="muted" />
            <StatTile value={12} label="beslissingen vastgelegd" tone="muted" />
          </div>
        </section>
      </main>
    </div>
  );
}
