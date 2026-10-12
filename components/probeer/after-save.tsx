"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppUi } from "@/components/app/app-ui";
import { AssistantPanel } from "@/components/probeer/assistant-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseMeetingSentence } from "@/lib/assistant/parse";
import type { Message } from "@/lib/assistant/types";
import { nextWeekday, toISO } from "@/lib/date";
import { USER_PERSON_ID, type Person } from "@/lib/mock-data";
import { companyFromEmail, firstName, isEmail } from "@/lib/people";
import { simulateSend } from "@/lib/simulate";
import { findPerson, useOutlookBlocked, usePeople, useStore, type Meeting } from "@/lib/store";
import { track } from "@/lib/track";
import { joinNl, lowerFirst } from "@/lib/utils";

/** Variant A, na bewaren (C6): "Bewaard, Tom. Je productieoverleg staat in je account." */
export function SavedBanner({ meeting }: { meeting: Meeting }) {
  const params = useSearchParams();
  const name = useStore((s) => s.user?.firstName);
  if (meeting.origin !== "a" || params.get("welkom") !== "1") return null;
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success-ink"
    >
      <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
      <span>
        Bewaard{name ? `, ${name}` : ""}. Je {lowerFirst(meeting.name)} staat in je account.
      </span>
    </div>
  );
}

/** Eigenaars van acties (behalve jijzelf) die een mail kunnen krijgen. */
function mailPeople(meeting: Meeting, people: Person[]): Person[] {
  const ids = [
    ...new Set(meeting.actions.map((a) => a.ownerId).filter((x): x is string => !!x && x !== USER_PERSON_ID)),
  ];
  return ids.map((id) => findPerson(people, id)).filter((p): p is Person => !!p);
}

function EmailsForm({ meeting, owners }: { meeting: Meeting; owners: Person[] }) {
  const userEmail = useStore((s) => s.user?.email ?? "");
  // Het domein van de gebruiker, tenzij het een algemeen adres is (gmail en co.).
  const domain = companyFromEmail(userEmail) ? userEmail.split("@")[1] : null;
  const [emails, setEmails] = useState<Record<string, string>>(() =>
    Object.fromEntries(owners.map((p) => [p.id, p.email ?? (domain ? `${firstName(p).toLowerCase()}@${domain}` : "")])),
  );
  const [busy, setBusy] = useState(false);
  const ready = owners.filter((p) => isEmail(emails[p.id] ?? ""));
  const missing = owners.filter((p) => !isEmail(emails[p.id] ?? ""));

  const send = async () => {
    setBusy(true);
    await simulateSend();
    const { sendOwnerMails, updateLazy } = useStore.getState();
    const sent = sendOwnerMails(meeting.id, emails);
    track("owner_mails_sent", { aantal: sent.length });
    toast(sent.length === 1 ? "1 mail verstuurd" : `${sent.length} mails verstuurd`);
    updateLazy({ stage: "more", sentTo: ready.map(firstName) });
  };

  const label =
    ready.length === 0
      ? "Nog niemand mailen"
      : `Verstuur ${ready.length === 1 ? "1 mail" : `${ready.length} mails`}${missing.length ? `, ${joinNl(missing.map(firstName))} later` : ""}`;

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {owners.map((p) => (
        <label key={p.id} className="flex flex-col gap-1 text-[13px] font-bold text-ink-2">
          {firstName(p)}
          <Input
            type="email"
            value={emails[p.id] ?? ""}
            placeholder={domain ? `voornaam.naam@${domain}` : "naam@bedrijf.be"}
            onChange={(e) => setEmails((m) => ({ ...m, [p.id]: e.target.value }))}
            className="min-h-11 text-[15px] font-normal"
          />
        </label>
      ))}
      {domain && <span className="text-[13px] text-ink-3">Het domein vulden we aan uit jouw e-mailadres.</span>}
      <Button type="submit" size="md" className="self-start" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {label}
      </Button>
    </form>
  );
}

/**
 * Assistentpaneel rechts in de app na bewaren (SPEC-LAZY.md §7): e-mailadressen, mails versturen,
 * daarna Outlook als extra via het bestaande modal "Andere overlegmomenten". Blijft beschikbaar en inklapbaar.
 */
export function AfterSaveAssistant() {
  const pathname = usePathname();
  const id = pathname.match(/^\/app\/overleg\/([^/]+)$/)?.[1];
  const meeting = useStore((s) => s.meetings.find((m) => m.id === id));
  if (!meeting || meeting.origin !== "a") return null;
  return <AfterSavePanel meeting={meeting} />;
}

