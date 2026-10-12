"use client";

import { useMemo } from "react";
import { CircleCheck } from "lucide-react";
import type { MeetingOps, TrialView } from "@/components/meeting/meeting-context";
import { MeetingDetail } from "@/components/meeting/meeting-detail";
import { FilePicker } from "@/components/probeer/entry-blocks";
import { ParticipantsEditor, WhenEditor } from "@/components/probeer/trial-editors";
import { weekdayName, whenText } from "@/lib/assistant/format";
import { ME } from "@/lib/assistant/types";
import { formatShortDate, nextWeekday } from "@/lib/date";
import { useGuestStore } from "@/lib/guest-store";
import { USER_PERSON_ID } from "@/lib/mock-data";
import {
  DEFAULT_BLOCK,
  hasAgendaItem,
  isTopicBlock,
  trialMeeting,
  trialPeople,
  TRIAL_MEETING_ID,
} from "@/lib/trial-meeting";
import { lowerFirst } from "@/lib/utils";

const noop = () => {};

/**
 * Wijzigingen uit het detailscherm, teruggeschreven naar de gast-state. Wat in de proefomgeving niet kan
 * (vergadering starten, notities, uitnodigen), doet niets of opent het bewaar-modal.
 */
function trialOps(onStart: () => void): MeetingOps {
  const g = () => useGuestStore.getState();
  const decision = (id: string) => g().decisions.some((d) => d.id === id);
  return {
    updateBlock: (_, blockId, patch) => {
      // Presentator van het thema, zoals in het detailscherm.
      if ("presenterId" in patch) g().setPresenter(blockId, patch.presenterId ?? null);
      if (!patch.title) return;
      if (isTopicBlock(blockId)) g().updateTopic(blockId, patch.title);
      // "Lopende zaken" hernoemen maakt er een eigen agendapunt van.
      else if (blockId === DEFAULT_BLOCK) g().addTopic(patch.title);
    },
    removeBlock: (_, blockId) => {
      if (isTopicBlock(blockId)) g().removeTopic(blockId);
    },
    moveBlock: (_, blockId, toIndex) => {
      // "Openstaande acties" blijft bovenaan (index 0) en "Varia" onderaan; de thema's ertussen zijn versleepbaar.
      if (isTopicBlock(blockId)) g().moveTopic(blockId, toIndex - 1);
    },
    addBlock: () => "",
    addAgendaItem: (_, blockId, text) => {
      g().addItem(blockId, text);
      return "";
    },
    updateItem: (_, itemId, patch) => {
      // Titel, doel, eigenaars en duur, zoals in het detailscherm.
      const { text, purposes, ownerIds, duration } = patch;
      const update = {
        ...(text ? { text } : {}),
        ...(purposes ? { purposes } : {}),
        ...(ownerIds ? { ownerIds } : {}),
        ...(duration !== undefined ? { duration } : {}),
      };
      if (!Object.keys(update).length) return;
      if (decision(itemId)) g().updateDecision(itemId, update);
      else g().updateItem(itemId, update);
    },
    removeItem: (_, itemId) => {
      if (decision(itemId)) g().updateDecision(itemId, { confirmed: false });
      else g().removeItem(itemId);
    },
    moveItem: (_, itemId, toBlockId, toIndex) => g().moveItem(itemId, toBlockId, toIndex),
    toggleAction: (_, actionId) => {
      const a = g().actions.find((x) => x.id === actionId);
      if (!a) return;
      if (g().step === 2) g().updateAction(actionId, { confirmed: !a.confirmed });
      else g().updateAction(actionId, { done: !a.done });
    },
    assignOwner: (_, actionId, ownerId) =>
      g().updateAction(actionId, { ownerId: ownerId === USER_PERSON_ID ? ME : ownerId, ownerLater: false }),
    addAction: (_, action) => g().addAction(action.what),
    startRun: onStart,
    updateDetails: noop,
    addEntry: () => "",
    updateEntry: noop,
    removeEntry: noop,
    nextStep: noop,
    endRun: noop,
    markInvited: noop,
    putMeeting: noop,
  };
}

/**
 * Het overleg in opbouw (SPEC-LAZY.md §3, C1–C4): het bestaande detailscherm met de proefomgeving-variant.
 */
