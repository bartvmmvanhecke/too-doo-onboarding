"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, FileUp, LayoutList, Mic, PanelRightClose } from "lucide-react";
import { AssistantPanel, Chips, Preparing } from "@/components/probeer/assistant-panel";
import { AppUiProvider } from "@/components/app/app-ui";
import { TrialMeeting } from "@/components/probeer/trial-meeting";
import {
  EntryChoices,
  FilePicker,
  NotesDropzone,
  PickMeeting,
  ProviderChoice,
  START_LABEL,
} from "@/components/probeer/entry-blocks";
import { GoalChips } from "@/components/probeer/goal-chips";
import { connectAccount } from "@/components/probeer/save-guest";
import { TellSuggestions } from "@/components/probeer/tell-suggestions";
import { TrialSidebar } from "@/components/probeer/trial-sidebar";
import { DOCK, DOCK_AT, DOCK_DONE } from "@/components/probeer/dock";
import { crossfade, openWithTransition } from "@/components/probeer/onboarding-transition";
import { WELCOME_LABEL, WelcomeChoices, WelcomeHeader, WelcomeIntro, WelcomeStage } from "@/components/probeer/welcome";
import { Button } from "@/components/ui/button";
import {
  ME,
  QUESTIONS,
  RECURRENCE_CHIPS,
  mailOwners,
  participantsText,
  whenText,
  type CalendarField,
  type CalendarProvider,
  type CalendarResult,
  type Message,
  type StartChoice,
} from "@/lib/assistant";
import { appointmentOptions, seriesOptions } from "@/lib/assistant/calendar";
import { GOAL_DURATIONS, type MeetingGoal } from "@/lib/assistant/goals";
import { formatShortDate } from "@/lib/date";
import { LISTEN_DELAY, SAMPLE_TRANSCRIPT } from "@/lib/extract";
import { WELCOME_MESSAGES, hasGuestWork, useGuestStore } from "@/lib/guest-store";
import { notesFileKind, readNotesFile } from "@/lib/notes-file";
import { useCalendarConsent, useSsoLogin } from "@/lib/simulate";
import { useStore, type SaveIntent } from "@/lib/store";
import { TRIAL_MEETING_ID } from "@/lib/trial-meeting";
import { track } from "@/lib/track";
import { cn, lowerFirst } from "@/lib/utils";

