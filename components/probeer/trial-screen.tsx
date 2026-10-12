"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AssistantPanel, Chips } from "@/components/probeer/assistant-panel";
import { DraftMeeting } from "@/components/probeer/draft-meeting";
import { TrialSidebar } from "@/components/probeer/trial-sidebar";
import { Button } from "@/components/ui/button";
import {
  ME,
  RECURRENCE_CHIPS,
  mailOwners,
  participantsText,
  respond,
  whenText,
  type AssistantInput,
  type AssistantState,
  type Message,
} from "@/lib/assistant";
import { formatShortDate } from "@/lib/date";
import { LISTEN_DELAY, SAMPLE_TRANSCRIPT } from "@/lib/extract";
import { hasGuestWork, useGuestStore } from "@/lib/guest-store";
import { useStore, type SaveIntent } from "@/lib/store";
import { track } from "@/lib/track";
import { cn, lowerFirst } from "@/lib/utils";

/** Typ-indicator voor elk antwoord (600–900 ms). */
const TYPING_DELAY = 750;
const FLASH_MS = 2000;
/** Per tabblad: één keer "Welkom terug" per bezoek. */
const SESSION_KEY = "toodoo-guest-session";

/** Vaste transcriptie bij "Inspreken" in stap 1, zoals de vaste transcriptie in /b/acties. */
export const SAMPLE_MEETING_SENTENCE =
  "Ons productieoverleg, elke maandag om 8u met Jan, Sofie, Pieter en Karim: lopende orders, problemen en planning.";

const DAY_CHIPS = [
  { value: "1", label: "ma" },
  { value: "2", label: "di" },
  { value: "3", label: "wo" },
  { value: "4", label: "do" },
  { value: "5", label: "vr" },
];

const TIME_CHIPS = ["08:00", "09:00", "10:00", "14:00"].map((t) => ({ value: t, label: t }));

const ENTRIES = [
  {
    id: "meeting" as const,
    title: "Mijn volgende overleg",
    text: "Zeg in één zin waarover het gaat; ik stel een agenda voor.",
  },
  {
    id: "notes" as const,
    title: "Notities van een vorig overleg",
    text: "Plak ze; ik haal de acties en eigenaars eruit.",
  },
  { id: "example" as const, title: "Eerst een voorbeeld", text: "Bekijk hoe een opgevolgd overleg eruitziet." },
];

function assistantState(s: AssistantState): AssistantState {
  return {
    step: s.step,
    entry: s.entry,
    pending: s.pending,
    meeting: s.meeting,
    actions: s.actions,
    decisions: s.decisions,
    others: s.others,
  };
}

