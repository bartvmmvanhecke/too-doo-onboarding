import { describe, expect, it } from "vitest";
import { emptyMeeting } from "./assistant/engine";
import type { GuestBundle, GuestItemMeta } from "./assistant/types";
import { bundleToMeeting } from "./guest-transfer";
import { addGuestItem, guestBlocks, moveGuestItem, updateGuestItem, DEFAULT_BLOCK, VARIA_BLOCK } from "./trial-meeting";

const configuration: GuestItemMeta = {
  purposes: ["discuss", "inform", "decide"],
  ownerIds: ["jp", "sd"],
  duration: 20,
};

const shownItems = (bundle: GuestBundle) => guestBlocks(bundle, { stableIds: true }).flatMap((b) => b.items);

describe("onboarding agenda configuration", () => {
  it("keeps item configuration when moving between themes and transferring to Meeting Detail", () => {
    let bundle: GuestBundle = {
      meeting: addGuestItem(emptyMeeting(), DEFAULT_BLOCK, "Order Peeters"),
      actions: [],
      decisions: [],
    };
    const item = shownItems(bundle)[0];
    bundle.meeting = addGuestItem(bundle.meeting, VARIA_BLOCK, "Bedrijfsfeest");
    bundle.meeting = updateGuestItem(bundle.meeting, item.id, configuration);
    expect(shownItems(bundle)[0]).toMatchObject(configuration);
    expect(shownItems(bundle)[1]).toMatchObject({ purposes: [], ownerIds: [], duration: null });

    bundle = { ...bundle, ...moveGuestItem(bundle, item.id, VARIA_BLOCK, 1) };
    // Same JSON round trip used by the persisted guest store.
    bundle = JSON.parse(JSON.stringify(bundle));
    const saved = bundleToMeeting(bundle);
    const target = saved.blocks.find((b) => b.title === "Varia")!;
    expect(target.items.map((i) => i.text)).toEqual(["Bedrijfsfeest", "Order Peeters"]);
    expect(target.items[1]).toMatchObject(configuration);
    expect(target.items[0]).toMatchObject({ purposes: [], ownerIds: [], duration: null });
    expect(saved.blocks.find((b) => b.title === "Lopende zaken")!.items).toEqual([]);
  });

  it("preserves modified and cleared selections, including confirmed decisions", () => {
    const bundle: GuestBundle = {
      meeting: addGuestItem(emptyMeeting(), VARIA_BLOCK, "Planning"),
      actions: [],
      decisions: [{ id: "decision", text: "Kies leverancier", confirmed: true, ...configuration }],
    };
    const item = shownItems(bundle).find((i) => i.text === "Planning")!;
    bundle.meeting = updateGuestItem(bundle.meeting, item.id, configuration);
    bundle.meeting = updateGuestItem(bundle.meeting, item.id, { purposes: [], ownerIds: [], duration: null });
    const savedItems = bundleToMeeting(bundle).blocks.flatMap((b) => b.items);
    expect(savedItems.find((i) => i.text === "Planning")).toMatchObject({ purposes: [], ownerIds: [], duration: null });
    expect(savedItems.find((i) => i.text === "Kies leverancier")).toMatchObject(configuration);
  });
});
