"use client";

import { useState } from "react";
import { SiteHeading, siteButton } from "@/components/site/home/site-ui";
import { NotAvailableLink } from "@/components/site/client-bits";
import { FEATURE_GROUPS, PLAN_FEATURES } from "@/lib/site-content";
import { cn } from "@/lib/utils";

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="mt-px size-5 flex-none">
      <circle cx="10" cy="10" r="10" fill="#DEF7EC" />
      <path
        d="M5.5 10.5l3 3 6-6.5"
        stroke="#08C489"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "Eenvoudige prijzen. Geen verrassingen." met maand/jaar-schakelaar en volledige functielijst. */
export function PricingSection() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" aria-labelledby="pricing-titel" className="mt-[104px] scroll-mt-24 px-5 text-center md:px-10">
      <SiteHeading
        id="pricing-titel"
        lines={[{ text: "Eenvoudige prijzen." }, { text: "Geen verrassingen.", highlight: true }]}
      />
      <p className="mt-3.5 text-sm text-site-muted">Eén abonnement. Voor je vergaderingen én wat erna gebeurt.</p>
      <div
        role="radiogroup"
        aria-label="Facturatie"
        className="mx-auto mt-[30px] inline-flex gap-0.5 rounded-full bg-site-pill p-1 font-site"
      >
        {[
          { on: !yearly, label: "Maandelijks factureren", value: false },
          { on: yearly, label: "Jaarlijks factureren", value: true },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={o.on}
            onClick={() => setYearly(o.value)}
            className={cn(
              "min-h-11 cursor-pointer rounded-full px-[18px] text-[13px] text-site-navy",
              o.on && "bg-white shadow-[0_1px_6px_rgba(13,14,42,0.1)]",
            )}
          >
            {o.label}
            {o.value && (
              <span className="ml-1.5 rounded-full bg-[#DCFCE7] px-2 py-px text-[11px] text-[#046C4E]">
                Bespaar 20%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-[34px] grid max-w-[940px] gap-8 rounded-2xl bg-white p-8 text-left shadow-[0_4px_24px_rgba(13,14,42,0.08)] md:grid-cols-2">
        <div>
          <h3 className="font-sans text-lg font-semibold">Harmony</h3>
          <p className="mt-1 border-b border-site-border pb-5 text-sm text-site-muted">
            Weet zeker dat je organisatie presteert en leert.
          </p>
          <p className="my-[18px] mt-6 flex items-baseline gap-2">
            <b aria-live="polite" className="font-sans text-[44px] font-bold">
              {yearly ? "€20" : "€25"}
            </b>
            <span className="text-[13px] text-site-muted">per gebruiker per maand</span>
          </p>
          <NotAvailableLink href="#demo" className={siteButton("primary")}>
            Demo aanvragen
          </NotAvailableLink>
        </div>
        <ul className="grid gap-3.5 font-site text-sm font-light">
          {PLAN_FEATURES.map((f) => (
            <li key={f.text} className="flex items-start gap-2.5">
              <Check />
              <span>
                {f.text}
                {f.bold && <b className="font-medium">{f.bold}</b>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <details className="group mx-auto mt-[22px] max-w-[940px]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center text-sm text-site-navy [&::-webkit-details-marker]:hidden">
          Bekijk volledige functielijst
          <span
            aria-hidden
            className="ml-2 inline-flex size-6 items-center justify-center rounded-full border border-site-muted text-[15px] leading-none text-site-muted group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="mt-7 grid gap-x-10 gap-y-7 rounded-2xl bg-white p-7 text-left shadow-[0_4px_24px_rgba(13,14,42,0.06)] md:grid-cols-2">
          {FEATURE_GROUPS.map(([group, items]) => (
            <div key={group}>
              <h4 className="mb-2.5 font-sans text-base font-bold text-site-blue-dark">{group}</h4>
              <ul className="font-site">
                {items.map(([name, note, soon]) => (
                  <li key={name} className="mb-2 text-[13px] font-normal">
                    {name}
                    {soon && (
                      <span className="ml-1.5 inline-block rounded-full bg-[#EEF0F8] px-2 py-px text-[10px] font-normal text-[#5F637E]">
                        Binnenkort
                      </span>
                    )}
                    {note && <small className="block text-xs font-light text-site-muted">{note}</small>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