function SummaryCard() {
  const meeting = useGuestStore((s) => s.meeting);
  const rows = [
    ["Overleg", meeting.name ?? "–"],
    ["Wanneer", whenText(meeting, ", ") ?? "–"],
    ["Deelnemers", meeting.participants.length ? participantsText(meeting.participants) : "Nog niemand"],
  ];
  return (
    <dl className="mt-2.5 flex flex-col rounded-xl border border-track bg-white">
      {rows.map(([k, v], i) => (
        <div key={k} className={cn("flex items-center gap-2.5 px-3 py-2.5", i > 0 && "border-t border-line-faint")}>
          <dt className="w-[92px] shrink-0 text-[13px] font-bold text-ink-2">{k}</dt>
          <dd className="flex-1 text-sm font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function MailCard() {
  const meeting = useGuestStore((s) => s.meeting);
  const actions = useGuestStore((s) => s.actions);
  const owner = mailOwners(actions, meeting.participants)[0];
  const action = owner && actions.find((a) => a.ownerId === owner.id && a.confirmed);
  if (!owner || !action) return null;
  return (
    <div
      aria-label={`Voorbeeldmail voor ${owner.name}`}
      role="group"
      className="mt-2.5 flex flex-col gap-1.5 rounded-xl border border-track bg-white p-3.5"
    >
      <span className="text-xs font-extrabold tracking-[0.4px] text-ink-3 uppercase">Voorbeeld voor {owner.name}</span>
      <span className="text-sm font-extrabold">Jouw actie uit het {lowerFirst(meeting.name ?? "overleg")}</span>
      <span className="text-sm text-ink-2">
        {action.text}
        {action.deadline ? ` · tegen ${formatShortDate(action.deadline)}` : ""}
      </span>
      <span className="flex gap-1.5 pt-1" aria-hidden>
        <span className="rounded-md bg-success px-2.5 py-1 text-xs font-bold text-white">Afgewerkt</span>
        <span className="rounded-md border border-line px-2.5 py-1 text-xs font-bold">Andere datum</span>
      </span>
      <span className="text-[13px] text-ink-3">{owner.name} heeft geen account nodig.</span>
    </div>
  );
}

/** Variant A · de proefomgeving op /probeer (C1–C4): zijbalk, overleg in opbouw, assistent. */
export function TrialScreen({ onSave }: { onSave: (intent: SaveIntent, trigger: string) => void }) {
  const router = useRouter();
  const conversation = useGuestStore((s) => s.conversation);
  const pending = useGuestStore((s) => s.pending);
  const step = useGuestStore((s) => s.step);
  const meeting = useGuestStore((s) => s.meeting);
  const actions = useGuestStore((s) => s.actions);
  const others = useGuestStore((s) => s.others);
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [editRequest, setEditRequest] = useState(0);
  const [open, setOpen] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Openen: meetpunt, actieve variant A, en bij terugkeer "Welkom terug".
  useEffect(() => {
    useStore.getState().setVariant("A");
    track("trial_app_opened");
    let first = true;
    try {
      first = !window.sessionStorage.getItem(SESSION_KEY);
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage niet beschikbaar: elke keer als eerste bezoek behandelen.
    }
    const guest = useGuestStore.getState();
    if (first && hasGuestWork(guest)) {
      track("guest_returned");
      const name = guest.meeting.name ?? guest.others[0]?.meeting.name;
      guest.addMessages([
        {
          from: "assistant",
          text: `Welkom terug. Je ${lowerFirst(name ?? "overleg")} staat er nog. Bewaar het wanneer je wilt.`,
        },
      ]);
    }
  }, []);

  const send = (input: AssistantInput, userText?: string) => {
    if (typing) return;
    const guest = useGuestStore.getState();
    if (userText) guest.addMessages([{ from: "user", text: userText }]);
    if (input.type === "text") track("assistant_message_sent", { stap: String(guest.step), lengte: input.text.length });
    setTyping(true);
    later(() => {
      const s = useGuestStore.getState();
      const reply = respond(assistantState(s), input);
      s.applyReply(reply.state, reply.messages);
      for (const [event, props] of reply.events) track(event, props);
      if (reply.flash.length) {
        setFlash(new Set(reply.flash));
        later(() => setFlash(new Set()), FLASH_MS);
      }
      if (reply.edit) setEditRequest((n) => n + 1);
      setTyping(false);
    }, TYPING_DELAY);
  };

  const sendText = (text: string) => send({ type: "text", text }, text);

  const canListen = ["entry", "sentence", "notes", "place-actions"].includes(pending.kind);
  const listen = () => {
    if (listening || typing || !canListen) return;
    setListening(true);
    later(() => {
      setListening(false);
      sendText(step === 1 ? SAMPLE_MEETING_SENTENCE : SAMPLE_TRANSCRIPT);
    }, LISTEN_DELAY);
  };

  const chooseEntry = (id: (typeof ENTRIES)[number]["id"], title: string) => {
    track("assistant_entry_chosen", { ingang: id === "meeting" ? "meeting" : id === "notes" ? "notes" : "example" });
    if (id === "example") return router.push("/voorbeeld?van=probeer");
    send({ type: "entry", entry: id }, title);
  };

  const owners = mailOwners(actions, meeting.participants);
  const placeButton = actions.length > 0 && (
    <Button size="md" className="self-start" onClick={() => send({ type: "place-actions" }, "Zet ze op de agenda")}>
      Zet ze op de agenda
    </Button>
  );

  const tryMore = (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-bold text-ink-3">Of probeer verder</span>
      <Chips
        label="Of probeer verder"
        options={[
          { value: "run", label: "Toon hoe het overleg verloopt" },
          { value: "another", label: "Nog een overleg toevoegen" },
        ]}
        onSelect={(v, label) =>
          v === "run" ? router.push("/voorbeeld?van=probeer&start=1") : send({ type: "another-meeting" }, label)
        }
      />
    </div>
  );

  let controls: ReactNode = null;
  switch (pending.kind) {
    case "entry":
      controls = (
        <div role="group" aria-label="Hoe wil je starten?" className="flex flex-col gap-2">
          {ENTRIES.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => chooseEntry(e.id, e.title)}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-xl px-3.5 py-3 text-left",
                i === 0 ? "border-2 border-brand bg-brand-selected" : "border border-line bg-white hover:bg-app",
              )}
            >
              <span className="text-[15px] font-extrabold">{e.title}</span>
              <span className="text-[13px] text-ink-2">{e.text}</span>
            </button>
          ))}
        </div>
      );
      break;
    case "day":
      controls = (
        <Chips label="Dag kiezen" options={DAY_CHIPS} onSelect={(v, l) => send({ type: "chip", value: v }, l)} />
      );
      break;
    case "time":
      controls = (
        <Chips label="Uur kiezen" options={TIME_CHIPS} onSelect={(v, l) => send({ type: "chip", value: v }, l)} />
      );
      break;
    case "recurrence":
      controls = (
        <Chips label="Hoe vaak" options={RECURRENCE_CHIPS} onSelect={(v, l) => send({ type: "chip", value: v }, l)} />
      );
      break;
    case "participants":
      controls = (
        <Chips
          label="Deelnemers"
          options={[{ value: "later", label: "Later" }]}
          onSelect={(v, l) => send({ type: "chip", value: v }, l)}
        />
      );
      break;
    case "confirm-meeting":
      controls = (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="md" onClick={() => send({ type: "confirm-meeting" }, "Klopt")}>
              Klopt
            </Button>
            <Button variant="outline" size="md" onClick={() => send({ type: "adjust" }, "Iets aanpassen")}>
              Iets aanpassen
            </Button>
          </div>
          <p className="text-[13px] text-ink-3">
            Zei je niet wanneer of met wie? Dan vraag ik het, ik vul niets zelf in. E-mailadressen zijn nog niet nodig.
          </p>
        </>
      );
      break;
    case "notes":
      controls = (
        <Button
          variant="outline"
          size="md"
          className="self-start"
          onClick={() => send({ type: "no-actions" }, "Ik heb niets openstaan")}
        >
          Ik heb niets openstaan
        </Button>
      );
      break;
    case "owner": {
      const busy = new Set(actions.map((a) => a.ownerId));
      const free = meeting.participants.filter((p) => !busy.has(p.id));
      const people = free.length ? free : meeting.participants;
      controls = (
        <>
          <Chips
            label="Eigenaar kiezen"
            options={[
              ...people.map((p) => ({ value: p.id, label: p.name })),
              { value: ME, label: "Ikzelf" },
              { value: "later", label: "Later beslissen" },
            ]}
            onSelect={(v, l) => send({ type: "chip", value: v }, l)}
          />
          {placeButton}
        </>
      );
      break;
    }
    case "place-actions":
      controls = placeButton;
      break;
    case "proposal":
      controls = (
        <>
          <div className="flex flex-wrap gap-2">
            {owners.length > 0 ? (
              <>
                <Button size="md" onClick={() => onSave("send", "voorstel")}>
                  Ja, stuur ze
                </Button>
                <Button variant="outline" size="md" onClick={() => onSave("save", "voorstel")}>
                  Alleen bewaren
                </Button>
              </>
            ) : (
              <>
                <Button size="md" onClick={() => onSave("save", "voorstel")}>
                  Alleen bewaren
                </Button>
                <Button variant="outline" size="md" onClick={() => onSave("invite", "voorstel")}>
                  Nodig deelnemers uit
                </Button>
              </>
            )}
            <Button variant="ghost" size="md" onClick={() => send({ type: "dismiss-proposal" }, "Nog even rondkijken")}>
              Nog even rondkijken
            </Button>
          </div>
          {tryMore}
        </>
      );
      break;
    case "idle":
      controls = tryMore;
      break;
  }

  const placeholder =
    pending.kind === "entry" || pending.kind === "sentence"
      ? "Bijv. ons wekelijks productieoverleg: orders, problemen en planning"
      : pending.kind === "confirm-meeting"
        ? "Bijv. het duurt anderhalf uur"
        : step === 2
          ? "Bijv. Karim belt, tegen woensdag"
          : "Vraag of zeg iets";

  const progress = step === "done" ? undefined : `${step} van 3`;
  const meetingNames = [...others.map((o) => o.meeting.name ?? "Overleg"), ...(meeting.name ? [meeting.name] : [])];

  return (
    <div className="flex min-h-dvh flex-col bg-app text-ink lg:flex-row">
      <TrialSidebar
        meetingNames={meetingNames}
        canSave={step === 3 || others.length > 0}
        onSave={() => onSave("save", "zijbalk")}
      />
      <main className={cn("min-w-0 flex-1 px-4 pt-5 sm:px-8 lg:pb-10", open ? "pb-[60dvh]" : "pb-16 lg:pr-24")}>
        <div className="mx-auto w-full max-w-[860px]">
          <DraftMeeting
            flash={flash}
            editRequest={editRequest}
            onSave={(intent) => onSave(intent, intent === "login" ? "ik-heb-al-een-account" : "start-overleg")}
            onExample={() => track("assistant_entry_chosen", { ingang: "example" })}
            onEditDone={() => send({ type: "edited" })}
          />
        </div>
      </main>
      <AssistantPanel
        subtitle="stelt voor, jij beslist"
        progress={progress}
        messages={conversation}
        typing={typing}
        open={open}
        onOpenChange={setOpen}
        controls={controls}
        renderCard={(card: NonNullable<Message["card"]>, isLast) =>
          !isLast ? null : card === "summary" ? <SummaryCard /> : <MailCard />
        }
        input={{
          label: pending.kind === "entry" ? "Of vertel het meteen" : "Bericht aan de assistent",
          visibleLabel: pending.kind === "entry",
          placeholder,
          onSend: sendText,
          onMic: listen,
          listening,
          disabled: typing || listening,
        }}
      />
    </div>
  );
}
