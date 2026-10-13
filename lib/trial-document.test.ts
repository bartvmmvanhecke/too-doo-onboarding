import { beforeEach, expect, test } from "vitest";
import { useGuestStore } from "./guest-store";
import { createDraftStore } from "./store";
import { currentTrialMeeting, trialDocumentOps } from "./trial-document";
import { bundleToMeeting } from "./guest-transfer";

beforeEach(() => useGuestStore.getState().reset());

test("document edits, nested actions and ownership survive the guest-to-account transfer", () => {
  useGuestStore.getState().startEmpty();
  const ops = trialDocumentOps(createDraftStore().getState());
  const meeting = currentTrialMeeting();
  const block = meeting.blocks.find((b) => b.kind === "topics")!;
  const itemId = ops.addAgendaItem(meeting.id, block.id, "Offerte bespreken");
  const entryId = ops.addEntry(meeting.id, itemId, {
    kind: "action",
    text: "Offerte maken",
    ownerId: "jp",
    date: "2026-10-20",
  });
  ops.updateEntry(meeting.id, itemId, entryId, { text: "Offerte versturen" });
  const current = currentTrialMeeting();
  const entry = current.blocks.flatMap((b) => b.items).find((i) => i.id === itemId)!.entries[0];
  expect(current.actions[0]).toMatchObject({ id: entry.actionId, what: "Offerte versturen", ownerId: "jp" });
  const saved = bundleToMeeting(useGuestStore.getState());
  expect(saved.blocks.flatMap((b) => b.items)[0].entries[0].actionId).toBe(saved.actions[0].id);
  expect(saved.actions[0].what).toBe("Offerte versturen");
  ops.removeEntry(meeting.id, itemId, entryId);
  expect(currentTrialMeeting().actions).toEqual([]);
});

test("onboarding agenda goals, owners and duration survive document edits and account transfer", () => {
  useGuestStore.getState().startEmpty();
  const ops = trialDocumentOps(createDraftStore().getState());
  const meeting = currentTrialMeeting();
  const block = meeting.blocks.find((b) => b.kind === "topics")!;
  const itemId = ops.addAgendaItem(meeting.id, block.id, "Order Peeters");
  const patch = { purposes: ["discuss", "inform"] as const, ownerIds: ["jp", "sd"], duration: 20 };
  ops.updateItem(meeting.id, itemId, { ...patch, purposes: [...patch.purposes] });
  ops.updateItem(meeting.id, itemId, { text: "Order Peeters opvolgen" });
  const saved = bundleToMeeting(useGuestStore.getState());
  expect(saved.blocks.flatMap((b) => b.items).find((i) => i.text === "Order Peeters opvolgen")).toMatchObject(patch);
  ops.updateItem(meeting.id, itemId, { purposes: [], ownerIds: [], duration: null });
  expect(bundleToMeeting(useGuestStore.getState()).blocks.flatMap((b) => b.items)[0]).toMatchObject({
    purposes: [],
    ownerIds: [],
    duration: null,
  });
});
