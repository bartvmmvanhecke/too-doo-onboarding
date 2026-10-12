import type { Person } from "@/lib/mock-data";
export interface Suggestion {
  id: string;
  kind: "action" | "decision";
  title: string;
  ownerId: string | null;
  date: string;
  dateLabel: string;
}
function dateProposal(text: string, meetingDate: string) {
  const base = new Date(`${meetingDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) return { date: "", dateLabel: "" };
  const days = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const weekday = days.findIndex((d) => new RegExp(`\\b${d}\\b`, "i").test(text));
  let label = "";
  if (weekday >= 0) {
    base.setDate(base.getDate() + ((weekday - base.getDay() + 7) % 7));
    label = days[weekday];
  } else if (/volgende week/i.test(text)) {
    base.setDate(base.getDate() + 7);
    label = "volgende week";
  } else {
    const match = text.match(
      /(?:tegen|voor)\s+(\d{1,2})\s+(jan|feb|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*(?:\s+(20\d{2}))?/i,
    );
    if (match) {
      const months = ["jan", "feb", "maa", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
      const month = months.indexOf(match[2].toLowerCase());
      const year = match[3] ? Number(match[3]) : base.getFullYear();
      const target = new Date(year, month, Number(match[1]), 12);
      if (!match[3] && target < base) target.setFullYear(year + 1);
      if (target.getMonth() !== month || target.getDate() !== Number(match[1])) return { date: "", dateLabel: "" };
      base.setTime(target.getTime());
      label = `${match[1]} ${match[2]}`;
    }
  }
  if (!label) return { date: "", dateLabel: "" };
  return {
    date: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`,
    dateLabel: label,
  };
}
/** TODO(api): vervang deze regelgebaseerde mock door het LLM-endpoint. Voorstellen worden nooit opgeslagen. */
export function suggestFromLine(
  text: string,
  { participants, meetingDate }: { participants: Person[]; meetingDate: string },
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const verbs: Record<string, string> = {
    belt: "Bel",
    maakt: "Maak",
    stuurt: "Stuur",
    mailt: "Mail",
    vraagt: "Vraag",
    regelt: "Regel",
    plant: "Plan",
    controleert: "Controleer",
    bespreekt: "Bespreek",
    bestelt: "Bestel",
    neemt: "Neem",
    werkt: "Werk",
    doet: "Doe",
    volgt: "Volg",
  };
  for (const sentence of text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (/\b(beslissen|beslist|kiezen|kiest|kiezen voor|akkoord over)\b/i.test(sentence))
      suggestions.push({
        id: `decision:${sentence}`,
        kind: "decision",
        title: sentence,
        ownerId: null,
        ...dateProposal(sentence, meetingDate),
      });
    const expression = new RegExp(`\\b([A-ZÀ-ÖØ-Þ][\\p{L}-]+)\\s+(${Object.keys(verbs).join("|")})\\s+(.+)`, "gu");
    for (const match of sentence.matchAll(expression)) {
      const person = participants.find((p) => p.name.split(" ")[0].toLowerCase() === match[1].toLowerCase());
      const title = `${verbs[match[2]]} ${match[3]}`;
      suggestions.push({
        id: `action:${match[0]}`,
        kind: "action",
        title,
        ownerId: person?.id ?? null,
        ...dateProposal(sentence, meetingDate),
      });
    }
  }
  return suggestions;
}
