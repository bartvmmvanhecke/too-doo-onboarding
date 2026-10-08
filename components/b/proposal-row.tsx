"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { OwnerPicker } from "@/components/b/owner-picker";
import type { OwnerOption } from "@/components/onboarding/owner-combobox";
import { Tag } from "@/components/tag";
import { formatShortDate, parseDateInput, toISO } from "@/lib/date";
import type { Proposal } from "@/lib/extract";
import type { Person } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const inline =
  "min-h-11 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-[15px] font-bold text-ink outline-none hover:border-line focus-visible:border-brand focus-visible:bg-white focus-visible:outline-none";

/** Datum als klein, typbaar label; leeg = "geen datum", ongeldig = vorige waarde. */
function DateChip({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (d: string | null) => void;
  label: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text === null) return;
    if (!text.trim()) onChange(null);
    else {
      const d = parseDateInput(text);
      if (d) onChange(toISO(d));
    }
    setText(null);
  };
  return (
    <input
      type="text"
      aria-label={label}
      placeholder="geen datum"
      value={text ?? (value ? formatShortDate(value) : "")}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className={cn(
        "min-h-11 w-[104px] rounded-md border border-transparent px-2 text-[13px] font-bold text-ink-2 outline-none placeholder:font-semibold hover:border-line focus-visible:border-brand focus-visible:outline-none",
        value ? "bg-line-faint" : "bg-transparent",
      )}
    />
  );
}

/** Eén voorstel uit de extractie: vinkje, tekst, eigenaar en datum zijn inline aanpasbaar. */
export function ProposalRow({
  proposal,
  index,
  owners,
  people,
  agendaNote,
  onChange,
}: {
  proposal: Proposal;
  index: number;
  owners: OwnerOption[];
  people: Person[];
  agendaNote: string;
  onChange: (patch: Partial<Proposal>) => void;
}) {
  const owner = people.find((p) => p.id === proposal.ownerId);
  const isAction = proposal.kind === "action";
  const needsOwner = isAction && !owner;
  const n = index + 1;

  return (
    <li
      className={cn(
        "grid items-center gap-x-2 gap-y-1 rounded-xl bg-white px-3 py-2",
        needsOwner ? "border-2 border-[#E8A33D]" : "border border-track",
        isAction
          ? "grid-cols-[22px_minmax(0,1fr)] sm:grid-cols-[22px_minmax(0,1fr)_auto_auto]"
          : "grid-cols-[22px_minmax(0,1fr)_auto]",
        !proposal.checked && "opacity-70",
      )}
    >
      <input
        type="checkbox"
        checked={proposal.checked}
        onChange={(e) => onChange({ checked: e.target.checked })}
        aria-label={`${proposal.text || `Voorstel ${n}`} bevestigen`}
        className="m-0 size-[18px] accent-brand"
      />
      {isAction ? (
        <>
          <input
            type="text"
            aria-label={`Tekst voorstel ${n}`}
            value={proposal.text}
            onChange={(e) => onChange({ text: e.target.value })}
            className={inline}
          />
          <span className="col-start-2 flex items-center gap-1 sm:col-start-auto">
            <OwnerPicker people={owners} label="Wie doet het?" onPick={(ownerId) => onChange({ ownerId })}>
              {owner ? (
                <button
                  type="button"
                  aria-label={`Eigenaar: ${owner.name}. Wijzig`}
                  className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-bold hover:bg-app"
                >
                  <Avatar person={owner} size={24} decorative />
                  {owner.name.split(" ")[0]}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`Eigenaar kiezen voor ${proposal.text || `voorstel ${n}`}`}
                  className="flex min-h-11 cursor-pointer items-center"
                >
                  <span className="rounded-full border border-dashed border-[#E8A33D] bg-warning-bg px-2.5 py-1 text-[13px] font-extrabold text-[#7A3F04]">
                    + Wie?
                  </span>
                </button>
              )}
            </OwnerPicker>
            <DateChip label={`Datum voorstel ${n}`} value={proposal.date} onChange={(date) => onChange({ date })} />
          </span>
        </>
      ) : (
        <>
          <span className="flex min-w-0 flex-col">
            <input
              type="text"
              aria-label={`Tekst voorstel ${n}`}
              value={proposal.text}
              onChange={(e) => onChange({ text: e.target.value })}
              className={inline}
            />
            <span className="px-2 pb-1 text-[13px] text-ink-2">{agendaNote}</span>
          </span>
          <Tag tone="decision">agendapunt</Tag>
        </>
      )}
    </li>
  );
}