function AfterSavePanel({ meeting }: { meeting: Meeting }) {
  const lazy = useStore((s) => s.lazy);
  const people = usePeople();
  const blocked = useOutlookBlocked();
  const { setAddMeetingsOpen } = useAppUi();
  const [open, setOpen] = useState(true);
  const [added, setAdded] = useState<{ text: string; from: Message["from"] }[]>([]);

  const forThis = lazy?.meetingId === meeting.id ? lazy : null;
  const owners = mailPeople(meeting, people);
  const stage = forThis?.stage === "emails" && owners.length === 0 ? "more" : (forThis?.stage ?? "done");
  const setStage = (s: NonNullable<typeof lazy>["stage"]) => useStore.getState().updateLazy({ stage: s });

  const msg = (text: string, from: Message["from"] = "assistant"): Message => ({ id: `${from}-${text}`, from, text });
  const messages: Message[] = [];
  if (forThis?.intent === "send" && owners.length > 0)
    messages.push(msg("Bewaard. Nog de e-mailadressen van je collega's:"));
  else messages.push(msg(`Bewaard. Je ${lowerFirst(meeting.name)} staat in je account.`));
  if (forThis && stage !== "emails") {
    const sent = forThis.sentTo.length ? `**Verstuurd naar ${joinNl(forThis.sentTo)}.** ` : "";
    messages.push(
      msg(
        `${sent}Wil je ook je andere vaste overleggen opvolgen? ${blocked ? "Zeg ze me gewoon" : "Ik kan ze uit je Outlook-agenda halen, of je zegt ze me gewoon"}.`,
      ),
    );
  }
  if (stage === "self" || added.length) messages.push(msg("Zeg in één zin welk overleg, wanneer en met wie."));
  added.forEach((a, i) => messages.push({ id: `added-${i}`, from: a.from, text: a.text }));
  if (stage === "done" && forThis) messages.push(msg("Prima. Ik ben hier als je iets nodig hebt."));

  /** "Ik zeg ze zelf": dezelfde parser als in de proefomgeving; enkel wat gezegd werd. */
  const addFromSentence = (text: string) => {
    const p = parseMeetingSentence(text);
    const answer: { text: string; from: Message["from"] }[] = [{ text, from: "user" }];
    if (!p.name) {
      answer.push({ text: "Hoe heet dat overleg? Bijvoorbeeld: teamoverleg elke dinsdag om 9u.", from: "assistant" });
    } else {
      const { addPerson, addMeetings } = useStore.getState();
      const participants = p.participants.map((n) => addPerson(n).id);
      addMeetings([
        {
          schedule: {
            name: p.name,
            // Zoals in "Andere overlegmomenten": zonder ritme wordt het wekelijks, aanpasbaar in de app.
            recurrence: p.recurrence ?? "weekly",
            date: p.weekday ? toISO(nextWeekday(p.weekday)) : null,
            time: p.time,
            duration: p.duration ?? 60,
          },
          participants: [USER_PERSON_ID, ...participants],
        },
      ]);
      toast(`${p.name} toegevoegd`);
      answer.push({ text: `Toegevoegd: **${p.name}**. Nog een? Zeg het gewoon.`, from: "assistant" });
    }
    setAdded((a) => [...a, ...answer]);
    if (stage !== "self") setStage("self");
  };

  let controls: ReactNode = null;
  if (forThis && stage === "emails") controls = <EmailsForm meeting={meeting} owners={owners} />;
  else if (forThis && stage === "more")
    controls = (
      <div className="flex flex-wrap gap-2">
        {!blocked && (
          <Button size="md" onClick={() => setAddMeetingsOpen(true)}>
            Haal uit Outlook
          </Button>
        )}
        <Button variant="outline" size="md" onClick={() => setStage("self")}>
          Ik zeg ze zelf
        </Button>
        <Button variant="ghost" size="md" onClick={() => setStage("done")}>
          Later
        </Button>
      </div>
    );

  return (
    <AssistantPanel
      subtitle="altijd hier als je iets nodig hebt"
      messages={messages}
      typing={false}
      open={open}
      onOpenChange={setOpen}
      controls={controls}
      input={{
        label: "Bericht aan de assistent",
        placeholder: stage === "self" ? "Bijv. teamoverleg elke dinsdag om 9u met Els" : "Vraag of zeg iets",
        onSend: addFromSentence,
      }}
    />
  );
}