const FLASH_MS = 2000;
/** Een opname (inspreken of een geluidsbestand) wordt eerst "uitgeschreven". */
const RECORDING = "Opname wordt uitgeschreven…";
const PREPARING = "Ik zet je overleg klaar…";
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
  // Nog op het welkomstscherm: daar loopt het gesprek gewoon verder.
  if (first && guest.transitionPlayed && hasGuestWork(guest)) {
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
    ["Vergadering", meeting.name ?? "–"],
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

/** "Start met een lege vergadering" (C1d): de standaardagenda; de overgang naar de app volgt vanzelf. */
function startEmptyMeeting() {
  track("assistant_entry_chosen", { ingang: "empty" });
  useGuestStore.getState().startEmpty();
}

/** Zonder het welkomstbericht: in de app is de zin van de gebruiker (of de vraag) het eerste bericht. */
function withoutWelcome(messages: Message[]): Message[] {
  const [first, ...rest] = messages;
  return first?.from === "assistant" && first.text === WELCOME_MESSAGES[0].text ? rest : messages;
}

/**
 * Na de overgang: de focus op de titel van de meeting detail, niet meer in het verdwenen keuzepaneel. Bij een
 * lege vergadering gaat de titel in bewerkmodus (en krijgt het invoerveld de focus).
 */
function landInApp() {
  // Werkt de gebruiker al in de meeting detail (klik tijdens de overgang): de focus daar laten.
  const active = document.activeElement;
  if (active && active !== document.body && !active.closest("[data-assistant-panel]")) return;
  if (useGuestStore.getState().startPath === "empty") {
    useGuestStore.setState((s) => ({ editRequest: s.editRequest + 1 }));
    return;
  }
  requestAnimationFrame(() => {
    const title = document.querySelector<HTMLElement>(`#${TRIAL_MEETING_ID} h1`);
    if (!title) return;
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  });
}

/** De breedte van het keuzepaneel vlak voor de overgang. */
function panelWidth(): number | null {
  return document.querySelector("[data-assistant-panel]")?.getBoundingClientRect().width ?? null;
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
  const startPath = useGuestStore((s) => s.startPath);
  const entry = useGuestStore((s) => s.entry);
  const tellPath = entry === "meeting" || entry === "empty";
  const replyFrom = useGuestStore((s) => s.replyFrom);
  const goalChips = useGuestStore((s) => s.goalChips);
  const transitionPlayed = useGuestStore((s) => s.transitionPlayed);
  const sso = useSsoLogin();
  const consent = useCalendarConsent();
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState<CalendarProvider | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [flashSeen, setFlashSeen] = useState(0);
  // Open of gesloten (zwevende knop rechtsonder) staat in de gast-state, ook na herladen.
  const open = useGuestStore((s) => s.assistantOpen);
  const setOpen = useGuestStore((s) => s.setAssistantOpen);
  const closedHintShown = useGuestStore((s) => s.closedHintShown);
  const uiRequest = useGuestStore((s) => s.uiRequest);
  const handledUi = useRef(uiRequest?.at ?? 0);
  const [focusRequest, setFocusRequest] = useState(0);
  const focusInput = () => setFocusRequest((n) => n + 1);
  /** Wat nu in het chatveld staat; een voorbeeldsuggestie vult het via `fill`. */
  const [draft, setDraftState] = useState("");
  const setDraft = useCallback((text: string) => {
    setDraftState(text);
    // Typen laat de doelchips verdwijnen (C0j–C0m).
    if (text.trim()) useGuestStore.getState().hideGoalChips();
  }, []);
  const [fill, setFill] = useState<{ text: string; at: number }>();
  /** De zin in "Vertel het me" en de focusaanvraag bij een klik op die kaart. */
  const [sentence, setSentence] = useState("");
  const [tellFocus, setTellFocus] = useState(0);
  /** De gekozen kaart op het startscherm; "Vertel het me" staat standaard geselecteerd. */
  const [selected, setSelected] = useState<StartChoice>(() =>
    startPath === "notes" ? "notes" : startPath === "agenda" ? "calendar" : "meeting",
  );

  // Stap 0: welkom → (terugtrekken → aandokken) → app. De overgang speelt één keer per gast.
  const reduce = useReducedMotion();
  const [anim, setAnim] = useState<"retreat" | "docking" | null>(null);
  /** Afsluiter: "✓ Klaar" naast de titel (en bij notities de teller die oploopt). */
  const [done, setDone] = useState(false);
  /** Het antwoord dat de overgang startte, verschijnt pas na de afsluiter. */
  const [hold, setHold] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const docking = useRef(false);
  /** Breedte van het keuzepaneel bij de start van de overgang; het versmalt van daar naar 400 px. */
  const [morphWidth, setMorphWidth] = useState<number | null>(null);
  const phase = anim ?? (transitionPlayed ? "app" : "welcome");
  const welcome = phase === "welcome" || phase === "retreat";
  /**
   * Hoe de overgang speelt, bepaald bij de start: "morph" (breed scherm, de zijbalk staat er), of een crossfade
   * van 150 ms (reduced motion) of 200 ms (smal scherm, daar is de app-layout anders).
   */
  const [dockMode, setDockMode] = useState<"morph" | 150 | 200>("morph");
  const shared = dockMode === "morph" && anim !== null;
  const fadeMs = dockMode === "morph" ? null : dockMode;
  /** Geen View Transitions in de browser: dan fadet de app-layout zelf in. */
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(openTrial, []);

  // De blauwe markering verdwijnt na 2 s. Geen cleanup: ook verborgen (Activity) mag ze gewoon aflopen.
  useEffect(() => {
    if (flashAt > flashSeen) setTimeout(() => setFlashSeen(flashAt), FLASH_MS);
  }, [flashAt, flashSeen]);
  const flash = new Set(flashAt > flashSeen ? flashKeys : []);

  const busy = typing || listening || connecting !== null || reading !== null;

  // Verwerken duurt langer dan 600 ms: "Ik zet je overleg klaar…" in plaats van de typ-indicator.
  useEffect(() => {
    if (!typing || transitionPlayed) return;
    const reset = setTimeout(() => setSlow(false), 0);
    const id = setTimeout(() => setSlow(true), 600);
    return () => {
      clearTimeout(reset);
      clearTimeout(id);
    };
  }, [typing, transitionPlayed]);

  // De inhoud is klaar (titel en agenda uit de zin, acties uit de notities, of de reekslijst uit de agenda):
  // dan pas de overgang. Totaal ± 700 ms (0–150 ms links leegmaken; 150–650 ms vlak → zijbalk, contentvlak
  // schuift in, paneel versmalt); bij reduced motion een crossfade.
  // Bij "Vertel het me" is elke verwerkte zin genoeg, ook zonder herkende naam: de titel wordt dan
  // "Je eerste overleg" en de assistent vraagt in de app wat ontbreekt.
  const sentenceDone = startPath === "tell" && !["entry", "sentence", "provider", "paste"].includes(pending.kind);
  const contentReady =
    sentenceDone ||
    pending.kind === "pick-meeting" ||
    actions.length > 0 ||
    !!meeting.name ||
    meeting.topics.length > 0;
  const readyToDock = !transitionPlayed && !anim && !busy && contentReady;
  useEffect(() => {
    // Na "Herstart demo" staat de gast weer op het welkomstscherm.
    if (!transitionPlayed && !anim && !readyToDock) docking.current = false;
    if (!readyToDock || docking.current) return;
    docking.current = true;
    const g = useGuestStore.getState();
    const from = g.replyFrom;
    const mode = reduce ? 150 : window.matchMedia("(min-width: 1024px)").matches ? "morph" : 200;
    const timers: [number, () => void][] =
      mode !== "morph"
        ? [
            [
              0,
              () => {
                const swap = () =>
                  flushSync(() => {
                    setHold(from);
                    setDockMode(mode);
                    setAnim("docking");
                  });
                if (crossfade(swap, mode)) return;
                // Zonder View Transitions: de app-layout fadet in (200 ms).
                setFadeIn(true);
                swap();
              },
            ],
            [
              mode,
              () => (
                g.setTransitionPlayed(),
                setAnim(null),
                setDone(useGuestStore.getState().startPath !== "empty"),
                landInApp()
              ),
            ],
            [500, () => setHold(null)],
            [1400, () => setDone(false)],
          ]
        : [
            [0, () => (setHold(from), setDockMode(mode), setMorphWidth(panelWidth()), setAnim("retreat"))],
            [DOCK_AT, () => (setAnim("docking"), useGuestStore.setState({ flash: ["name"], flashAt: Date.now() }))],
            [
              DOCK_DONE,
              () => (
                g.setTransitionPlayed(),
                setAnim(null),
                setMorphWidth(null),
                setDone(useGuestStore.getState().startPath !== "empty"),
                landInApp()
              ),
            ],
            [1000, () => setHold(null)],
            [1900, () => setDone(false)],
          ];
    // Geen cleanup: ook verborgen (Activity) moet de overgang gewoon aflopen.
    for (const [ms, fn] of timers) setTimeout(fn, ms);
  }, [readyToDock, reduce, transitionPlayed, anim]);
  // Stabiel, zodat het detailscherm zijn opslagfuncties niet bij elke render opnieuw krijgt.
  const onStart = useCallback(() => onSave("start", "start-overleg"), [onSave]);
  const onEdited = useCallback(() => useGuestStore.getState().dispatch({ type: "edited" }), []);
  const send = dispatch;
  const sendText = (text: string) => {
    if (busy) return;
    // Op het welkomstscherm werkt vrije tekst meteen als "Vertel het me".
    if (welcome && pending.kind === "entry") useGuestStore.getState().setStartPath("tell");
    send({ type: "text", text }, text);
  };

  const canListen = ["entry", "sentence", "notes", "place-actions"].includes(pending.kind);
  const listen = () => {
    if (busy || !canListen) return;
    if (welcome && pending.kind === "entry") useGuestStore.getState().setStartPath("tell");
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
    useGuestStore.getState().addMessages([{ from: "user", text: PROVIDER_LABEL[provider] }]);
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
    if (welcome) useGuestStore.getState().setStartPath("notes");
    const audio = notesFileKind(file.name, file.type) === "audio";
    setReading(audio ? RECORDING : `${file.name} wordt gelezen…`);
    const [result] = await Promise.all([
      readNotesFile(file),
      new Promise((r) => setTimeout(r, audio ? LISTEN_DELAY : 0)),
    ]);
    setReading(null);
    send(
      {
        type: "notes-file",
        name: result.name,
        text: result.text,
        sample: result.sample,
        image: result.kind === "image",
        audio,
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
          { value: "run", label: "Toon hoe de vergadering verloopt" },
          { value: "another", label: "Nog een vergadering toevoegen" },
        ]}
        onSelect={(v, label) =>
          v === "run" ? router.push("/voorbeeld?van=probeer&start=1") : send({ type: "another-meeting" }, label)
        }
      />
    </div>
  );

  /** Een startkeuze (C0f), het "+"-menu of "Vertel het me": de details komen als volgend bericht. */
  const choose = (choice: StartChoice, label: string, bron: string) => {
    if (busy) return;
    if (welcome)
      useGuestStore.getState().setStartPath(choice === "meeting" ? "tell" : choice === "notes" ? "notes" : "agenda");
    // Die vraag staat al open: niet opnieuw vragen, enkel naar het chatveld.
    if ((choice === "notes" && pending.kind === "notes") || (choice === "calendar" && pending.kind === "provider"))
      return focusInput();
    track("assistant_entry_chosen", { ingang: choice, bron });
    send({ type: "entry", entry: choice }, label);
    if (choice !== "calendar") focusInput();
  };
  const tell = () => choose("meeting", "Vertel het me", "agenda");
  const fromCalendar = (field: CalendarField) => {
    if (busy) return;
    track("assistant_entry_chosen", { ingang: "calendar", bron: field === "when" ? "datumregel" : "deelnemers" });
    send({ type: "calendar-field", fields: [field] }, field === "when" ? "Uit agenda halen" : "Deelnemers uit agenda");
  };

  /** Een doelchip (C0j–C0m): links aanpassen, vervolgvraag, en de focus in het chatveld. */
  const pickGoal = (goal: MeetingGoal, label: string) => {
    if (busy) return;
    track("assistant_goal_chosen", { doel: goal });
    if (send({ type: "goal", goal }, label, { applyNow: true })) focusInput();
  };

  const showExample = () => {
    track("assistant_entry_chosen", { ingang: "example" });
    router.push("/voorbeeld?van=probeer");
  };

  // "ik doe het zelf" / "toon een voorbeeld" in de chat: eerst het korte antwoord, dan de actie.
  useEffect(() => {
    if (!uiRequest || uiRequest.at <= handledUi.current) return;
    handledUi.current = uiRequest.at;
    if (uiRequest.kind === "example") {
      track("assistant_entry_chosen", { ingang: "example" });
      router.push("/voorbeeld?van=probeer");
      return;
    }
    // Geen cleanup: na ± 800 ms sluit de assistent, ook als het scherm intussen opnieuw rendert.
    setTimeout(() => {
      const g = useGuestStore.getState();
      // Op het welkomstscherm: zelf verder zonder assistent is een lege meeting (C1d).
      if (g.transitionPlayed) g.setAssistantOpen(false);
      else startEmptyMeeting();
    }, 800);
  }, [uiRequest, router]);

  /** "Maak mijn agenda": de zin uit "Vertel het me" wordt meteen het overleg. */
  const tellSentence = () => {
    const text = sentence.trim();
    if (busy || !text) return;
    useGuestStore.getState().setStartPath("tell");
    track("assistant_entry_chosen", { ingang: "meeting", bron: "welkom" });
    send({ type: "text", text }, text);
  };

  /** Een kaart op het startscherm: "Vertel het me" klapt open, de twee andere starten hun flow. */
  const chooseCard = (c: StartChoice) => {
    if (busy) return;
    setSelected(c);
    if (c === "meeting") setTellFocus((n) => n + 1);
    else choose(c, WELCOME_LABEL[c], "welkom");
  };

  /** "Start met een lege vergadering" (C1d): de standaardagenda, met dezelfde overgang naar de app. */
  const startEmpty = () => {
    if (!busy) startEmptyMeeting();
  };

  // Voorbeeldsuggesties (C0g): enkel op het welkomstscherm na "Vertel het me", zolang de vraag nog open staat.
  const last = conversation.at(-1);
  const tellSuggestions =
    welcome &&
    startPath === "tell" &&
    pending.kind === "sentence" &&
    last?.from === "assistant" &&
    last.text === QUESTIONS.sentence;

  let controls: ReactNode = null;
  switch (pending.kind) {
    case "entry":
      controls = welcome ? (
        <WelcomeChoices
          choices={pending.choices}
          disabled={busy}
          onChoose={(c) => choose(c, WELCOME_LABEL[c], "welkom")}
        />
      ) : (
        <EntryChoices
          choices={pending.choices}
          disabled={busy}
          onChoose={(c) => choose(c, START_LABEL[c], "start")}
          onExample={() => track("assistant_entry_chosen", { ingang: "example" })}
        />
      );
      break;
    case "sentence":
      if (tellSuggestions)
        controls = (
          <TellSuggestions
            visible={!draft.trim()}
            disabled={busy}
            onPick={(text) => setFill({ text, at: Date.now() })}
          />
        );
      break;
    case "provider":
      controls = <ProviderChoice busy={busy} connecting={connecting} onCalendar={connectCalendar} />;
      break;
    case "goal":
      // De vervolgvraag van het laatst gekozen doel: snelkeuzes of een kleine hintregel (C0j–C0m).
      switch (pending.followUp) {
        case "follow-through":
          controls = (
            <p className="text-[13px] text-ink-3">Bv. “Sofie belt de staal-leverancier, Jan maakt de offerte”</p>
          );
          break;
        case "focus":
          controls = (
            <Chips
              label="Hoeveel tijd"
              disabled={busy}
              options={GOAL_DURATIONS.map((o) => ({ value: String(o.value), label: o.label }))}
              onSelect={(v, l) => send({ type: "goal-duration", minutes: Number(v) }, l)}
            />
          );
          break;
        case "status":
          controls = (
            <p className="flex flex-wrap items-center text-[13px] text-ink-3">
              Bv. “Sofie, Jan en Tania” ·
              <Button
                variant="link"
                size="sm"
                disabled={busy}
                onClick={() => fromCalendar("participants")}
                className="min-h-11 px-1 text-[13px] font-bold"
              >
                of haal ze uit je agenda
              </Button>
            </p>
          );
          break;
        case "decide":
          controls = <p className="text-[13px] text-ink-3">Bv. “kiezen we een andere staal-leverancier?”</p>;
          break;
      }
      break;
    case "when-who":
      controls = (
        <>
          <Button
            variant="outline"
            size="md"
            className="self-start"
            disabled={busy}
            onClick={() =>
              send({ type: "calendar-field", fields: ["when", "participants"] }, "Haal het uit mijn agenda")
            }
          >
            <CalendarDays className="size-4" aria-hidden />
            Haal het uit mijn agenda
          </Button>
          <p className="text-[13px] text-ink-3">Of typ het, bv. ‘elke maandag om 8u met Jan, Sofie en Karim’.</p>
        </>
      );
      break;
    case "paste":
      controls = (
        <div className="flex flex-wrap gap-2">
          <Button size="md" onClick={() => send({ type: "paste", process: true }, "Ja, verwerk")}>
            Ja, verwerk
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => send({ type: "paste", process: false }, "Nee, gewoon bericht")}
          >
            Nee, gewoon bericht
          </Button>
        </div>
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
          {!tellPath && (
            <p className="text-[13px] text-ink-3">
              Zei je niet wanneer of met wie? Dan vraag ik het, ik vul niets zelf in. E-mailadressen zijn nog niet
              nodig.
            </p>
          )}
        </>
      );
      break;
    case "notes":
      // Vertelpad, bericht 2 (Stap 1): kies een bestand, spreek in, of plak of typ ze.
      if (tellPath && actions.length === 0) {
        controls = (
          <>
            <div className="flex flex-wrap gap-2">
              <FilePicker onFile={readFile} disabled={busy}>
                <FileUp className="size-4" aria-hidden />
                Kies bestand
              </FilePicker>
              <Button variant="outline" size="sm" disabled={busy} onClick={listen}>
                <Mic className="size-4" aria-hidden />
                Inspreken
              </Button>
            </div>
            <p className="text-[13px] text-ink-3">Of plak of typ ze hieronder.</p>
            <Button
              variant="link"
              size="sm"
              className="min-h-11 self-start px-0 text-sm font-bold"
              onClick={() => send({ type: "no-actions" }, "Ik heb niets openstaan")}
            >
              Ik heb niets openstaan
            </Button>
          </>
        );
        break;
      }
      // Na "Ik heb notities" is er nog geen overleg: dan enkel de dropzone in het bericht.
      controls = meeting.name && (
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

  // Een opname wordt eerst uitgeschreven (inspreken, of een geluidsbestand).
  if (listening || reading === RECORDING) controls = <Preparing label={RECORDING} />;

  const goalPlaceholder: Record<MeetingGoal, string> = {
    "follow-through": "Plak notities of typ wat openstaat",
    focus: "Of typ: we hebben meestal 40 minuten",
    status: "Voornamen van de deelnemers",
    decide: "Typ de beslissing die nodig is",
  };
  const placeholder =
    pending.kind === "goal"
      ? pending.followUp
        ? goalPlaceholder[pending.followUp]
        : "Zeg wat er beter kan"
      : pending.kind === "notes"
        ? "Plak je notities hier"
        : pending.kind === "entry" || pending.kind === "sentence" || pending.kind === "pick-meeting"
          ? "Bijv. ons wekelijks productieoverleg: orders, problemen en planning"
          : pending.kind === "when-who"
            ? "Bijv. elke maandag om 8u met Jan, Sofie en Karim"
            : pending.kind === "confirm-meeting"
              ? "Bijv. het duurt anderhalf uur"
              : step === 2
                ? "Bijv. Karim belt, tegen woensdag"
                : "Vraag of zeg iets";

  const meetingNames = [...others.map((o) => o.meeting.name ?? "Overleg"), ...(meeting.name ? [meeting.name] : [])];
  // Het antwoord dat de overgang startte, komt pas na de afsluiter; intussen "Ik zet je overleg klaar…".
  // Al in de render (niet pas in het effect), zodat het antwoord geen enkel beeld te vroeg verschijnt.
  const held = hold ?? (readyToDock ? replyFrom : null);
  const shown = held !== null ? conversation.slice(0, held) : conversation;
  const preparing = anim !== null || held !== null || (typing && slow && !transitionPlayed);
  // Het keuzepaneel blijft staan tot het eerste antwoord er is; bij "Vertel het me" tot de overgang.
  const firstChoice = conversation.filter((m) => m.from === "user").length === 1;
  const intro =
    welcome && (!hasGuestWork({ conversation }) || (firstChoice && (typing || readyToDock || phase === "retreat")));

  return (
    <LayoutGroup>
      <div className="relative flex min-h-dvh flex-col bg-app text-ink panel:flex-row">
        {!welcome && (
          <div
            aria-hidden
            data-assistant-top-band
            style={{ backgroundSize: "calc(100vw - 220px) 100%", backgroundPosition: "right" }}
            className="pointer-events-none absolute top-0 right-0 hidden h-4 w-[432px] bg-app-band lg:block"
          />
        )}
        {welcome ? (
          <WelcomeStage selected={selected} retreat={phase === "retreat"} shared={!reduce} />
        ) : (
          <motion.div
            data-docking={shared ? "" : undefined}
            // Reduced motion of smal scherm: geen schuiven of krimpen, enkel een crossfade naar de app-layout.
            initial={anim && fadeMs && fadeIn ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "linear" }}
            className="flex min-w-0 flex-1 flex-col lg:flex-row"
          >
            {/* De zijbalk (het navy vlak landt hier), dan het contentvlak met de lichte band en de afgeronde
                hoek linksboven, zoals de app. Tijdens de overgang schuift het contentvlak in. */}
            <TrialSidebar
              meetingNames={meetingNames}
              canSave={step === 3 || others.length > 0}
              account={account}
              onSave={() => onSave("save", "zijbalk")}
              shared={shared}
            />
            <motion.div
              initial={shared ? { opacity: 0, x: 24 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={DOCK}
              className="relative flex min-w-0 flex-1 flex-col lg:pt-4"
            >
              <div
                aria-hidden
                style={{ backgroundSize: "calc(100vw - 220px) 100%" }}
                className="absolute inset-x-0 top-0 hidden h-12 bg-app-band lg:block"
              />
              <main
                className={cn(
                  "relative min-w-0 flex-1 bg-app px-4 pt-5 sm:px-8 lg:rounded-tl-[24px] lg:pt-7 panel:pb-10",
                  open ? "pb-[60dvh]" : "pb-16 panel:pr-24",
                )}
              >
                <div className="mx-auto w-full max-w-[860px]">
                  {/* Het detailscherm gebruikt de UI-context van de app (modal "Andere overlegmomenten"). */}
                  <AppUiProvider>
                    <TrialMeeting
                      flash={flash}
                      editRequest={editRequest}
                      busy={busy}
                      onNotesFile={readFile}
                      onEdited={onEdited}
                      onStart={onStart}
                      onFromCalendar={fromCalendar}
                      done={done}
                      countUp={startPath === "notes" && (anim !== null || done)}
                      emptyPath={startPath === "empty"}
                    />
                  </AppUiProvider>
                </div>
              </main>
            </motion.div>
          </motion.div>
        )}
        <AssistantPanel
          layout={welcome ? "welcome" : "trial"}
          subtitle="stelt voor, jij beslist"
          menu={
            welcome
              ? undefined
              : [
                  {
                    label: "Bekijk een voorbeeldagenda",
                    hint: "Je eigen overleg blijft bewaard",
                    icon: LayoutList,
                    onSelect: showExample,
                  },
                  {
                    label: "Assistent sluiten",
                    hint: "Je werkt zelf verder. Ik sta rechtsonder.",
                    icon: PanelRightClose,
                    onSelect: () => setOpen(false),
                  },
                ]
          }
          closedHint={!closedHintShown}
          onClosedHintDone={useGuestStore.getState().setClosedHintShown}
          header={
            welcome ? (
              <WelcomeHeader retreat={phase === "retreat"} onLogin={() => onSave("login", "welkom")} />
            ) : undefined
          }
          intro={
            intro ? (
              <WelcomeIntro
                selected={selected}
                disabled={busy}
                retreat={phase === "retreat"}
                sentence={sentence}
                onSentenceChange={setSentence}
                onTell={tellSentence}
                telling={startPath === "tell" && (typing || readyToDock || anim !== null)}
                focusRequest={tellFocus}
                onChoose={chooseCard}
                onEmpty={startEmpty}
                onExample={() => {
                  if (busy) return;
                  track("assistant_entry_chosen", { ingang: "example" });
                  openWithTransition("/voorbeeld?van=probeer", router.push, !!reduce);
                }}
              />
            ) : undefined
          }
          messages={intro ? [] : withoutWelcome(shown)}
          morphFrom={anim === "docking" && shared ? morphWidth : null}
          typing={!intro && (typing || preparing)}
          typingLabel={preparing ? PREPARING : null}
          open={open}
          onOpenChange={setOpen}
          controls={held !== null || intro ? null : controls}
          onFileDrop={busy ? null : readFile}
          renderBelow={(m) =>
            m.card === "goals" && (
              <GoalChips visible={!!goalChips} chosen={meeting.goals ?? []} disabled={busy} onPick={pickGoal} />
            )
          }
          renderCard={(card: NonNullable<Message["card"]>, isLast) =>
            !isLast || card === "goals" ? null : card === "summary" ? (
              <SummaryCard />
            ) : card === "mail" ? (
              <MailCard />
            ) : pending.kind === "notes" ? (
              <NotesDropzone busy={busy} reading={reading} onFile={readFile} onListen={listen} />
            ) : null
          }
          // Op het startscherm geen chatveld: de tekstinvoer zit in "Vertel het me".
          input={
            intro
              ? undefined
              : {
                  label: "Bericht aan de assistent",
                  placeholder,
                  onSend: sendText,
                  onMic: welcome ? undefined : listen,
                  listening,
                  disabled: busy || anim !== null,
                  focusRequest,
                  fill,
                  onDraftChange: setDraft,
                  plus: {
                    onPasteNotes: () => choose("notes", "Notities plakken", "menu"),
                    onFile: readFile,
                    onCalendar: () => choose("calendar", "Agenda koppelen", "menu"),
                  },
                }
          }
        />
      </div>
    </LayoutGroup>
  );
}
