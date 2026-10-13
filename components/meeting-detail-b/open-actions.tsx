"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { daysLate } from "@/lib/agenda";
import { formatShortDate } from "@/lib/date";
import { useMeeting, useMeetingOps } from "@/components/meeting/meeting-context";
import { type Meeting } from "@/lib/store";
import type { Person } from "@/lib/mock-data";

export function OpenActions({ meeting, people }: { meeting: Meeting; people: Person[] }) {
  const { trial } = useMeeting();
  const ops = useMeetingOps();
  const [all, setAll] = useState(false);
  const open = meeting.actions.filter((a) => trial?.confirming || !a.done);
  const late = open.filter((a) => daysLate(a.deadline)).length;
  return (
    <section
      className="mb-6 border-b border-line pb-5"
      aria-label="Openstaande acties"
      onDragOver={(e) => {
        if (trial?.onFileDrop) e.preventDefault();
      }}
      onDrop={(e) => {
        if (trial?.onFileDrop && e.dataTransfer.files[0]) {
          e.preventDefault();
          trial.onFileDrop(e.dataTransfer.files[0]);
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <RefreshCw size={16} aria-hidden />
        <h2 className="font-semibold">Openstaande acties</h2>
        <span className="text-xs text-ink-3">
          {open.length} {trial?.confirming ? "voorstellen · vink aan wat klopt" : "open"}
          {late > 0 && (
            <>
              {" "}
              · <span className="text-danger">{late} te laat</span>
            </>
          )}
        </span>
        <span className="ml-auto text-xs text-ink-3">komen vanzelf terug tot ze af zijn</span>
      </div>
      {!open.length && trial?.emptyActions}
      {!open.length && !trial?.emptyActions && (
        <p className="text-sm text-ink-3">
          Nog niets open. Acties die je noteert, komen hier vanzelf terug tot ze af zijn.
        </p>
      )}
      {(all ? open : open.slice(0, 3)).map((a) => {
        const person = people.find((p) => p.id === a.ownerId);
        const late = daysLate(a.deadline);
        return (
          <label key={a.id} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label={`${trial?.confirming ? "Actie bevestigen" : "Actie afronden"}: ${a.what}`}
              checked={trial?.confirming ? !a.done : a.done}
              onChange={() => ops.toggleAction(meeting.id, a.id)}
            />
            <span className="flex-1">
              {a.what}{" "}
              {a.createdAt && (
                <span className="text-xs text-ink-3">· uit {formatShortDate(a.createdAt).replace(/^\S+ /, "")}</span>
              )}
            </span>
            {person && <Avatar person={person} size={24} />}
            {a.deadline && (
              <span
                className={`rounded-full px-2 py-1 text-xs ${late ? "text-danger bg-danger-bg" : "text-ink-3 bg-app"}`}
              >
                {late ? `${late} dagen te laat` : a.deadline}
              </span>
            )}
          </label>
        );
      })}
      {open.length > 3 && !all && (
        <button type="button" className="min-h-11 text-sm text-brand" onClick={() => setAll(true)}>
          Toon alle {open.length}
        </button>
      )}
    </section>
  );
}
