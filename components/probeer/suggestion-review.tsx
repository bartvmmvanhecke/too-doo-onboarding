"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { OwnerButton } from "@/components/meeting/bits";
import { useMeetingOps, useMeeting } from "@/components/meeting/meeting-context";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { useGuestStore } from "@/lib/guest-store";
import { ME, type GuestAction } from "@/lib/assistant/types";
import { findOwner } from "@/lib/extract";
import { formatShortDate } from "@/lib/date";
import { USER_PERSON_ID } from "@/lib/mock-data";
import {
  isVagueSuggestion,
  reviewGuestSuggestion,
  reviewSavedSuggestion,
  type ReviewStatus,
} from "@/lib/review-suggestions";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function useReviewData() {
  const { meeting, trial, people } = useMeeting();
  const guestActions = useGuestStore((s) => s.actions);
  const suggestions = (trial ? guestActions : (meeting.reviewSuggestions ?? [])).filter((a) => a.reviewStatus);
  return {
    meeting,
    trial,
    people,
    suggestions,
    openCount: suggestions.filter((a) => a.reviewStatus === "open").length,
  };
}

export function SuggestionReview() {
  const { meeting, trial, people, suggestions, openCount } = useReviewData();
  const ops = useMeetingOps();
  const [all, setAll] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const section = useRef<HTMLElement>(null);
  const reviewed = suggestions.length - openCount;
  const participants = people.filter((p) => meeting.participants.includes(p.id));
  const ownerFor = (a: GuestAction) =>
    people.find((p) => p.id === (a.ownerId === ME ? USER_PERSON_ID : a.ownerId)) ??
    findOwner(a.text, participants)?.person;
  function decide(a: GuestAction, status: ReviewStatus, moveFocus = true) {
    if (trial) useGuestStore.setState((state) => reviewGuestSuggestion(state, a.id, status));
    else {
      const current = useStore.getState().meetings.find((m) => m.id === meeting.id) ?? meeting;
      ops.putMeeting(
        reviewSavedSuggestion(
          {
            ...current,
            reviewSuggestions: current.reviewSuggestions?.map((s) =>
              s.id === a.id ? { ...s, ownerId: s.ownerId ?? ownerFor(s)?.id ?? null } : s,
            ),
          },
          a.id,
          status,
        ),
      );
    }
    if (moveFocus) {
      const next = status === "open" ? a : suggestions.find((b) => b.id !== a.id && b.reviewStatus === "open");
      if (next) setAll(true);
      requestAnimationFrame(() => (next ? buttons.current.get(next.id)?.focus() : section.current?.focus()));
    }
  }
  function confirmAll() {
    for (const a of suggestions.filter((a) => a.reviewStatus === "open"))
      decide(a, isVagueSuggestion(a.text, participants) ? "dismissed" : "confirmed", false);
    requestAnimationFrame(() => section.current?.focus());
  }
  function owner(a: GuestAction) {
    const person = ownerFor(a);
    return person ? (
      <span className="flex items-center gap-1">
        <Avatar person={person} size={20} />
        {person.name}
      </span>
    ) : (
      <OwnerButton
        ownerId={a.ownerId === ME ? USER_PERSON_ID : a.ownerId}
        onPick={(id) => {
          if (trial) ops.assignOwner(meeting.id, a.id, id);
          else {
            const current = useStore.getState().meetings.find((m) => m.id === meeting.id) ?? meeting;
            ops.putMeeting({
              ...current,
              reviewSuggestions: current.reviewSuggestions?.map((s) => (s.id === a.id ? { ...s, ownerId: id } : s)),
            });
          }
        }}
        emptyLabel="+ Wie?"
      />
    );
  }
  const actual = meeting.actions.filter((a) => !a.done);
  return (
    <section
      ref={section}
      tabIndex={-1}
      id="suggestion-review"
      aria-label="Openstaande acties"
      className={cn(
        "mb-5 rounded-xl bg-white p-4 outline-offset-4",
        openCount
          ? "border-[1.5px] border-[var(--review-primary)] shadow-[0_0_0_4px_var(--review-soft)]"
          : "border border-[var(--review-line)]",
      )}
    >
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {reviewed} van {suggestions.length} nagekeken
      </p>
      {openCount > 0 ? (
        <>
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="rounded bg-[var(--review-soft)] px-2 py-1 text-[11px] text-[var(--review-primary)]">
              NAKIJKEN
            </span>
            <span className="text-ink-3">uit je notities</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Openstaande acties</h2>
            <Button variant="outline" className="min-h-11" onClick={confirmAll}>
              Alle {openCount} bevestigen
            </Button>
          </div>
          <p className="my-3 text-sm text-ink-3">
            Wat je bevestigt, komt in elke vergadering terug tot het af is. Niets wordt bewaard zonder jouw akkoord.
          </p>
          <div
            className="mb-1 h-1.5 overflow-hidden rounded-full bg-[var(--review-soft)]"
            role="progressbar"
            aria-label="Voorstellen nagekeken"
            aria-valuemin={0}
            aria-valuemax={suggestions.length}
            aria-valuenow={reviewed}
          >
            <div
              className="h-full bg-[var(--review-primary)]"
              style={{ width: `${(100 * reviewed) / Math.max(suggestions.length, 1)}%` }}
            />
          </div>
          <p className="mb-3 text-xs text-ink-3">
            {reviewed} van {suggestions.length} nagekeken
          </p>
          <ul className="flex flex-col gap-2">
            {(all ? suggestions : suggestions.slice(0, 5)).map((a) => {
              const open = a.reviewStatus === "open";
              const dismissed = a.reviewStatus === "dismissed" || a.reviewStatus === "agenda";
              const vague = !a.ownerId && isVagueSuggestion(a.text, participants);
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-[10px] p-3",
                    open
                      ? "border border-dashed border-[var(--review-dashed)] bg-[var(--review-row)]"
                      : dismissed
                        ? "text-[var(--review-muted)]"
                        : "border border-[var(--review-line)] bg-white",
                  )}
                >
                  {!dismissed && (
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        open
                          ? "border border-dashed border-[var(--review-dashed)]"
                          : "bg-[var(--review-check)] text-white",
                      )}
                    >
                      {!open && <Check size={14} />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", dismissed && "line-through")}>{a.text}</p>
                    {!dismissed && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {vague && open ? (
                          <>
                            <span>Te vaag voor een actie?</span>
                            <Button variant="link" className="min-h-11 p-0 text-xs" onClick={() => decide(a, "agenda")}>
                              Maak er een agendapunt van
                            </Button>
                          </>
                        ) : (
                          owner(a)
                        )}
                        {a.deadline && (
                          <span className="rounded-full bg-app px-2 py-1">{formatShortDate(a.deadline)}</span>
                        )}
                      </div>
                    )}
                    {a.reviewStatus === "agenda" && <p className="text-xs">Agendapunt in Lopende zaken</p>}
                  </div>
                  {open ? (
                    <>
                      <Button
                        variant="outline"
                        className="min-h-11 min-w-11"
                        aria-label="Geen actie"
                        onClick={() => decide(a, "dismissed")}
                      >
                        <X size={16} aria-hidden />
                      </Button>
                      <Button
                        data-open-suggestion
                        ref={(el) => {
                          if (el) buttons.current.set(a.id, el);
                          else buttons.current.delete(a.id);
                        }}
                        className="min-h-11 bg-[var(--review-primary)]"
                        onClick={() => decide(a, "confirmed")}
                      >
                        ✓ Klopt
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" className="min-h-11" onClick={() => decide(a, "open")}>
                      Ongedaan maken
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {!all && suggestions.length > 5 && (
            <Button variant="ghost" className="min-h-11" onClick={() => setAll(true)}>
              Toon alle {suggestions.length}
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <h2 className="flex-1 font-semibold">Openstaande acties</h2>
            <span className="text-xs text-ink-3">{actual.length} open</span>
            <Button
              variant="ghost"
              className="min-h-11 min-w-11"
              aria-label={collapsed ? "Acties uitklappen" : "Acties inklappen"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((v) => !v)}
            >
              <ChevronDown size={18} aria-hidden className={cn(collapsed && "-rotate-90")} />
            </Button>
          </div>
          <p className="mb-3 text-sm text-ink-3">komen vanzelf terug tot ze af zijn</p>
          {!collapsed && (
            <>
              <ul>
                {actual.map((a) => (
                  <li
                    key={a.id}
                    className="flex min-h-11 flex-wrap items-center gap-2 border-b border-[var(--review-line)] py-2"
                  >
                    <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={false}
                        aria-label={`${a.what} afvinken`}
                        onChange={() => ops.toggleAction(meeting.id, a.id)}
                        className="size-5 accent-brand"
                      />
                      {a.what}
                    </label>
                    {a.mailed && (
                      <span className="rounded-md bg-success-bg px-2 py-1 text-xs text-success-ink">
                        mail verstuurd
                      </span>
                    )}
                    {a.mailMissing && (
                      <span className="rounded-md bg-warning-bg px-2 py-1 text-xs text-warning">
                        e-mailadres ontbreekt
                      </span>
                    )}
                    {people.find((p) => p.id === a.ownerId) && (
                      <Avatar person={people.find((p) => p.id === a.ownerId)!} size={24} />
                    )}
                    {a.deadline && <span className="rounded-full bg-app px-2 py-1 text-xs">{a.deadline}</span>}
                  </li>
                ))}
              </ul>
              <details className="mt-2">
                <summary className="min-h-11 cursor-pointer py-3 text-sm text-ink-3">Nagekeken voorstellen</summary>
                <ul>
                  {suggestions.map((a) => (
                    <li key={a.id} className="flex min-h-11 items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "flex-1",
                          a.reviewStatus !== "confirmed" && "text-[var(--review-muted)] line-through",
                        )}
                      >
                        {a.text}
                      </span>
                      <Button variant="ghost" className="min-h-11" onClick={() => decide(a, "open")}>
                        Ongedaan maken
                      </Button>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </>
      )}
    </section>
  );
}

export function ReviewHint() {
  const { suggestions, openCount } = useReviewData();
  if (!openCount) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[var(--review-hint-bg)] p-3 text-[var(--review-hint-ink)]">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--review-hint-badge)] text-sm text-white">
        {openCount}
      </span>
      <p className="min-w-0 flex-1 text-sm">
        Kijk eerst de voorstellen na. We haalden {suggestions.length} acties uit je notities. Bevestig wat klopt — de
        rest verdwijnt.
      </p>
      <Button
        variant="outline"
        className="min-h-11 border-[var(--review-hint-line)] bg-white"
        onClick={() => {
          const section = document.getElementById("suggestion-review");
          section?.scrollIntoView({
            block: "center",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
          });
          section?.querySelector<HTMLButtonElement>("[data-open-suggestion]")?.focus({ preventScroll: true });
        }}
      >
        Nakijken
      </Button>
    </div>
  );
}

export function ReviewBanner() {
  const { suggestions, openCount } = useReviewData();
  const [dismissed, setDismissed] = useState("");
  const signature = suggestions.map((a) => `${a.id}:${a.reviewStatus}`).join("|");
  if (!suggestions.length || openCount || dismissed === signature) return null;
  const count = suggestions.filter((a) => a.reviewStatus === "confirmed").length;
  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-3 rounded-xl bg-[var(--review-success-bg)] px-4 py-2 text-[var(--review-success-ink)]"
    >
      <Check className="size-5 shrink-0" aria-hidden />
      <p className="flex-1 text-sm">{count} acties bevestigd. Ze komen in elke vergadering terug tot ze af zijn.</p>
      <Button
        variant="ghost"
        className="min-h-11 min-w-11"
        aria-label="Melding sluiten"
        onClick={() => setDismissed(signature)}
      >
        <X size={18} aria-hidden />
      </Button>
    </div>
  );
}
