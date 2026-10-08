"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MicrosoftMark } from "@/components/brand";
import { Callout } from "@/components/callout";
import { ChipSuggestions } from "@/components/onboarding/chip-suggestions";
import { Eyebrow } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MORE_NAME_SUGGESTIONS, RECURRENCE_LABEL, shortRhythmLine, type Recurrence } from "@/lib/meeting";
import { SERIES, seriesSchedule } from "@/lib/mock-data";
import { useCalendarConsent } from "@/lib/simulate";
import { useOutlookBlocked, useStore } from "@/lib/store";
import { uid } from "@/lib/utils";

/** Volgorde van de ritmekeuze in de modal (mockup Snel-toevoegen). */
const RHYTHMS: Recurrence[] = ["monthly", "weekly", "biweekly", "quarterly", "once"];

interface Row {
  id: string;
  name: string;
  recurrence: Recurrence | "";
}

const newRow = (name = ""): Row => ({ id: uid("r-"), name, recurrence: "" });

/**
 * Modal 5 · "Je andere vaste overlegmomenten" (SPEC.md §3.8). Opent enkel via het
 * checklist-item of "+ Overleggen toevoegen", nooit automatisch.
 */
export function AddMeetingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <AddMeetingsForm onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function AddMeetingsForm({ onDone }: { onDone: () => void }) {
  const meetings = useStore((s) => s.meetings);
  const calendar = useStore((s) => s.calendar);
  const notice = useStore((s) => s.calendarNotice);
  const addMeetings = useStore((s) => s.addMeetings);
  const blocked = useOutlookBlocked();
  const { connect, pending } = useCalendarConsent();
  const [needsAdmin, setNeedsAdmin] = useState(false);

  const available = SERIES.filter((s) => !meetings.some((m) => m.seriesId === s.id || m.name === s.name));
  const [checked, setChecked] = useState<Set<string>>(() => new Set(available.filter((s) => s.suggested).map((s) => s.id)));
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const rowRefs = useRef(new Map<string, HTMLInputElement>());

  const seriesToAdd = calendar === "series" && !blocked ? available.filter((s) => checked.has(s.id)) : [];
  const rowsToAdd = rows.filter((r) => r.name.trim());
  const count = seriesToAdd.length + rowsToAdd.length;

  const focusRow = (id: string) => requestAnimationFrame(() => rowRefs.current.get(id)?.focus());

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /** Vult de eerste lege rij (of voegt er een toe) en houdt onderaan altijd een lege rij. */
  const addSuggestion = (name: string) =>
    setRows((rs) => {
      const idx = rs.findIndex((r) => !r.name.trim());
      const next = idx >= 0 ? rs.map((r, i) => (i === idx ? { ...r, name } : r)) : [...rs, newRow(name)];
      return next.some((r) => !r.name.trim()) ? next : [...next, newRow()];
    });

  const onConnect = async () => {
    const outcome = await connect();
    setNeedsAdmin(outcome === "admin");
  };

  const submit = () => {
    addMeetings([
      ...seriesToAdd.map((s) => ({ schedule: seriesSchedule(s), seriesId: s.id, participants: s.participants })),
      ...rowsToAdd.map((r) => ({
        schedule: {
          name: r.name.trim(),
          recurrence: r.recurrence || "weekly",
          date: null,
          time: null,
          duration: 60,
        },
      })),
    ]);
    toast(count === 1 ? "1 overleg toegevoegd" : `${count} overleggen toegevoegd`);
    onDone();
  };

  const usedNames = new Set(rows.map((r) => r.name.trim()));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Je andere vaste overlegmomenten</DialogTitle>
        <DialogDescription>Naam en ritme volstaan. Elk overleg krijgt dezelfde eenvoudige startagenda.</DialogDescription>
      </DialogHeader>

      {!blocked && (
        <section aria-labelledby="dlg-outlook" className="flex flex-col gap-2">
          <Eyebrow as="h3">
            <span id="dlg-outlook">Gevonden in je Outlook-agenda</span>
          </Eyebrow>
          {calendar === "series" &&
            (available.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {available.map((s) => (
                  <li key={s.id}>
                    <label className="grid min-h-11 cursor-pointer grid-cols-[24px_minmax(0,1fr)] items-center gap-x-3 rounded-[10px] border border-line px-3 py-2.5 hover:bg-app sm:grid-cols-[24px_minmax(0,1fr)_190px]">
                      <input
                        type="checkbox"
                        className="m-0 size-[18px] accent-brand"
                        checked={checked.has(s.id)}
                        onChange={(e) =>
                          setChecked((c) => {
                            const next = new Set(c);
                            if (e.target.checked) next.add(s.id);
                            else next.delete(s.id);
                            return next;
                          })
                        }
                      />
                      <span className="text-[15px] font-bold">{s.name}</span>
                      <span className="col-start-2 text-sm text-ink-2 sm:col-start-3">{shortRhythmLine(seriesSchedule(s))}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Al je vaste overleggen uit Outlook staan al in too-doo.</p>
            ))}
          {calendar === "none" && (
            <p className="text-sm text-ink-2">Je agenda is gekoppeld, maar we vonden geen vaste overleggen.</p>
          )}
          {calendar === "idle" && (
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="md" className="self-start" disabled={pending} onClick={onConnect}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MicrosoftMark size={7} />}
                {pending ? "Wachten op toestemming van Microsoft…" : "Koppel Outlook"}
              </Button>
              {needsAdmin && (
                <Callout live variant="warning" title="Je IT-beheerder moet de agendakoppeling eerst goedkeuren">
                  <Link href="/overleg/goedkeuring" onClick={onDone}>
                    Wat moet ik doen?
                  </Link>
                </Callout>
              )}
              {!needsAdmin && notice === "cancelled" && (
                <Callout live variant="plain">
                  Geen probleem, vul het zelf in.
                </Callout>
              )}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="dlg-zelf" className="flex flex-col gap-2">
        <Eyebrow as="h3">
          <span id="dlg-zelf">Zelf toevoegen</span>
        </Eyebrow>
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,150px)] gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
              <input
                ref={(el) => {
                  if (el) rowRefs.current.set(r.id, el);
                  else rowRefs.current.delete(r.id);
                }}
                type="text"
                aria-label={i === rows.length - 1 && !r.name ? "Naam nieuw overleg" : `Naam overleg ${i + 1}`}
                placeholder="Typ een naam en druk Enter"
                value={r.name}
                onChange={(e) => updateRow(r.id, { name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (!r.name.trim()) return;
                  const next = rows[i + 1];
                  if (next) return focusRow(next.id);
                  const created = newRow();
                  setRows((rs) => [...rs, created]);
                  focusRow(created.id);
                }}
                className="min-h-12 min-w-0 rounded-[10px] border border-line bg-white p-3 text-[15px] text-ink outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)] focus-visible:outline-none"
              />
              <select
                aria-label={`Ritme ${r.name.trim() || "nieuw overleg"}`}
                value={r.recurrence}
                onChange={(e) => updateRow(r.id, { recurrence: e.target.value as Recurrence })}
                className={`min-h-12 min-w-0 cursor-pointer rounded-[10px] border border-line bg-white p-3 text-[15px] ${r.recurrence ? "text-ink" : "text-ink-3"}`}
              >
                <option value="" disabled>
                  Ritme
                </option>
                {RHYTHMS.map((v) => (
                  <option key={v} value={v}>
                    {RECURRENCE_LABEL[v]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-3">Suggesties:</span>
          <ChipSuggestions
            label="Suggesties om toe te voegen"
            prefix="+ "
            options={MORE_NAME_SUGGESTIONS.filter((n) => !usedNames.has(n))}
            onSelect={addSuggestion}
          />
        </div>
      </section>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" size="md">
            Later
          </Button>
        </DialogClose>
        <Button size="md" disabled={count === 0} onClick={submit}>
          {count === 0 ? "Overleggen toevoegen" : count === 1 ? "1 overleg toevoegen" : `${count} overleggen toevoegen`}
        </Button>
      </DialogFooter>
    </>
  );
}
