"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Person } from "@/lib/mock-data";
import { simulateSend } from "@/lib/simulate";
import { joinNl } from "@/lib/utils";

/**
 * Bevestiging vóór uitnodigingen vertrekken (SPEC.md §3.7 en §8): er wordt niets
 * verstuurd zonder "Uitnodigen". Verzenden is gesimuleerd.
 */
export function InviteDialog({
  open,
  onOpenChange,
  people,
  onInvited,
  onAddAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  onInvited: () => void;
  onAddAction: () => void;
}) {
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    await simulateSend();
    setSending(false);
    onInvited();
    onOpenChange(false);
    toast(`Uitnodiging verstuurd naar ${joinNl(people.map((p) => p.name))}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Collega&apos;s uitnodigen</DialogTitle>
          <DialogDescription>
            {people.length > 0
              ? "Zij krijgen een uitnodiging om hun acties te bekijken en af te vinken. Er vertrekt niets zonder jouw bevestiging."
              : "Voeg eerst een actie met een eigenaar toe. Die collega kun je daarna uitnodigen."}
          </DialogDescription>
        </DialogHeader>
        {people.length > 0 && (
          <ul className="flex flex-col gap-2">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-[10px] border border-line-soft px-3 py-2.5">
                <Avatar person={p} size={28} decorative />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-bold">{p.name}</span>
                  <span className="truncate text-[13px] text-ink-3">{p.email ?? "geen e-mailadres bekend"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="md">
              Annuleren
            </Button>
          </DialogClose>
          {people.length > 0 ? (
            <Button size="md" disabled={sending} onClick={send}>
              {sending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Uitnodigen
            </Button>
          ) : (
            <Button
              size="md"
              onClick={() => {
                onOpenChange(false);
                onAddAction();
              }}
            >
              Actie toevoegen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
