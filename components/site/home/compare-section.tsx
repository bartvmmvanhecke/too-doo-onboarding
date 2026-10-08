"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { SiteHeading } from "@/components/site/home/site-ui";
import { COMPARE_LABELS, COMPARE_TABS, type CompareCell } from "@/lib/site-content";
import { cn } from "@/lib/utils";

function Yes() {
  return (
    <>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="inline size-[22px] align-middle">
        <circle cx="12" cy="12" r="10" stroke="#08C489" strokeWidth="2" />
        <path d="M7.5 12.5l3 3 6-6.5" stroke="#08C489" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">Ja</span>
    </>
  );
}

function No() {
  return (
    <>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="inline size-[22px] align-middle">
        <circle cx="12" cy="12" r="10" stroke="#F05252" strokeWidth="2" />
        <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#F05252" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Nee</span>
    </>
  );
}

function Cell({ value }: { value: CompareCell }) {
  if (value === "ok") return <Yes />;
  if (value === "no") return <No />;
  return <span className="text-xs text-[#5F637E]">{value}</span>;
}

/** "Heb je al een notetaker? Goed zo." met vergelijkingstabellen per tool. */
export function CompareSection() {
  const [active, setActive] = useState(COMPARE_TABS[0].id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + COMPARE_TABS.length) % COMPARE_TABS.length;
    setActive(COMPARE_TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      id="compare"
      aria-labelledby="compare-titel"
      className="mx-2 mt-[100px] scroll-mt-24 rounded-3xl bg-[linear-gradient(180deg,#FFF0B8_0%,#FFF7DB_55%,#FFFBEF_100%)] px-4 py-20 sm:px-6"
    >
      <SiteHeading
        id="compare-titel"
        lines={[
          { text: "Heb je al een notetaker? Goed zo." },
          { text: "too-doo zorgt dat wat beslist is, ook gebeurt.", highlight: true },
        ]}
      />
      <p className="mx-auto mt-[18px] max-w-[640px] text-center text-sm text-[#5F637E]">
        Een notetaker onthoudt wat er gezegd is, zodat niemand het gesprek hoeft te missen om te typen. too-doo voegt er
        een verantwoordelijke, een einddatum en opvolging aan toe, tot het af is.
      </p>
      <div role="tablist" aria-label="Vergelijk met" className="mt-9 mb-[18px] flex flex-wrap justify-center gap-1.5">
        {COMPARE_TABS.map((t, i) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`vergelijk-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`vergelijk-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-[18px] font-site text-[13px] text-site-navy",
                on ? "bg-white shadow-[0_1px_6px_rgba(13,14,42,0.1)]" : "bg-transparent hover:bg-white/60",
              )}
            >
              {t.logo && (
                <Image src={t.logo} alt="" width={16} height={16} unoptimized className="size-4 object-contain" />
              )}
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="mb-[22px] text-center text-[13px] text-[#5F637E]">
        Of je nu Fireflies, Granola, Leexi, Otter of iets anders gebruikt: too-doo werkt er gewoon mee.
      </p>
      {COMPARE_TABS.filter((t) => t.id === active).map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`vergelijk-${t.id}`}
          aria-labelledby={`vergelijk-tab-${t.id}`}
          className="mx-auto max-w-[700px] overflow-x-auto"
        >
          <table className="w-full border-collapse bg-white font-site text-[13px] sm:min-w-[560px]">
            <caption className="sr-only">too-doo vergeleken met {t.label}</caption>
            <thead>
              <tr>
                <th scope="col" className="px-2.5 py-3 text-left">
                  <span className="sr-only">Functie</span>
                </th>
                <th
                  scope="col"
                  className="bg-[#E1EFFE] px-2.5 py-3 text-center text-xs font-medium text-site-blue-dark"
                >
                  too-doo
                </th>
                {t.head.map((h) => (
                  <th key={h} scope="col" className="px-2.5 py-3 text-center text-xs font-medium text-site-blue-dark">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, ri) => (
                <tr key={ri}>
                  <th
                    scope="row"
                    className={cn("max-w-[260px] px-2.5 py-3 text-left font-medium", ri % 2 && "bg-[#F3F4F9]")}
                  >
                    {ri === 0 && t.firstLabel ? t.firstLabel : COMPARE_LABELS[ri]}
                  </th>
                  <td className={cn("px-2.5 py-3 text-center", ri % 2 ? "bg-[#D6E7FB]" : "bg-[#E1EFFE]")}>
                    <Yes />
                  </td>
                  {row.map((c, ci) => (
                    <td key={ci} className={cn("px-2.5 py-3 text-center", ri % 2 && "bg-[#F3F4F9]")}>
                      <Cell value={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
