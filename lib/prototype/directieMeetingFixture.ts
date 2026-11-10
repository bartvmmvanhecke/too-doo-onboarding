import { newBlock, newItem, type Entry } from "../agenda";
import { AVATAR_COLORS, type Person } from "../mock-data";
import type { Action } from "../store";

export const DIRECTIE_PEOPLE: Person[] = ["Rashmi", "Kelvin", "Florianne"].map((name, i) => ({
  id: `wrap-demo-${i}`,
  name,
  initials: name.slice(0, 2).toUpperCase(),
  color: AVATAR_COLORS[i],
}));

export function createDirectieAgenda(start: number, elapsed = 0) {
  const entry = (id: string, kind: Entry["kind"], text: string, ownerId: string | null, date: string): Entry => ({
    id,
    kind,
    text,
    ownerId,
    date,
    createdAt: start + elapsed * 60000,
    ...(kind === "action" ? { actionId: `action-${id}` } : {}),
  });
  const entries: Record<number, Entry[]> = {
    2: [entry("budget", "action", "Budgetvoorstel Q1 bijwerken", DIRECTIE_PEOPLE[0].id, "18 nov")],
    4: [
      entry("audit", "decision", "Veiligheidsaudit uitbesteden aan externe partner", null, "15 dec"),
      entry("offertes", "action", "Offertes externe auditors opvragen", DIRECTIE_PEOPLE[1].id, "20 nov"),
    ],
    5: [
      entry("opleiding", "decision", "Opleidingsbudget Q4 vrijgeven", null, "30 nov"),
      entry(
        "inschrijvingen",
        "action",
        "Inschrijvingen opleiding verzamelen per afdeling",
        DIRECTIE_PEOPLE[2].id,
        "20 nov",
      ),
      entry("communicatie", "action", "Communicatie naar teams over audit", null, "25 nov"),
    ],
    6: [entry("kerst", "note", "Kerstdrink valt in week 51", null, "")],
  };
  const titles = [
    "Opening en vorige besluiten",
    "Budgetvoorstel Q1",
    "Strategische prioriteiten",
    "Veiligheidsaudit",
    "Opleidingsbudget Q4",
    "Varia",
  ];

  const actions: Action[] = Object.values(entries)
    .flat()
    .filter((entry) => entry.kind === "action")
    .map((entry) => ({
      id: entry.actionId!,
      what: entry.text,
      ownerId: entry.ownerId,
      deadline: entry.date,
      done: false,
    }));
  return {
    actions,
    blocks: [
      newBlock("topics", {
        id: "wrap-demo-block",
        title: "Lopende zaken",
        items: titles.map((text, index) =>
          newItem(text, {
            id: `wrap-demo-${index + 1}`,
            duration: 10,
            ownerIds: [],
            runStatus: "open",
            entries: entries[index + 1] ?? [],
          }),
        ),
      }),
    ],
  };
}
