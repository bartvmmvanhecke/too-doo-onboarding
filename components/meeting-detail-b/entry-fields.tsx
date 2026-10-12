"use client";
import { LinePicker } from "./line-fields";
import { Avatar } from "@/components/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Person } from "@/lib/mock-data";
export function EntryFields({
  ownerId,
  date,
  people,
  update,
  focus,
}: {
  ownerId: string | null;
  date: string;
  people: Person[];
  update: (patch: { ownerId?: string | null; date?: string }) => void;
  focus?: () => void;
}) {
  const owner = people.find((p) => p.id === ownerId);
  return (
    <>
      <LinePicker
        label="Eigenaar actie"
        onClose={focus}
        options={[
          { label: "Geen eigenaar", select: () => update({ ownerId: null }) },
          ...people.map((p) => ({ label: p.name, select: () => update({ ownerId: p.id }) })),
        ]}
      >
        {owner ? (
          <span className="flex items-center gap-1">
            <Avatar person={owner} size={22} />
            {owner.name.split(" ")[0]}
          </span>
        ) : (
          <span className="document-dashed">+ eigenaar</span>
        )}
      </LinePicker>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Datum actie"
            className={date ? "min-h-11 text-xs text-ink-3" : "document-dashed"}
          >
            {date || "+ datum"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="app-theme">
          <label className="text-xs">
            Datum
            <input
              type="date"
              aria-label="Datum actie aanpassen"
              className="min-h-11 w-full"
              value={date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </label>
        </PopoverContent>
      </Popover>
    </>
  );
}
