"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FlaskConical, Play } from "lucide-react";
import { EDGE_CASES, FLOWS, type FlowId, type FlowPreset } from "@/lib/flows";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const button =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold no-underline transition-colors";

/**
 * Flowkeuze (SPEC-FLOWS.md §2). Hoort niet bij het product: bewust sobere, grijze stijl.
 * "Start flow" reset de demo-state, zet de demo-uitkomsten en opent het eerste scherm.
 */
export function PrototypeScreen() {
  const router = useRouter();
  const startFlow = useStore((s) => s.startFlow);

  const start = (flow: FlowId | null, preset: FlowPreset) => {
    startFlow(flow, preset);
    router.push(preset.start);
  };

  return (
    <div className="min-h-dvh bg-[#E9ECF1] px-4 py-8 text-[#1F2937] sm:px-8 sm:py-12">
      <main className="mx-auto flex max-w-[1100px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#374151] px-2.5 py-1 text-xs font-extrabold tracking-[0.6px] text-white uppercase">
              <FlaskConical className="size-3.5" aria-hidden />
              Prototype
            </span>
            <Link
              href="/"
              className={cn(
                button,
                "border border-[#D1D5DB] bg-white text-[#1F2937] hover:bg-[#F3F4F6] hover:text-[#1F2937]",
              )}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Ga terug naar website
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold">Kies een flow</h1>
          <p className="max-w-[720px] text-base text-[#4B5563]">
            Tussenscherm tussen website en proefperiode. &quot;Start flow&quot; wist de demo en zet de juiste uitkomsten
            klaar. De knop rechtsboven op elk scherm brengt je hier terug.
          </p>
        </header>

        <section aria-labelledby="flows-titel" className="flex flex-col gap-4">
          <h2 id="flows-titel" className="sr-only">
            Flows
          </h2>
          <ol className="grid gap-4 md:grid-cols-2">
            {FLOWS.map((f) => (
              <li key={f.id} className="flex flex-col gap-3 rounded-xl border border-[#D1D5DB] bg-white p-5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#374151] text-base font-extrabold text-white"
                  >
                    {f.id}
                  </span>
                  <h3 className="flex-1 text-lg leading-tight font-extrabold">
                    <span className="sr-only">Flow {f.id}: </span>
                    {f.title}
                  </h3>
                  <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-xs font-bold text-[#4B5563]">
                    Variant {f.variant}
                  </span>
                </div>
                <p className="text-[15px] leading-normal text-[#4B5563]">{f.text}</p>
                <ol
                  aria-label="Stappen"
                  className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold"
                >
                  {f.steps.map((step, i) => (
                    <li key={step} className="flex items-center gap-1.5">
                      {i > 0 && (
                        <span aria-hidden className="text-[#9CA3AF]">
                          ·
                        </span>
                      )}
                      {step}
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => start(f.id, f)}
                  aria-label={`Start flow ${f.id}: ${f.title}`}
                  className={cn(button, "mt-auto self-start bg-[#1F2937] text-white hover:bg-black")}
                >
                  <Play className="size-4 fill-white" aria-hidden />
                  Start flow
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="randgevallen-titel"
          className="flex flex-col gap-3 rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] p-5"
        >
          <h2 id="randgevallen-titel" className="text-base font-extrabold">
            Randgevallen
          </h2>
          <p className="text-sm text-[#4B5563]">Start één klik vóór het randgeval, met de juiste demo-uitkomst.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {EDGE_CASES.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => start(null, e)}
                  className={cn(
                    button,
                    "w-full justify-between border border-[#D1D5DB] bg-white text-left text-[#1F2937] hover:bg-[#F3F4F6]",
                  )}
                >
                  {e.title}
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Overige schermen" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
          <Link href="/" className="inline-flex min-h-11 items-center text-[#1F2937] underline">
            Website variant A
          </Link>
          <Link href="/b" className="inline-flex min-h-11 items-center text-[#1F2937] underline">
            Website variant B
          </Link>
          <Link href="/b/reis" className="inline-flex min-h-11 items-center text-[#1F2937] underline">
            De reis van sales tot tweede overleg
          </Link>
        </nav>
      </main>
    </div>
  );
}
