import type { ReactNode } from "react";
import { AvatarStack } from "@/components/avatar";
import { Eyebrow, PanelCard } from "@/components/onboarding/onboarding-layout";
import type { Person } from "@/lib/mock-data";

/**
 * Live voorbeeld van het gekozen overleg in het rechterpaneel:
 * naam, ritme, deelnemers en de startagenda (SPEC.md §3.2).
 */
export function MeetingPreview({
  name,
  placeholderName = "Bijv. Productieoverleg",
  line,
  participants = [],
  footnote,
}: {
  name: string;
  placeholderName?: string;
  line: string;
  participants?: Person[];
  footnote: ReactNode;
}) {
  return (
    <>
      <Eyebrow as="h2" className="text-panel-ink">
        Zo komt jouw overleg in too-doo
      </Eyebrow>
      <PanelCard>
        <div>
          <p className={name ? "text-2xl font-extrabold break-words" : "text-2xl font-extrabold text-ink-3"}>
            {name || placeholderName}
          </p>
          <p className="mt-1 text-sm text-ink-2">{line}</p>
        </div>
        <AvatarStack people={participants} />
        <div className="flex flex-col gap-2">
          <Eyebrow>Agenda</Eyebrow>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center justify-between gap-3 rounded-[10px] border border-line-soft px-3.5 py-3 text-[15px] font-bold">
              <span>Openstaande acties</span>
              <span className="text-[13px] font-semibold text-ink-3">vult zich vanzelf</span>
            </li>
            <li className="rounded-[10px] border border-line-soft px-3.5 py-3 text-[15px] font-bold">Lopende zaken</li>
            <li className="rounded-[10px] border border-line-soft px-3.5 py-3 text-[15px] font-bold">Varia</li>
          </ul>
        </div>
        <p className="text-[13px] text-ink-3">{footnote}</p>
      </PanelCard>
    </>
  );
}
