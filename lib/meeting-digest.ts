import type { Meeting } from "./store";
import { agendaItems, isChair, isHandled, isPending } from "./meeting-wrap-up";
import { DIGEST_DAY, DIGEST_DEFAULT, DIGEST_TIME } from "./meetingWrapUp.config";
import { parseDateInput } from "./date";
export type DigestFrequency = "weekly" | "biweekly" | "off";
export interface DigestContent {
  pending: { id: string; name: string; date: string; context: string; href: string }[];
  actions: { id: string; text: string; deadline: string; late: boolean; href: string }[];
}
function localParts(now: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (key: string) => Number(parts.find((p) => p.type === key)!.value);
  return { day: Date.UTC(get("year"), get("month") - 1, get("day")), minute: get("hour") * 60 + get("minute") };
}
export function buildDigest(meetings: Meeting[], userId: string, now: number): DigestContent {
  const today = localParts(now).day;
  const weekEnd = today + ((7 - new Date(today).getUTCDay()) % 7) * 86_400_000;
  const actions: DigestContent["actions"] = [];
  for (const m of meetings)
    for (const a of m.actions) {
      if (a.done || a.ownerId !== userId || !a.deadline) continue;
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(a.deadline)
        ? new Date(`${a.deadline}T12:00:00Z`)
        : parseDateInput(a.deadline, new Date(today - 180 * 86_400_000));
      if (!parsed || Number.isNaN(parsed.getTime())) continue;
      const due = /^\d{4}-\d{2}-\d{2}$/.test(a.deadline)
        ? Date.parse(`${a.deadline}T00:00:00Z`)
        : Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      if (due <= weekEnd)
        actions.push({
          id: `${m.id}:${a.id}`,
          text: a.what,
          deadline: a.deadline,
          late: due < today,
          href: `/app/overleg/${m.id}`,
        });
    }
  return {
    pending: meetings
      .filter((m) => isChair(m, userId) && isPending(m, now))
      .map((m) => ({
        id: m.id,
        name: m.name,
        date: m.date ?? "",
        context: `${m.endReason === "auto" ? "Automatisch afgesloten" : "Afgesloten"} · ${agendaItems(m).filter((i) => isHandled(m, i.id)).length} van ${agendaItems(m).length} voltooid`,
        href: `/app/overleg/${m.id}`,
      })),
    actions,
  };
}
/** Server-worker contract. TODO(api): atomic outbox/deduplication and delivery with the user's notification preference. */
export function runDigestJob({
  meetings,
  userId,
  now,
  frequency = DIGEST_DEFAULT,
  lastSentAt,
}: {
  meetings: Meeting[];
  userId: string;
  now: number;
  frequency?: DigestFrequency;
  lastSentAt?: number;
}): { content: DigestContent; sentAt: number } | null {
  if (frequency === "off") return null;
  const local = localParts(now);
  const [hour, minute] = DIGEST_TIME.split(":").map(Number);
  if (new Date(local.day).getUTCDay() !== { monday: 1 }[DIGEST_DAY] || local.minute !== hour * 60 + minute) return null;
  if (
    lastSentAt !== undefined &&
    local.day - localParts(lastSentAt).day < (frequency === "biweekly" ? 14 : 7) * 86_400_000
  )
    return null;
  const content = buildDigest(meetings, userId, now);
  return content.pending.length || content.actions.length ? { content, sentAt: now } : null;
}
