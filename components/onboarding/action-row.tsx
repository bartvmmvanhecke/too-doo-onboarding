"use client";

import { DatePicker } from "@/components/date-picker";
import { OwnerCombobox, type OwnerOption } from "@/components/onboarding/owner-combobox";
import type { Person } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface ActionRowValue {
  what: string;
  ownerId: string | null;
  ownerText: string;
  deadline: string;
}

/** Kolombreedtes: Wat? · Wie? · Tegen? (gedeeld met de kolomkoppen). */
export const ACTION_GRID = "grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_170px_120px]";

/** Kolomkoppen boven de rijen; verborgen voor schermlezers (elk veld heeft een eigen label). */
export function ActionRowHeader() {
  return (
    <div aria-hidden className={cn(ACTION_GRID, "hidden px-0.5 text-[13px] font-bold text-ink-3 sm:grid")}>
      <span>Wat?</span>
      <span>Wie?</span>
      <span>Tegen?</span>
    </div>
  );
}

/** Eén actie: Wat (tekst), Wie (naam/e-mail met suggesties), Tegen (optioneel). */
export function ActionRow({
  index,
  value,
  onChange,
  owners,
  people,
  onAddPerson,
  whatPlaceholder,
  autoFocus,
  onEnter,
}: {
  index: number;
  value: ActionRowValue;
  onChange: (patch: Partial<ActionRowValue>) => void;
  owners: OwnerOption[];
  people: Person[];
  onAddPerson: (text: string) => Person;
  whatPlaceholder?: string;
  autoFocus?: boolean;
  /** Enter in Wat of Tegen (bv. om op te slaan). */
  onEnter?: () => void;
}) {
  const n = index + 1;
  const field =
    "min-h-12 w-full min-w-0 rounded-[10px] border border-line bg-white p-3 text-[15px] text-ink outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)] focus-visible:outline-none";
  const enter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };
  return (
    <div className={ACTION_GRID}>
      <input
        type="text"
        aria-label={`Actie ${n}`}
        placeholder={whatPlaceholder}
        value={value.what}
        onChange={(e) => onChange({ what: e.target.value })}
        onKeyDown={enter}
        autoFocus={autoFocus}
        className={cn(field, "col-span-2 sm:col-span-1")}
      />
      <OwnerCombobox
        label={`Eigenaar actie ${n}`}
        options={owners}
        selected={people.find((p) => p.id === value.ownerId)}
        text={value.ownerText}
        onTextChange={(ownerText) => onChange({ ownerText })}
        onSelect={(ownerId) => onChange({ ownerId })}
        onAddPerson={(text) => onChange({ ownerId: onAddPerson(text).id, ownerText: "" })}
      />
      <DatePicker
        aria-label={`Deadline actie ${n}`}
        placeholder="optioneel"
        value={value.deadline}
        onChange={(deadline) => onChange({ deadline })}
        onKeyDown={enter}
        className={field}
      />
    </div>
  );
}
