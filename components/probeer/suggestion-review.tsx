"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { OwnerButton } from "@/components/meeting/bits";
import { useMeetingOps, useMeeting } from "@/components/meeting/meeting-context";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { useGuestStore } from "@/lib/guest-store";
import type { GuestAction } from "@/lib/assistant/types";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/utils";

export function SuggestionReview() {
  const { meeting } = useMeeting();
  const ops = useMeetingOps();
  const actions = useGuestStore((s) => s.actions);
  const participants = useGuestStore((s) => s.meeting.participants);
  const [all, setAll] = useState(false);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const suggestions = actions.filter((a) => a.reviewStatus);
  function decide(a: GuestAction, status: "confirmed" | "dismissed" | "open") {
    const owner = participants.find((p) => a.text.toLocaleLowerCase().includes(p.name.split(" ")[0].toLocaleLowerCase()));
    useGuestStore.getState().updateAction(a.id, { reviewStatus: status, confirmed: status === "confirmed", ownerId: a.ownerId ?? owner?.id ?? null });
    const next = suggestions.find((b) => b.id !== a.id && b.reviewStatus === "open");
    if (next) { setAll(true); requestAnimationFrame(() => buttons.current.get(next.id)?.focus()); }
  }
  return (
    <section id="suggestion-review" aria-label="Openstaande acties" className="mb-5 rounded-xl border-[1.5px] border-[var(--review-primary)] bg-white p-4 shadow-[0_0_0_4px_var(--review-soft)]">
      <h2 className="mb-3 font-semibold">Openstaande acties</h2>
      <ul className="flex flex-col gap-2">
        {(all ? suggestions : suggestions.slice(0, 5)).map((a) => {
          const open = a.reviewStatus === "open";
          const dismissed = a.reviewStatus === "dismissed";
          const owner = participants.find((p) => p.id === a.ownerId) ?? participants.find((p) => a.text.toLocaleLowerCase().includes(p.name.split(" ")[0].toLocaleLowerCase()));
          return <li key={a.id} className={cn("flex flex-wrap items-center gap-3 rounded-[10px] p-3", open ? "border border-dashed border-[var(--review-dashed)] bg-[var(--review-row)]" : dismissed ? "text-[var(--review-muted)]" : "border border-[var(--review-line)] bg-white")}>
            {!dismissed && <span aria-hidden className={cn("flex size-5 items-center justify-center rounded-full", open ? "border border-dashed border-[var(--review-dashed)]" : "bg-[var(--review-check)] text-white")}>{!open && <Check size={14} />}</span>}
            <div className="min-w-0 flex-1"><p className={cn("text-sm font-medium", dismissed && "line-through")}>{a.text}</p>
              {!dismissed && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">{owner ? <span className="flex items-center gap-1"><Avatar person={owner} size={20} />{owner.name}</span> : <OwnerButton ownerId={a.ownerId} onPick={(id) => ops.assignOwner(meeting.id, a.id, id)} emptyLabel="+ Wie?" />}{a.deadline && <span className="rounded-full bg-app px-2 py-1">{formatShortDate(a.deadline)}</span>}</div>}
            </div>
            {open ? <><Button variant="outline" className="min-h-11" aria-label="Geen actie" onClick={() => decide(a, "dismissed")}><X size={16} aria-hidden /></Button><Button ref={(el) => { if (el) buttons.current.set(a.id, el); else buttons.current.delete(a.id); }} className="min-h-11 bg-[var(--review-primary)]" onClick={() => decide(a, "confirmed")}>✓ Klopt</Button></> : <Button variant="ghost" className="min-h-11" onClick={() => decide(a, "open")}>Ongedaan maken</Button>}
          </li>;
        })}
      </ul>
      {!all && suggestions.length > 5 && <Button variant="ghost" className="min-h-11" onClick={() => setAll(true)}>Toon alle {suggestions.length}</Button>}
    </section>
  );
}
