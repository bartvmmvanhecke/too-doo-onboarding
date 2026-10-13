import type { GuestAction, GuestBundle } from "@/lib/assistant/types";
import { newBlock, newItem } from "@/lib/agenda";
import { findOwner } from "@/lib/extract";
import { formatShortDate } from "@/lib/date";
import type { Person } from "@/lib/mock-data";
import type { Meeting } from "@/lib/store";

export type ReviewStatus = NonNullable<GuestAction["reviewStatus"]>;

// TODO(api): laat de backend later de vaagheid bepalen; voorlopig één of twee woorden zonder persoon of werkwoord.
export function isVagueSuggestion(text: string, participants: Pick<Person, "name">[]): boolean {
  const words: string[] = text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const person = participants.some((p) => words.includes(p.name.split(" ")[0].toLocaleLowerCase()));
  const verb =
    /\b(bel|belt|bellen|vraag|vraagt|vragen|maak|maakt|maken|stuur|stuurt|sturen|controleer|controleert|controleren|bespreek|bespreekt|bespreken|bevestig|bevestigt|bevestigen|lever|levert|leveren|plan|plant|plannen|bestel|bestelt|bestellen|opvolgen|aanvragen|opvragen|versturen|uitwerken|bijwerken|nakijken|verbeteren|aanpassen|moet|is|zijn|doe|doet|doen)\b/i.test(
      text,
    );
  return words.length > 0 && words.length <= 2 && !person && !verb;
}

export function reviewGuestSuggestion(bundle: GuestBundle, id: string, status: ReviewStatus): GuestBundle {
  const suggestion = bundle.actions.find((a) => a.id === id);
  if (!suggestion) return bundle;
  const itemId = `review-agenda-${id}`;
  let topics = bundle.meeting.topics.map((t) => ({ ...t, items: (t.items ?? []).filter((i) => i.id !== itemId) }));
  if (status === "agenda") {
    const target = topics.find((t) => t.text === "Lopende zaken");
    if (target)
      topics = topics.map((t) =>
        t.id === target.id ? { ...t, items: [...t.items, { id: itemId, text: suggestion.text }] } : t,
      );
    else
      topics = [
        ...topics,
        { id: `review-lopende-zaken`, text: "Lopende zaken", items: [{ id: itemId, text: suggestion.text }] },
      ];
  }
  return {
    ...bundle,
    meeting: { ...bundle.meeting, topics },
    actions: bundle.actions.map((a) =>
      a.id === id
        ? {
            ...a,
            reviewStatus: status,
            ownerId: a.ownerId ?? findOwner(a.text, bundle.meeting.participants)?.person.id ?? null,
            confirmed: status === "confirmed",
            done: false,
            agendaItemId: status === "agenda" ? itemId : undefined,
          }
        : a,
    ),
  };
}

/** Dezelfde nakijktaak blijft bestaan na bewaren of starten van de vergadering. */
export function reviewSavedSuggestion(meeting: Meeting, id: string, status: ReviewStatus): Meeting {
  const suggestion = meeting.reviewSuggestions?.find((a) => a.id === id);
  if (!suggestion) return meeting;
  const itemId = `review-agenda-${id}`;
  let blocks = meeting.blocks.map((b) => ({ ...b, items: b.items.filter((i) => i.id !== itemId) }));
  if (status === "agenda") {
    const target = blocks.find((b) => b.title === "Lopende zaken");
    const item = newItem(suggestion.text, { id: itemId });
    if (target) blocks = blocks.map((b) => (b.id === target.id ? { ...b, items: [...b.items, item] } : b));
    else
      blocks = [
        ...blocks.slice(0, -1),
        { ...newBlock("topics", { title: "Lopende zaken" }), items: [item] },
        ...blocks.slice(-1),
      ];
  }
  const previous = meeting.actions.find((a) => a.id === id);
  const actions = meeting.actions.filter((a) => a.id !== id);
  if (status === "confirmed")
    actions.push(
      previous ?? {
        id,
        what: suggestion.text,
        ownerId: suggestion.ownerId,
        deadline: suggestion.deadline ? formatShortDate(suggestion.deadline) : "",
        done: false,
      },
    );
  return {
    ...meeting,
    blocks,
    actions,
    reviewSuggestions: meeting.reviewSuggestions?.map((a) =>
      a.id === id ? { ...a, reviewStatus: status, confirmed: status === "confirmed" } : a,
    ),
  };
}
