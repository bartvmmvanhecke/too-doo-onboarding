import type { Metadata } from "next";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "De reis · too-doo" };

const STAGES = [
  {
    label: "Sales",
    title: "Demo met zijn eigen overleg",
    text: "Tijdens de demo zet sales samen met de prospect zijn productieoverleg klaar. De proefperiode start gevuld.",
  },
  {
    label: "Website",
    title: "Pijn herkennen",
    text: "Hero met wat blijft hangen. Eén knop: start met Microsoft. Tweede knop: voorbeeldbedrijf.",
  },
  {
    label: "Onboarding",
    title: "Overzicht zonder typen",
    text: "Agenda toont zijn overlegstructuur. Notities plakken of inspreken geeft de eerste acties.",
  },
  {
    label: "Eerste aha · dag 1",
    title: '"Ik zie wat vastzit"',
    text: "Overzicht met open acties, zonder eigenaar, beslissing nodig. Eigenaars krijgen een mail.",
    tone: "brand",
  },
  {
    label: "Eerste overleg",
    title: "Agenda staat klaar",
    text: 'Mail de avond ervoor. Tip in de app bij "Start overleg". Verslag met acties naar alle deelnemers.',
  },
  {
    label: "Echte aha · week 2",
    title: '"Het komt vanzelf terug"',
    text: "Niet afgewerkte acties staan bovenaan het tweede overleg. Collega's vinkten af via mail.",
    tone: "success",
  },
];

/** De reis van sales tot tweede overleg (mockup B6, referentiescherm, statisch). */
export default function JourneyPage() {
  return (
    <main className="flex min-h-dvh flex-col gap-[22px] bg-white px-4 py-10 text-ink sm:px-14 sm:py-11">
      <div className="pr-24">
        <h1 className="text-[32px] leading-tight font-extrabold">
          Eén belofte, van eerste contact tot het tweede overleg
        </h1>
        <p className="mt-2 text-[17px] text-ink-2">
          Kernzin overal hetzelfde: &quot;Zie wat blijft hangen. Voor het te laat is.&quot; Het echte bewijs komt op het
          tweede overleg, dus de reis moet daar binnen 2 weken geraken.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((s) => (
          <li
            key={s.label}
            className={cn(
              "flex flex-col gap-2 rounded-[14px] p-4",
              s.tone === "brand" && "border-2 border-brand bg-brand-selected",
              s.tone === "success" && "border-2 border-success bg-[#F1FAF4]",
              !s.tone && "border border-line",
            )}
          >
            <span className={cn("text-[13px] font-extrabold", s.tone === "success" ? "text-success" : "text-brand")}>
              {s.label}
            </span>
            <h2 className="text-base font-extrabold">{s.title}</h2>
            <p className="text-sm leading-[1.45] text-ink-2">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-[14px] bg-app px-5 py-[18px]">
          <h2 className="text-[15px] font-extrabold">Nu bouwen</h2>
          <p className="text-sm leading-[1.6] text-ink-2">
            Acties en herinneringen per mail naar eigenaars · overlegstructuur uit de agenda · notities plakken of
            inspreken (met bevestiging) · voorbeeldbedrijf rond herkenbare frustraties · mails rond het eerste overleg
          </p>
        </section>
        <section className="flex flex-col gap-2 rounded-[14px] bg-app px-5 py-[18px]">
          <h2 className="text-[15px] font-extrabold">Later, niet beloven in de onboarding</h2>
          <p className="text-sm leading-[1.6] text-ink-2">
            Acties rechtstreeks uit mail en Slack halen · Google Agenda · meten via een &quot;laat het ons
            weten&quot;-knop in de app hoeveel gebruikers erom vragen
          </p>
        </section>
      </div>
    </main>
  );
}
