import { expect, it } from "vitest";
import type { Meeting } from "./store";
import { buildDigest, runDigestJob } from "./meeting-digest";
const now = Date.parse("2026-11-09T07:30:00Z");
const m = {
  id: "m",
  name: "Vergadering",
  date: "2026-11-09",
  startedBy: "chair",
  endedAt: now - 1,
  followUpStatus: "pending",
  endReason: "auto",
  blocks: [],
  actions: [],
} as unknown as Meeting;
const run = (patch = {}) => runDigestJob({ meetings: [m], userId: "chair", now, ...patch });
it("verstuuurt alleen op maandag vanaf 08:30 Brussel en maximaal eenmaal per periode", () => {
  expect(run()).not.toBeNull();
  expect(run({ now: now - 1 })).toBeNull();
  expect(run({ now: now + 86400000 })).toBeNull();
  expect(run({ frequency: "off" })).toBeNull();
  expect(run({ lastSentAt: now })).toBeNull();
  expect(run({ frequency: "biweekly", lastSentAt: now - 7 * 86400000 })).toBeNull();
  expect(run({ frequency: "biweekly", lastSentAt: now - 14 * 86400000 })).not.toBeNull();
});
it("respecteert zomertijd in Brussel", () => {
  const summer = Date.parse("2026-07-06T06:30:00Z");
  expect(run({ now: summer, meetings: [{ ...m, endedAt: summer - 1 }] })).not.toBeNull();
  expect(run({ now: summer - 1 })).toBeNull();
});
it("stuurt geen lege mail en sluit andere voorzitters en oude pending uit", () => {
  expect(run({ meetings: [] })).toBeNull();
  expect(run({ userId: "other" })).toBeNull();
  expect(run({ meetings: [{ ...m, endedAt: now - 14 * 86400000 }] })).toBeNull();
});
it("bundelt alleen eigen open acties die te laat of deze week te doen zijn", () => {
  const actions = [
    { id: "late", what: "Te laat", ownerId: "chair", deadline: "2026-11-08", done: false },
    { id: "week", what: "Deze week", ownerId: "chair", deadline: "13 nov", done: false },
    { id: "later", what: "Later", ownerId: "chair", deadline: "2026-11-16", done: false },
    { id: "other", what: "Andere", ownerId: "other", deadline: "2026-11-10", done: false },
  ];
  const content = buildDigest([{ ...m, actions }], "chair", now);
  expect(content.actions.map((a) => a.text)).toEqual(["Te laat", "Deze week"]);
  expect(content.actions[0].late).toBe(true);
  expect(content.actions[1].late).toBe(false);
});
