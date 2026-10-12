"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AssistantPanel, Chips } from "@/components/probeer/assistant-panel";
import { DraftMeeting, StatusBanner } from "@/components/probeer/draft-meeting";
import { EntryBlocks, PickMeeting } from "@/components/probeer/entry-blocks";
import { connectAccount } from "@/components/probeer/save-guest";
import { TrialSidebar } from "@/components/probeer/trial-sidebar";
import { Button } from "@/components/ui/button";
import {
  ME,
  RECURRENCE_CHIPS,
  mailOwners,
  participantsText,
  whenText,
  type CalendarProvider,
  type CalendarResult,
  type Message,
} from "@/lib/assistant";
import { appointmentOptions, seriesOptions } from "@/lib/assistant/calendar";
import { formatShortDate } from "@/lib/date";
import { LISTEN_DELAY, SAMPLE_TRANSCRIPT } from "@/lib/extract";
import { hasGuestWork, useGuestStore } from "@/lib/guest-store";
import { readNotesFile } from "@/lib/notes-file";
import { useCalendarConsent, useSsoLogin } from "@/lib/simulate";
import { useStore, type SaveIntent } from "@/lib/store";
import { track } from "@/lib/track";
import { cn, lowerFirst } from "@/lib/utils";

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

const PROVIDER_LABEL = { outlook: "Outlook", google: "Google" } as const;

/**
 * Eén keer per paginalading: meetpunt "trial_app_opened" en, bij terugkeer, "Welkom terug".
 * Buiten React bijgehouden: Strict Mode en Activity (cacheComponents) laten effecten opnieuw lopen
 * wanneer de pagina opnieuw zichtbaar wordt, en dat mag geen tweede bericht opleveren.
 */
let openedThisLoad = false;

function openTrial() {
  if (openedThisLoad) return;
  openedThisLoad = true;
  useStore.getState().setVariant("A");
  track("trial_app_opened");
  let first = true;
  try {
    first = !window.sessionStorage.getItem(SESSION_KEY);
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessionStorage niet beschikbaar: als eerste bezoek behandelen.
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
  const account = useGuestStore((s) => s.account);
  const typing = useGuestStore((s) => s.typing);
  const flashKeys = useGuestStore((s) => s.flash);
  const flashAt = useGuestStore((s) => s.flashAt);
  const editRequest = useGuestStore((s) => s.editRequest);
  const dispatch = useGuestStore((s) => s.dispatch);
  const sso = useSsoLogin();
  const consent = useCalendarConsent();
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState<CalendarProvider | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [flashSeen, setFlashSeen] = useState(0);
  const [open, setOpen] = useState(true);

  useEffect(openTrial, []);

  // De blauwe markering verdwijnt na 2 s. Geen cleanup: ook verborgen (Activity) mag ze gewoon aflopen.
  useEffect(() => {
    if (flashAt > flashSeen) setTimeout(() => setFlashSeen(flashAt), FLASH_MS);
  }, [flashAt, flashSeen]);
  const flash = new Set(flashAt > flashSeen ? flashKeys : []);

  const busy = typing || listening || connecting !== null || reading !== null;
  const send = dispatch;
  const sendText = (text: string) => {
    if (!busy) send({ type: "text", text }, text);
  };

  const canListen = ["entry", "sentence", "notes", "place-actions"].includes(pending.kind);
  const listen = () => {
    if (busy || !canListen) return;
    setListening(true);
    setTimeout(() => {
      setListening(false);
      const text = step === 1 && pending.kind !== "notes" ? SAMPLE_MEETING_SENTENCE : SAMPLE_TRANSCRIPT;
      send({ type: "text", text }, text);
    }, LISTEN_DELAY);
  };

  /** "Uit mijn agenda": demo-uitkomsten voor login en agendatoestemming; koppelen = inloggen. */
  const connectCalendar = async (provider: CalendarProvider) => {
    if (busy) return;
    track("assistant_entry_chosen", { ingang: "agenda", provider });
    useGuestStore.getState().addMessages([{ from: "user", text: `Uit mijn agenda · ${PROVIDER_LABEL[provider]}` }]);
    setConnecting(provider);
    const login = await sso.start(provider === "outlook" ? "microsoft" : "google");
    track("sso_result", { provider, resultaat: login });
    let result: CalendarResult;
    if (login === "blocked") result = { kind: "blocked" };
    else {
      const outcome = await consent.connect();
      if (outcome === "series" || outcome === "none") connectAccount(provider);
      result =
        outcome === "series"
          ? { kind: "series", options: seriesOptions() }
          : outcome === "none"
            ? { kind: "none", options: appointmentOptions() }
            : { kind: outcome };
    }
    setConnecting(null);
    send({ type: "calendar", provider, result });
  };

  /** Notities uit een bestand (dropzone, "Kies bestand", of slepen op "Openstaande acties"). */
  const readFile = async (file: File) => {
    if (busy) return;
    if (pending.kind === "entry") track("assistant_entry_chosen", { ingang: "notes", bron: "bestand" });
    setReading(file.name);
    const result = await readNotesFile(file);
    setReading(null);
    send(
      {
        type: "notes-file",
        name: result.name,
        text: result.text,
        sample: result.sample,
        image: result.kind === "image",
      },
      `Bestand: ${result.name}`,
    );
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

  const tell = (label = "Vertel het me") => {
    track("assistant_entry_chosen", { ingang: "meeting" });
    send({ type: "entry", entry: "meeting" }, label);
  };

  let controls: ReactNode = null;
  switch (pending.kind) {
    case "entry":
      controls = (
        <EntryBlocks
          busy={busy}
          connecting={connecting}
          reading={reading}
          onCalendar={connectCalendar}
          onFile={readFile}
          onPaste={() => {
            track("assistant_entry_chosen", { ingang: "notes", bron: "plakken" });
            send({ type: "entry", entry: "notes" }, "Ik plak de tekst");
          }}
          onTell={() => tell()}
          onExample={() => track("assistant_entry_chosen", { ingang: "example" })}
        />
      );
      break;
    case "pick-meeting":
      controls = (
        <PickMeeting
          key={pending.options.map((o) => o.id).join()}
          options={pending.options}
          onPick={(o) => send({ type: "pick-meeting", id: o.id }, o.name)}
          onTell={() => tell()}
        />
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
    pending.kind === "entry" || pending.kind === "sentence" || pending.kind === "pick-meeting"
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
        account={account}
        onSave={() => onSave("save", "zijbalk")}
      />
      <main className={cn("min-w-0 flex-1 px-4 pt-5 sm:px-8 lg:pb-10", open ? "pb-[60dvh]" : "pb-16 lg:pr-24")}>
        {/* De banner neemt de volle breedte: zo past hij op brede schermen op één regel. */}
        <div className="mb-[18px]">
          <StatusBanner account={account} onLogin={() => onSave("login", "ik-heb-al-een-account")} />
        </div>
        <div className="mx-auto w-full max-w-[860px]">
          <DraftMeeting
            flash={flash}
            editRequest={editRequest}
            busy={busy}
            onNotesFile={readFile}
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
          label: pending.kind === "entry" ? "Of typ meteen" : "Bericht aan de assistent",
          visibleLabel: pending.kind === "entry",
          placeholder,
          onSend: sendText,
          onMic: listen,
          listening,
          disabled: busy,
        }}
      />
    </div>
  );
}
