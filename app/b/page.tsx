import type { Metadata } from "next";
import Link from "next/link";
import { MicrosoftMark } from "@/components/brand";
import { NotAvailableLink } from "@/components/site/client-bits";
import { Tag } from "@/components/tag";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "too-doo · Zie wat blijft hangen" };

const ROWS = [
  { what: "Offerte nieuwe plooibank", meta: "Productieoverleg · JP", tag: "3 weken open", tone: "danger" as const },
  { what: "Leverancier staal contacteren", meta: "MT · geen eigenaar", tag: "wie?", tone: "warning" as const },
  { what: "Instructie heftruck bijwerken", meta: "Veiligheid · SD", tag: "vrijdag", tone: "neutral" as const },
];

const STEPS = [
  {
    title: "1 · Koppel je agenda",
    text: "too-doo herkent je vaste overleggen: wie, wanneer, hoe vaak. Jij typt niets.",
  },
  {
    title: "2 · Plak of spreek je afspraken in",
    text: "too-doo haalt er de acties uit, met eigenaar en datum. Jij bevestigt.",
  },
  {
    title: "3 · too-doo volgt op",
    text: "Herinneringen per mail, en wat niet af is, staat vanzelf op het volgende overleg.",
  },
];

const navLink = "inline-flex min-h-11 items-center text-ink no-underline hover:text-brand";

/** Website variant B (mockup B0-Hero). */
export default function HeroB() {
  return (
    <div className="min-h-dvh bg-hero px-4 pt-14 pb-14 text-ink sm:px-6">
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 rounded-[28px] bg-white py-3 pr-4 pl-7 shadow-[0_8px_24px_rgba(22,33,58,0.06)] sm:rounded-full">
        <span className="text-[28px] font-extrabold text-logo">too-doo</span>
        <nav aria-label="Website" className="flex flex-wrap items-center gap-x-7 gap-y-1 text-[15px] font-semibold">
          <a href="#hoe" className={navLink}>
            Hoe het werkt
          </a>
          <NotAvailableLink href="#prijzen" className={navLink}>
            Prijzen
          </NotAvailableLink>
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
        <section className="mx-auto mt-14 flex max-w-[1200px] flex-wrap items-center gap-14">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[22px]">
            <span className="self-start rounded-full bg-brand-tint px-3.5 py-1.5 text-sm font-bold text-brand-hover">
              Voor zaakvoerders en managers van KMO&apos;s
            </span>
            <h1 className="text-[40px] leading-[1.06] font-extrabold tracking-[-1px] sm:text-[54px]">
              Zie wat blijft hangen. Voor het te laat is.
            </h1>
            <p className="max-w-[520px] text-[19px] leading-[1.55] text-ink-2">
              too-doo zet de afspraken uit je vaste overleggen om in acties met een eigenaar en een datum, volgt ze op
              tot ze af zijn, en toont jou in één oogopslag waar het vastzit.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/prototype"
                className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-ink px-[26px] py-4 text-[17px] font-bold text-white no-underline hover:bg-[#0b1426] hover:text-white"
              >
                <MicrosoftMark />
                Start gratis met Microsoft
              </Link>
              <Link
                href="/b/voorbeeld"
                className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-[22px] py-4 text-[17px] font-bold text-ink no-underline hover:bg-app hover:text-ink"
              >
                Bekijk een voorbeeldbedrijf
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-[18px] gap-y-1 text-sm font-semibold text-[#4A5470]">
              {["30 dagen gratis", "Geen creditcard", "Je collega's hoeven niets te installeren"].map((t, i) => (
                <li key={t} className="flex gap-[18px]">
                  {i > 0 && <span aria-hidden>·</span>}
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <figure
            aria-label="Voorbeeld: deze week bij Metaalwerken"
            className="m-0 flex min-w-0 flex-[1_1_520px] flex-col gap-4 rounded-[20px] bg-white p-5 shadow-[0_24px_60px_rgba(14,60,140,0.14)] sm:p-[26px]"
          >
            <p className="text-[13px] font-extrabold tracking-[0.5px] text-ink-3 uppercase">
              Deze week bij Metaalwerken
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-danger-bg p-3.5">
                <p className="text-[28px] font-extrabold text-[#8E1F16]">4</p>
                <p className="text-sm font-bold text-[#6A1A12]">acties te laat</p>
              </div>
              <div className="rounded-xl bg-warning-bg p-3.5">
                <p className="text-[28px] font-extrabold text-[#7A3F04]">2</p>
                <p className="text-sm font-bold text-warning-ink">punten zonder beslissing</p>
              </div>
              <div className="rounded-xl bg-success-bg p-3.5">
                <p className="text-[28px] font-extrabold text-success-ink">11</p>
                <p className="text-sm font-bold text-success-ink">acties afgerond</p>
              </div>
            </div>
            <ul className="flex flex-col rounded-xl border border-line-soft">
              {ROWS.map((r, i) => (
                <li
                  key={r.what}
                  className={cn(
                    "flex flex-wrap items-center gap-3 px-4 py-[13px]",
                    i > 0 && "border-t border-line-soft",
                  )}
                >
                  <span className="flex-1 text-[15px] font-bold">{r.what}</span>
                  <span className="text-[13px] text-ink-2">{r.meta}</span>
                  <Tag tone={r.tone} className="text-[13px] font-bold">
                    {r.tag}
                  </Tag>
                </li>
              ))}
            </ul>
            <p className="rounded-[10px] bg-brand-soft px-3.5 py-3 text-sm font-bold text-brand-hover">
              Elke eigenaar krijgt zijn acties en herinneringen gewoon per mail.
            </p>
          </figure>
        </section>

        <section
          id="hoe"
          aria-label="Hoe het werkt"
          className="mx-auto mt-14 grid max-w-[1200px] scroll-mt-6 gap-5 md:grid-cols-3"
        >
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-line-soft bg-white p-6">
              <h2 className="text-sm font-extrabold text-brand">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-normal text-ink-2">{s.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
