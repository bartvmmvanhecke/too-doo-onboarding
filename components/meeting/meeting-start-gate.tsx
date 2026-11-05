"use client";

import { unlockChime } from "@/lib/audio/chime-state";
import { useState, type ReactNode } from "react";
import { ArrowRight, Plus, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/brand";
import { MeetingOpsProvider, useMeetingOps } from "@/components/meeting/meeting-context";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { USER_PERSON_ID, AVATAR_COLORS } from "@/lib/mock-data";
import { usePeople, useStore, type Meeting } from "@/lib/store";

type Attendee = NonNullable<Meeting["attendance"]>[number];

/** Bevestig aanwezigheid voordat de bestaande vergadertimer start. */
export function MeetingStartGate({ meeting, children }: { meeting: Meeting; children: ReactNode }) {
  const ops = useMeetingOps();
  const people = usePeople();
  const [open, setOpen] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const patch = (personId: string, changes: Partial<Attendee>) =>
    setAttendees((rows) => rows.map((row) => (row.personId === personId ? { ...row, ...changes } : row)));
  const startRun = () => {
    void unlockChime();
    setAttendees(
      meeting.attendance ??
        meeting.participants.map((personId) => ({
          personId,
          name: people.find((p) => p.id === personId)?.name ?? "Onbekende deelnemer",
          present: true,
          role: personId === USER_PERSON_ID ? "Voorzitter" : "Deelnemer",
          guest: false,
        })),
    );
    setAddingGuest(false);
    setGuestName("");
    setOpen(true);
  };
  const proceed = () => {
    void unlockChime();
    const current = useStore.getState().meetings.find((m) => m.id === meeting.id) ?? meeting;
    ops.putMeeting({ ...current, attendance: attendees });
    ops.startRun(meeting.id);
    setOpen(false);
  };

  return (
    <MeetingOpsProvider value={{ ...ops, startRun }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="app-theme top-0 left-0 h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none bg-[linear-gradient(110deg,#08042e_0%,#73c8fb_65%)] p-0 sm:p-0"
        >
          <header className="relative flex min-h-[66px] shrink-0 items-center justify-center px-5 text-white">
            <Logo tone="white" href="/app" className="absolute left-5" />
            <p className="max-w-[50%] truncate text-center text-base font-bold">{meeting.name}</p>
          </header>
          <div className="ml-2.5 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-tl-2xl bg-[#fcfcfe] px-5 pt-6 sm:px-10">
            <div className="mx-auto flex w-full max-w-[792px] flex-1 flex-col">
              <DialogTitle className="text-[30px] leading-tight font-medium sm:text-[32px]">
                Aanwezige deelnemers
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-[#777891]">
                Bevestig de aanwezigheidslijst voor je van start gaat met je vergadering. Vink uit wie er niet bij is.
              </DialogDescription>
              <div className="mt-5 flex flex-col gap-2">
                {attendees.map((row) => {
                  const person = people.find((p) => p.id === row.personId) ?? {
                    name: row.name,
                    initials: row.name
                      .split(/\s+/)
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase(),
                    color: AVATAR_COLORS[4],
                  };
                  return (
                    <div
                      key={row.personId}
                      className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#e7e8ed] bg-white p-3 sm:flex-nowrap"
                    >
                      <label className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={row.present}
                          onChange={(e) => patch(row.personId, { present: e.target.checked })}
                          aria-label={`${row.name} aanwezig`}
                          className="size-5 shrink-0 accent-[#2055e5]"
                        />
                        <Avatar person={person} size={30} decorative />
                        <span className="text-base font-bold">{row.name}</span>
                      </label>
                      <div className="relative w-full sm:w-60">
                        <UserRound
                          aria-hidden
                          className="pointer-events-none absolute top-3.5 left-4 size-5 text-[#777891]"
                        />
                        <select
                          aria-label={`Rol van ${row.name}`}
                          value={row.role}
                          onChange={(e) => patch(row.personId, { role: e.target.value as Attendee["role"] })}
                          className="min-h-12 w-full rounded-lg border border-[#dedee2] bg-white pr-4 pl-10 text-base shadow-sm focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          <option>Deelnemer</option>
                          <option>Voorzitter</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
              {addingGuest ? (
                <form
                  className="mt-4 flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = guestName.trim();
                    if (!name) return;
                    setAttendees((rows) => [
                      ...rows,
                      { personId: `guest-${crypto.randomUUID()}`, name, present: true, role: "Deelnemer", guest: true },
                    ]);
                    setGuestName("");
                    setAddingGuest(false);
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Naam van de gast"
                    placeholder="Naam van de gast"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="min-h-11 rounded-lg border border-line bg-white px-3"
                  />
                  <button type="submit" className="min-h-11 rounded-full bg-brand px-5 font-bold text-white">
                    Toevoegen
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingGuest(false)}
                    className="min-h-11 px-3 font-bold text-brand"
                  >
                    Annuleren
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingGuest(true)}
                  className="mt-4 flex min-h-10 items-center gap-2 self-start rounded-full border border-[#b6d8ff] bg-[#e5f3ff] px-4 font-bold text-[#2055e5] hover:bg-[#d7ecff]"
                >
                  <Plus aria-hidden className="size-4" /> Voeg een gast toe
                </button>
              )}
              <footer className="mt-auto flex items-center justify-between gap-4 pt-10 pb-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-11 rounded-full px-4 font-bold text-[#2055e5] hover:bg-blue-50"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={proceed}
                  disabled={!attendees.some((p) => p.present)}
                  className="flex min-h-10 items-center gap-5 rounded-full bg-[#2055e5] px-5 font-bold text-white shadow-sm hover:bg-[#1747cf] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Doorgaan <ArrowRight aria-hidden className="size-5" />
                </button>
              </footer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MeetingOpsProvider>
  );
}
