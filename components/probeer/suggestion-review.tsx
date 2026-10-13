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
  const openCount = suggestions.filter((a) => a.reviewStatus === "open").length;
  const reviewed = suggestions.length - openCount;
  function decide(a: GuestAction, status: "confirmed" | "dismissed" | "open") {
    const owner = participants.find((p) => a.text.toLocaleLowerCase().includes(p.name.split(" ")[0].toLocaleLowerCase()));
    useGuestStore.getState().updateAction(a.id, { reviewStatus: status, confirmed: status === "confirmed", ownerId: a.ownerId ?? owner?.id ?? null });
    const next = suggestions.find((b) => b.id !== a.id && b.reviewStatus === "open");
    if (next) { setAll(true); requestAnimationFrame(() => buttons.current.get(next.id)?.focus()); }
  }
  return (
    <section id="suggestion-review" aria-label="Openstaande acties" className="mb-5 rounded-xl border-[1.5px] border-[var(--review-primary)] bg-white p-4 shadow-[0_0_0_4px_var(--review-soft)]">
      <div className="mb-2 flex items-center gap-2 text-xs"><span className="rounded bg-[var(--review-soft)] px-2 py-1 text-[11px] text-[var(--review-primary)]">NAKIJKEN</span><span className="text-ink-3">uit je notities</span></div>
      <h2 className="mb-2 font-semibold">Openstaande acties</h2>
      <p className="mb-3 text-sm text-ink-3">Wat je bevestigt, komt in elke vergadering terug tot het af is. Niets wordt bewaard zonder jouw akkoord.</p>
      <Button variant="outline" className="mb-3 min-h-11" onClick={() => { for (const a of suggestions.filter((a) => a.reviewStatus === "open")) decide(a, "confirmed"); }}>Alle {openCount} bevestigen</Button>
      <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-[var(--review-soft)]"><div className="h-full bg-[var(--review-primary)]" style={{ width: `${100 * reviewed / Math.max(suggestions.length, 1)}%` }} /></div>
      <p aria-live="polite" className="mb-3 text-xs text-ink-3">{reviewed} van {suggestions.length} nagekeken</p>
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
            {open ? <><Button variant="outline" className="min-h-11" aria-label="Geen actie" onClick={() => decide(a, "dismissed")}><X size={16} aria-hidden /></Button><Button data-open-suggestion ref={(el) => { if (el) buttons.current.set(a.id, el); else buttons.current.delete(a.id); }} className="min-h-11 bg-[var(--review-primary)]" onClick={() => decide(a, "confirmed")}>✓ Klopt</Button></> : <Button variant="ghost" className="min-h-11" onClick={() => decide(a, "open")}>Ongedaan maken</Button>}
          </li>;
        })}
      </ul>
      {!all && suggestions.length > 5 && <Button variant="ghost" className="min-h-11" onClick={() => setAll(true)}>Toon alle {suggestions.length}</Button>}
    </section>
  );
}

export function ReviewHint() {
  const actions = useGuestStore((s) => s.actions);
  const open = actions.filter((a) => a.reviewStatus === "open").length;
  if (!open) return null;
  return <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[var(--review-hint-bg)] p-3 text-[var(--review-hint-ink)]">
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--review-hint-badge)] text-sm text-white">{open}</span>
    <p className="min-w-0 flex-1 text-sm">Kijk eerst de voorstellen na. We haalden {open} acties uit je notities. Bevestig wat klopt — de rest verdwijnt.</p>
    <Button variant="outline" className="min-h-11 border-[var(--review-hint-line)] bg-white" onClick={() => { const section = document.getElementById("suggestion-review"); section?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); section?.querySelector<HTMLButtonElement>('[data-open-suggestion]')?.focus({ preventScroll: true }); }}>Nakijken</Button>
  </div>;
}