export function TrialMeeting({
  flash,
  editRequest,
  busy,
  onNotesFile,
  onEdited,
  onStart,
  onFromCalendar,
  titleLayoutId,
  done = false,
  countUp = false,
  emptyPath = false,
}: {
  flash: Set<string>;
  editRequest: number;
  busy: boolean;
  onNotesFile: (file: File) => void;
  /** Titel, datumregel of deelnemers zelf aangepast: de assistent gaat verder met wat ontbreekt. */
  onEdited: () => void;
  onStart: () => void;
  onFromCalendar: (field: "when" | "participants") => void;
  /** Overgang van welkom naar app (Stap 0): titel als gedeeld element, "✓ Klaar", oplopende teller. */
  titleLayoutId?: string;
  done?: boolean;
  countUp?: boolean;
  /** "Start met een lege meeting" (C1d): andere uitleg in een leeg blok "Openstaande acties". */
  emptyPath?: boolean;
}) {
  const meeting = useGuestStore((s) => s.meeting);
  const actions = useGuestStore((s) => s.actions);
  const decisions = useGuestStore((s) => s.decisions);
  const step = useGuestStore((s) => s.step);
  const others = useGuestStore((s) => s.others);
  const account = useGuestStore((s) => s.account);
  const ready = step === 3 || step === "done";
  const confirming = step === 2 && actions.length > 0;

  const bundle = { meeting, actions, decisions };
  const shown = trialMeeting(bundle, { confirming });
  const people = trialPeople(bundle, account ? { name: `${account.firstName} ${account.lastName}` } : null);
  const ops = useMemo(() => trialOps(onStart), [onStart]);
  const empty = !meeting.name && !meeting.weekday && meeting.participants.length === 0 && actions.length === 0;
  const when = whenText(meeting);
  const day = weekdayName(meeting);
  const next = meeting.weekday ? formatShortDate(nextWeekday(meeting.weekday)) : null;

  const view: TrialView = {
    status: ready ? "Gepland" : "Concept",
    source: !ready && meeting.source ? `uit ${meeting.source === "outlook" ? "Outlook" : "Google"}` : null,
    empty,
    flash,
    proposedBlockIds: new Set(meeting.proposed ? meeting.topics.map((t) => t.id) : []),
    confirming,
    // "Start overleg" pas als er minstens één agendapunt is (SPEC-LAZY.md §3).
    canStart: hasAgendaItem(bundle),
    scheduleText: when
      ? [when, next && meeting.recurrence !== "once" ? `volgende ${next}` : next].filter(Boolean).join(" · ")
      : null,
    editRequest,
    onRename: (name) => {
      useGuestStore.getState().updateMeeting({ name });
      onEdited();
    },
    scheduleEditor: <WhenEditor meeting={meeting} onChange={onEdited} />,
    participantsEditor: <ParticipantsEditor meeting={meeting} onChange={onEdited} />,
    emptyActions: !ready && (
      <div className="flex flex-col gap-1 px-2 pb-1">
        <p className="text-sm text-ink-3">
          {emptyPath
            ? "Nog niets open. Acties die je tijdens de vergadering noteert, komen hier vanzelf terug tot ze af zijn."
            : "Wat vorige keer afgesproken werd en nog niet af is. Komt elk overleg vanzelf terug tot het af is."}
        </p>
        <p className="flex flex-wrap items-center text-[13px] text-ink-2">
          Sleep notities van je vorig overleg op deze plek, of
          <FilePicker variant="link" onFile={onNotesFile} disabled={busy} className="min-h-0 pr-0 pl-1 text-[13px]">
            kies een bestand
          </FilePicker>
          .
        </p>
      </div>
    ),
    onFileDrop: busy || ready ? null : onNotesFile,
    onAddTheme: (text) => useGuestStore.getState().addTopic(text),
    onFromCalendar: busy ? null : onFromCalendar,
    titleLayoutId,
    done,
    countUp,
  };

  return (
    <div className="app-theme flex flex-col gap-3.5" id={TRIAL_MEETING_ID}>
      {ready && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success-ink"
        >
          <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
          <span>
            Je {lowerFirst(meeting.name ?? "overleg")}
            {day ? ` van ${day}` : ""} staat klaar.{" "}
            {actions.length > 0 &&
              `${actions.length} ${actions.length === 1 ? "actie komt" : "acties komen"} vanzelf aan bod tot ze af zijn.`}
          </span>
        </div>
      )}
      {others.length > 0 && (
        <p className="text-sm text-ink-2">Ook klaar: {others.map((o) => o.meeting.name).join(", ")}</p>
      )}
      <MeetingDetail meeting={shown} trial={{ view, ops, people }} />
    </div>
  );
}
