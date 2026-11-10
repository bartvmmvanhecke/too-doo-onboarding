import { newItem } from "@/lib/agenda";
export const DIRECTIE_AGENDA_TITLES = [
  "Opening en vorige besluiten",
  "Budgetvoorstel Q1",
  "Strategische prioriteiten",
  "Veiligheidsaudit",
  "Opleidingsbudget Q4",
  "Varia",
];
export const directieAgendaItems = () => DIRECTIE_AGENDA_TITLES.map((text) => newItem(text, { duration: 10 }));
