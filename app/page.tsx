import Link from "next/link";
import { CirclePlay, RotateCw } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { MicrosoftMark } from "@/components/brand";
import { NextWeekdayDate, NotAvailableLink } from "@/components/site/client-bits";
import { AVATAR_COLORS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const HERO_ACTIONS = [
  {
    what: "Offerte nieuwe plooibank opvragen",
    initials: "JP",
    color: AVATAR_COLORS[0],
    due: "2 dagen te laat",
    late: true,
  },
  { what: "Instructie heftruck bijwerken", initials: "SD", color: AVATAR_COLORS[1], due: "vrijdag", late: false },
  {
    what: "Leverancier staal opnieuw contacteren",
    initials: "PV",
    color: AVATAR_COLORS[2],
    due: "volgende week",
    late: false,
  },
];

const STEPS = [
  {
    title: "Kies je vaste overleg",
    text: "Rechtstreeks uit je Outlook-agenda. Uur, herhaling en deelnemers staan er al in.",
  },
  {
    title: "Noteer acties met een eigenaar",
    text: "Tijdens of na het overleg. Wie, wat en tegen wanneer, in een paar seconden.",
  },
  {
    title: "Too-doo volgt op",
    text: "Herinneringen voor de eigenaars, en wat open staat komt terug op het volgende overleg.",
  },
];

const navLink = "inline-flex min-h-11 items-center text-ink no-underline hover:text-brand";

export default function HeroPage() {
  return (
    <div className="min-h-dvh bg-hero px-4 pt-14 pb-16 text-ink sm:px-6">
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 rounded-[28px] bg-white py-3 pr-4 pl-7 shadow-[0_1px_2px_rgba(22,33,58,0.06),0_8px_24px_rgba(22,33,58,0.06)] sm:rounded-full">
        <span className="text-[28px] font-extrabold tracking-[-0.5px] text-logo">too-doo</span>
        <nav aria-label="Website" className="flex flex-wrap items-center gap-x-7 gap-y-1 text-[15px] font-semibold">
          <a href="#hoe" className={navLink}>
            Hoe het werkt
          </a>
          <NotAvailableLink href="#prijzen" className={navLink}>
            Prijzen
          </NotAvailableLink>
          <a href="#klanten" className={navLink}>
            Klantverhalen
          </a>
          <Link href="/app" className={navLink}>
            Inloggen
          </Link>
          <Link
            href="/prototype"
            className="inline-flex min-h-11 items-center rounded-full bg-brand px-[22px] font-bold text-white no-underline hover:bg-brand-hover hover:text-white"
          >
            Probeer gratis
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto mt-12 flex max-w-[1200px] flex-wrap items-center gap-14 sm:mt-16">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
            <span className="self-start rounded-full bg-brand-tint px-3.5 py-1.5 text-sm font-bold text-brand-hover">
              Voor KMO&apos;s met vaste overlegmomenten
            </span>
            <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-[-1px] sm:text-[56px]">
              Hou jij niet van vergaderen? Wij wel.
            </h1>
            <p className="max-w-[520px] text-[19px] leading-[1.55] text-ink-2">
              Omdat onze vergaderingen eindigen in duidelijke beslissingen, en too-doo de acties opvolgt tot ze
              uitgevoerd zijn. Openstaande acties komen vanzelf terug op je volgende overleg.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/prototype"
                className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-ink px-[26px] py-4 text-[17px] font-bold text-white no-underline hover:bg-[#0b1426] hover:text-white"
              >
                <MicrosoftMark />
                Start gratis met Microsoft
              </Link>
              <Link
                href="/voorbeeld"
                className="inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-white px-[22px] py-4 text-[17px] font-bold text-ink no-underline hover:bg-app hover:text-ink"
              >
                <CirclePlay className="size-[18px]" aria-hidden />
                Bekijk de rondleiding · 2 min
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-[18px] gap-y-1 text-sm font-semibold text-[#4A5470]">
              {["30 dagen gratis", "Geen creditcard", "Klaar in 3 minuten", "Data in de EU"].map((t, i) => (
                <li key={t} className="flex gap-[18px]">
                  {i > 0 && <span aria-hidden>·</span>}
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/start" className="self-start text-[15px] font-semibold">
              Liever met je werk-e-mail starten
            </Link>
          </div>

          <figure
            aria-label="Voorbeeld van een overleg in too-doo"
            className="m-0 flex min-w-0 flex-[1_1_520px] flex-col gap-[18px] rounded-[20px] bg-white p-5 shadow-[0_2px_4px_rgba(22,33,58,0.05),0_24px_60px_rgba(14,60,140,0.14)] sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[22px] font-extrabold">Productieoverleg</p>
                <p className="mt-1 text-sm text-ink-3">
                  Elke maandag · 08:00–09:00 · volgende: <NextWeekdayDate weekday={1} />
                </p>
              </div>
              <span className="rounded-full bg-success-bg px-3 py-1.5 text-[13px] font-bold text-[#1E6B45]">
                3 van 7 afgerond sinds vorige week
              </span>
            </div>
            <p className="text-[13px] font-extrabold tracking-[0.6px] text-ink-3 uppercase">Openstaande acties</p>
            <ul className="flex flex-col overflow-hidden rounded-xl border border-line-soft">
              {HERO_ACTIONS.map((a, i) => (
                <li
                  key={a.what}
                  className={cn("flex items-center gap-3 px-4 py-3.5", i > 0 && "border-t border-line-soft")}
                >
                  <span aria-hidden className="size-[18px] shrink-0 rounded-[5px] border-2 border-checkbox" />
                  <span className="flex-1 text-[15px] font-semibold">{a.what}</span>
                  <Avatar person={a} size={28} decorative />
                  <span
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[13px] font-bold whitespace-nowrap",
                      a.late ? "bg-danger-bg text-danger" : "bg-line-faint text-ink-2",
                    )}
                  >
                    {a.due}
                  </span>
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2.5 rounded-[10px] bg-brand-soft px-3.5 py-3 text-sm font-bold text-brand-hover">
              <RotateCw className="size-[18px] shrink-0" aria-hidden />
              Niet afgevinkt? Dan staat het maandag vanzelf terug op de agenda.
            </p>
          </figure>
        </section>

        <section
          id="hoe"
          aria-label="Hoe het werkt"
          className="mx-auto mt-[72px] grid max-w-[1200px] scroll-mt-6 gap-5 md:grid-cols-3"
        >
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-line-soft bg-white p-6">
              <p className="text-sm font-extrabold text-brand">{i + 1}</p>
              <h2 className="mt-1.5 text-[19px] font-extrabold">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-normal text-ink-2">{s.text}</p>
            </div>
          ))}
        </section>

        <section
          id="klanten"
          aria-label="Klantverhalen"
          className="mx-auto mt-12 flex max-w-[1200px] scroll-mt-6 flex-wrap items-center justify-between gap-8"
        >
          <div className="flex flex-wrap gap-3.5">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className="rounded-lg border border-dashed border-checkbox px-[18px] py-3 text-sm font-bold text-ink-3"
              >
                [KLANTLOGO]
              </span>
            ))}
          </div>
          <figure className="m-0 max-w-[520px] flex-[1_1_360px] rounded-2xl border border-line-soft bg-white px-6 py-5">
            <blockquote className="text-[17px] leading-normal font-semibold">
              &quot;[Citaat van een zaakvoerder of COO uit een Vlaams maakbedrijf over wat er veranderde]&quot;
            </blockquote>
            <figcaption className="mt-2.5 text-sm text-ink-3">[Naam], [functie] · [bedrijf, gemeente]</figcaption>
          </figure>
        </section>
      </main>
    </div>
  );
}
