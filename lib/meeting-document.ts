import { newBlock, newItem, type AgendaBlock } from "@/lib/agenda";
import type { Meeting } from "@/lib/store";

export function parsePastedLines(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => ({
      indented: /^\s+/.test(line),
      text: line.trim().replace(/^(?:[-•*]|\d+[.)])\s+/, ""),
    }));
}
export const DOCUMENT_TEMPLATES = [
  "Lopende zaken + Varia",
  "Agenda van een vorige vergadering",
  "1-op-1",
  "Directievergadering met tijden",
] as const;
export function documentTemplate(name: string, meeting: Meeting, meetings: Meeting[]): AgendaBlock[] {
  if (name === DOCUMENT_TEMPLATES[1]) {
    const previous = meetings.find(
      (m) => m.id !== meeting.id && m.name === meeting.name && m.blocks.some((b) => b.items.length),
    );
    if (previous)
      return previous.blocks
        .filter((b) => b.kind !== "actions")
        .map((b) =>
          newBlock(b.kind, {
            title: b.title,
            duration: b.duration,
            items: b.items.map((i) =>
              newItem(i.text, { ownerIds: i.ownerIds, purposes: i.purposes, duration: i.duration }),
            ),
          }),
        );
    // TODO(api): laad de agenda van de vorige vergadering via het historische agenda-endpoint.
    return [newBlock("topics", { title: "Lopende zaken", items: [newItem("Opvolging van de vorige vergadering")] })];
  }
  if (name === DOCUMENT_TEMPLATES[2])
    return [
      newBlock("topics", {
        title: "1-op-1",
        items: [newItem("Hoe gaat het?"), newItem("Waar heb je hulp bij nodig?"), newItem("Volgende stappen")],
      }),
    ];
  if (name === DOCUMENT_TEMPLATES[3])
    return [
      newBlock("topics", {
        title: "Directievergadering",
        items: [
          newItem("Resultaten", { duration: 15 }),
          newItem("Beslissingen", { duration: 30, purposes: ["decide"] }),
          newItem("Volgende stappen", { duration: 15 }),
        ],
      }),
    ];
  return [
    newBlock("topics", { title: "Lopende zaken", items: [newItem("Stand van zaken")] }),
    newBlock("topics", { title: "Varia", items: [newItem("Wat nog ter tafel komt")] }),
  ];
}
