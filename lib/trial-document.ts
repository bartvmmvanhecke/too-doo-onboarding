"use client";

import type { MeetingOps } from "@/components/meeting/meeting-context";
import { ME } from "@/lib/assistant/types";
import { useGuestStore } from "@/lib/guest-store";
import { USER_PERSON_ID } from "@/lib/mock-data";
import { createDraftStore, type Meeting } from "@/lib/store";
import { trialMeeting, VARIA_BLOCK } from "@/lib/trial-meeting";

export function currentTrialMeeting(): Meeting {
  const guest = useGuestStore.getState();
  return trialMeeting(guest, { confirming: guest.step === 2 && guest.actions.length > 0 });
}

/** Write document edits back to the same draft used by the assistant and variant A. */
function saveDocument(meeting: Meeting) {
  const guest = useGuestStore.getState();
  const decisionIds = new Set(guest.decisions.map((d) => d.id));
  const items = (block: Meeting["blocks"][number]) => block.items.filter((i) => !decisionIds.has(i.id));
  const varia = meeting.blocks.find((b) => b.id === VARIA_BLOCK);
  const actionsBlock = meeting.blocks.find((b) => b.kind === "actions");
  useGuestStore.setState({
    // Links iets bewerkt: de doelchips verdwijnen (C0j–C0m).
    goalChips: false,
    meeting: {
      ...guest.meeting,
      ...(guest.meeting.actionsDuration !== undefined ? { actionsDuration: actionsBlock?.duration ?? null } : {}),
      topics: meeting.blocks
        .filter((b) => b.kind !== "actions" && b.id !== VARIA_BLOCK)
        .map((b) => ({
          // Wat enkel de gast-state kent (rondje, label "nieuw"), blijft behouden.
          ...guest.meeting.topics.find((t) => t.id === b.id),
          id: b.id,
          text: b.title,
          kind: b.kind,
          duration: b.duration,
          presenterId: b.presenterId,
          ...(b.purposes ? { purposes: b.purposes } : {}),
          ...(b.subtitle !== undefined ? { subtitle: b.subtitle } : {}),
          items: items(b),
        })),
      variaItems: varia ? items(varia) : [],
      variaPresenterId: varia?.presenterId ?? null,
    },
    decisions: guest.decisions.map((d) => {
      const block = meeting.blocks.find((b) => b.items.some((i) => i.id === d.id));
      const item = block?.items.find((i) => i.id === d.id);
      return item ? { ...d, ...item, topicId: block!.id } : { ...d, confirmed: false };
    }),
    actions: meeting.actions.map((a) => {
      const previous = guest.actions.find((x) => x.id === a.id);
      return {
        ...previous,
        id: a.id,
        text: a.what,
        ownerId: a.ownerId === USER_PERSON_ID ? ME : a.ownerId,
        deadline:
          previous && a.deadline === currentTrialMeeting().actions.find((x) => x.id === a.id)?.deadline
            ? previous.deadline
            : a.deadline || null,
        confirmed: guest.step === 2 ? !a.done : (previous?.confirmed ?? true),
        done: guest.step === 2 ? previous?.done : a.done,
        ownerLater: previous?.ownerLater ?? false,
      };
    }),
  });
}

/** Reuse the app's document operations in an isolated, non-persisted store. */
export function trialDocumentOps(base: MeetingOps): MeetingOps {
  const draft = createDraftStore();
  const keys = [
    "putMeeting",
    "addAgendaItem",
    "updateItem",
    "removeItem",
    "moveItem",
    "addBlock",
    "updateBlock",
    "removeBlock",
    "moveBlock",
    "addEntry",
    "updateEntry",
    "removeEntry",
    "addAction",
  ] as const;
  const operations = Object.fromEntries(
    keys.map((key) => [
      key,
      (...args: unknown[]) => {
        draft.setState({ meetings: [currentTrialMeeting()] });
        const operation = draft.getState()[key] as (...args: unknown[]) => unknown;
        const result = operation(...args);
        saveDocument(draft.getState().meetings[0]);
        return result;
      },
    ]),
  );
  return { ...base, ...operations } as MeetingOps;
}
