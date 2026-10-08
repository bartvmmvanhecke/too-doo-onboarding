/** Afgeleide gegevens voor variant B (SPEC-FLOWS.md §4, /b/structuur). */
import { SERIES, USER_PERSON_ID, type Series } from "@/lib/mock-data";

const WEEKS_PER_MONTH = 52 / 12;

/** Aanbevolen start: de reeks die de gebruiker organiseert met de meeste deelnemers. */
export function recommendedSeries(series: Series[] = SERIES): Series {
  const own = series.filter((s) => s.organizer);
  return [...(own.length ? own : series)].sort((a, b) => b.participants.length - a.participants.length)[0];
}

/** Standaard aangevinkt: de aanbevolen reeks + andere eigen reeksen met minstens 4 deelnemers. */
export function defaultSelection(series: Series[] = SERIES): string[] {
  const rec = recommendedSeries(series);
  return series.filter((s) => s.id === rec.id || (s.organizer && s.participants.length >= 4)).map((s) => s.id);
}

export function perMonth(s: Series): number {
  switch (s.rule.kind) {
    case "weekly":
      return WEEKS_PER_MONTH;
    case "biweekly":
      return WEEKS_PER_MONTH / 2;
    case "monthly":
      return 1;
  }
}

/** "We vonden 5 vaste overleggen in je agenda, met 11 collega's, samen ongeveer 14 uur per maand." */
export function structureSummary(series: Series[] = SERIES): { count: number; colleagues: number; hours: number } {
  const colleagues = new Set(series.flatMap((s) => s.participants).filter((p) => p !== USER_PERSON_ID));
  const hours = series.reduce((sum, s) => sum + (perMonth(s) * s.duration) / 60, 0);
  return { count: series.length, colleagues: colleagues.size, hours: Math.round(hours) };
}
