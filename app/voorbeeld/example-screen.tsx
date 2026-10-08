"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { EXAMPLE_ACTIONS } from "@/lib/mock-data";
import { notAvailable } from "@/lib/not-available";
import { cn } from "@/lib/utils";

const TOUR = [
  {
    target: "acties",
    title: "Acties komen vanzelf terug",
    text: "Alles wat vorige week niet afgevinkt werd, staat bovenaan de agenda. Niemand hoeft te onthouden wat er nog openstond.",
  },
  {
    target: "zaken",
    title: "Lopende zaken",
    text: "Agendapunten zonder vaste tijden of rollen. Beslissingen en acties noteer je er meteen bij.",
  },
  {
    target: "menu-acties",
    title: "Eén plek voor alle acties",
    text: "Elke eigenaar ziet zijn acties en krijgt een herinnering. Jij ziet wat blijft hangen.",
  },
] as const;

type Target = (typeof TOUR)[number]["target"];

const navItem =
  "flex min-h-11 items-center justify-between rounded-[10px] px-3 py-2.5 text-base font-semibold text-nav-ink no-underline hover:bg-white/10 hover:text-white";
const highlight = "outline-3 outline-offset-2 outline-brand";

/** Scherm 2d · Rondkijken met voorbeelddata (SPEC.md §3.6). Niets wordt bewaard. */
export function ExampleScreen() {
  const [step, setStep] = useState<number | null>(0);
  const [done, setDone] = useState<boolean[]>(() => EXAMPLE_ACTIONS.map(() => false));
  const target: Target | null = step === null ? null : TOUR[step].target;
  const last = step === TOUR.length - 1;

  const navLink = (label: string, extra?: React.ReactNode, id?: Target) => (
    <a
      href={`#${label.toLowerCase()}`}
      onClick={(e) => {
        e.preventDefault();
        notAvailable();
      }}
      className={cn(navItem, id && target === id && "outline-3 outline-offset-0 outline-white")}
    >
      {label}
      {extra}
    </a>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-app text-ink">
      <div
        role="region"
        aria-label="Voorbeeldmodus"
        className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-ink px-4 py-3 text-white sm:px-6"
      >
        <span className="rounded-md bg-[#FFD66B] px-2.5 py-1 text-[13px] font-extrabold tracking-[0.5px] text-[#3A2A00] uppercase">
          Voorbeeld
        </span>
        <span className="flex-[1_1_320px] text-[15px] font-semibold">
          Je bekijkt een voorbeeldbedrijf. Klik gerust overal; niets hiervan wordt bewaard of verstuurd.
        </span>
        <Button asChild variant="inverse" size="sm" className="text-[15px] font-extrabold">
          <Link href="/overleg">
            Voeg je eigen overleg toe
            <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <nav
          aria-label="Hoofdmenu (voorbeeld)"
          className="flex flex-col gap-1 bg-app-nav px-3.5 py-4 text-white lg:w-60 lg:shrink-0 lg:py-6"
        >
          <span className="px-2.5 text-[26px] font-extrabold">too-doo</span>
          <span className="px-3 pb-2 text-[13px] text-nav-muted lg:pb-[18px]">Voorbeeld NV · 48 medewerkers</span>
          <div className="flex flex-wrap gap-1 lg:flex-col">
            {navLink("Dashboard")}
            <a href="#overleg" aria-current="page" className={cn(navItem, "bg-white/15 font-extrabold text-white")}>
              Vergaderingen
            </a>
            {navLink(
              "Acties",
              <span className="rounded-full bg-white/20 px-2.5 py-px text-[13px] font-extrabold text-white">7</span>,
              "menu-acties",
            )}
            {navLink("Beslissingen")}
          </div>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-7 pb-24 sm:px-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="mb-1 text-[32px] font-extrabold">Productieoverleg</h1>
              <p className="text-[15px] text-ink-2">Elke maandag · 08:00–09:00 · 5 deelnemers · 3e keer in too-doo</p>
            </div>
            <span className="rounded-full bg-success-bg px-3.5 py-2 text-sm font-bold text-[#1E6B45]">
              4 van 7 acties afgerond sinds vorige week
            </span>
          </div>

          <div className="flex flex-wrap items-start gap-5">
            <section aria-label="Agenda" className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
              <div
                className={cn(
                  "flex flex-col gap-1 rounded-[14px] border border-line-soft bg-white px-5 py-[18px]",
                  target === "acties" && highlight,
                )}
              >
                <div className="flex items-center gap-2.5 pb-2">
                  <h2 className="flex-1 text-[17px] font-extrabold">Openstaande acties</h2>
                  <span className="text-[13px] font-semibold text-ink-3">uit vorige overleggen</span>
                </div>
                <ul>
                  {EXAMPLE_ACTIONS.map((a, i) => (
                    <li key={a.what} className="flex items-center gap-3 border-t border-line-faint py-1">
                      <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={done[i]}
                          onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
                          aria-label={`${a.what} afvinken`}
                          className="m-0 size-[18px] accent-brand"
                        />
                        <span className={cn("flex-1 text-[15px] font-semibold", done[i] && "text-ink-3 line-through")}>
                          {a.what}
                        </span>
                      </label>
                      <Avatar person={a} size={28} decorative />
                      <span
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[13px] font-bold",
                          a.late ? "bg-danger-bg text-danger" : "bg-line-faint text-ink-2",
                        )}
                      >
                        {a.due}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={cn(
                  "flex flex-col gap-2.5 rounded-[14px] border border-line-soft bg-white px-5 py-[18px]",
                  target === "zaken" && highlight,
                )}
              >
                <h2 className="text-[17px] font-extrabold">Lopende zaken</h2>
                <ul className="flex flex-col gap-2.5">
                  <li className="flex justify-between gap-3 rounded-[10px] border border-line-faint px-3.5 py-3">
                    <span className="text-[15px] font-semibold">Planning week 42 en bezetting</span>
                    <span className="text-[13px] text-ink-3">1 beslissing</span>
                  </li>
                  <li className="flex justify-between gap-3 rounded-[10px] border border-line-faint px-3.5 py-3">
                    <span className="text-[15px] font-semibold">Klachten klant Verhaeghe</span>
                    <span className="text-[13px] text-ink-3">2 acties</span>
                  </li>
                </ul>
              </div>
            </section>

            {step !== null && (
              <aside
                aria-label="Rondleiding"
                aria-live="polite"
                className="flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-[14px] border-2 border-brand bg-white p-5"
              >
                <p className="text-[13px] font-extrabold text-brand">
                  Wat je hier ziet · {step + 1} van {TOUR.length}
                </p>
                <h2 className="text-lg leading-[1.3] font-extrabold">{TOUR[step].title}</h2>
                <p className="text-[15px] leading-normal text-ink-2">{TOUR[step].text}</p>
                <div className="mt-1 flex items-center justify-between gap-2.5">
                  {!last && (
                    <Button variant="ghost" size="sm" className="px-0" onClick={() => setStep(null)}>
                      Sluiten
                    </Button>
                  )}
                  <Button size="sm" className="ml-auto" onClick={() => setStep(last ? null : step + 1)}>
                    {last ? "Sluiten" : "Volgende"}
                  </Button>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
