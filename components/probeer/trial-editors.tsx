"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { GuestMeeting } from "@/lib/assistant/types";
import { useGuestStore } from "@/lib/guest-store";
import { DURATION_PRESETS, RECURRENCE_OPTIONS, type Recurrence } from "@/lib/meeting";
import { formatTime, parseTime } from "@/lib/time";

/** Variant A: wat achter de datumregel en de avatars van het overleg in opbouw opengaat. */

const DAY_OPTIONS = [
  { value: 1, label: "Maandag" },
  { value: 2, label: "Dinsdag" },
  { value: 3, label: "Woensdag" },
  { value: 4, label: "Donderdag" },
  { value: 5, label: "Vrijdag" },
];

const select =
  "min-h-11 min-w-0 cursor-pointer rounded-[10px] border border-line bg-white px-2.5 text-[15px] text-ink outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)]";

/** Dag, uur, ritme en duur. */
export function WhenEditor({ meeting, onChange }: { meeting: GuestMeeting; onChange: () => void }) {
  const set = useGuestStore((s) => s.updateMeeting);
  const updateMeeting = (patch: Partial<GuestMeeting>) => {
    set(patch);
    onChange();
  };
  const [time, setTime] = useState(meeting.time !== null ? formatTime(meeting.time) : "");
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label="Dag"
        value={meeting.weekday ?? ""}
        onChange={(e) => updateMeeting({ weekday: e.target.value ? Number(e.target.value) : null })}
        className={select}
      >
        <option value="">Dag</option>
        {DAY_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      <Input
        aria-label="Uur"
        placeholder="Uur, bv. 8u"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        onBlur={() => {
          const t = parseTime(time);
          updateMeeting({ time: t });
          setTime(t !== null ? formatTime(t) : "");
        }}
        className="min-h-11"
      />
      <select
        aria-label="Hoe vaak"
        value={meeting.recurrence ?? ""}
        onChange={(e) => updateMeeting({ recurrence: (e.target.value || null) as Recurrence | null })}
        className={select}
      >
        <option value="">Hoe vaak</option>
        {RECURRENCE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Duur"
        value={meeting.duration}
        onChange={(e) => updateMeeting({ duration: Number(e.target.value), durationProposed: false })}
        className={select}
      >
        {DURATION_PRESETS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Deelnemers toevoegen (voornaam + Enter) of verwijderen. */
export function ParticipantsEditor({ meeting, onChange }: { meeting: GuestMeeting; onChange: () => void }) {
  const store = useGuestStore.getState();
  const addParticipant = (name: string) => {
    store.addParticipant(name);
    onChange();
  };
  const removeParticipant = (id: string) => {
    store.removeParticipant(id);
    onChange();
  };
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5">
        {meeting.participants.map((p) => (
          <li key={p.id} className="flex items-center gap-1 rounded-full bg-app py-0.5 pr-0.5 pl-2.5 text-sm font-bold">
            {p.name}
            <button
              type="button"
              aria-label={`${p.name} verwijderen`}
              onClick={() => removeParticipant(p.id)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-line-soft"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          for (const n of name.split(/,|\ben\b/)) if (n.trim()) addParticipant(n.trim());
          setName("");
        }}
      >
        <Input
          aria-label="Deelnemer toevoegen"
          placeholder="Voornaam + Enter"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11"
        />
      </form>
    </div>
  );
}
