import { parseDateInput, toISO, type ISODate } from "@/lib/date";
import { parseTime, type Minutes } from "@/lib/time";

/**
 * "Wanneer" in de lege toestand: "ma 08:00", "maandag 8u", "13/10 8:30", "ma" of "8u".
 * Null bij ongeldige invoer; lege invoer geeft { date: null, time: null }.
 */
export function parseWhen(input: string): { date: ISODate | null; time: Minutes | null } | null {
  const s = input.trim();
  if (!s) return { date: null, time: null };
  const tokens = s.split(/\s+/);
  if (tokens.length === 1 && /^[\d.:uh]+$/i.test(s)) {
    const t = parseTime(s);
    return t === null ? null : { date: null, time: t };
  }
  const asDate = parseDateInput(s);
  if (asDate) return { date: toISO(asDate), time: null };
  if (tokens.length === 1) return null;
  const time = parseTime(tokens[tokens.length - 1].replace(/^om$/, ""));
  const datePart = tokens.slice(0, -1).filter((t) => t !== "om").join(" ");
  const date = parseDateInput(datePart);
  if (time === null || !date) return null;
  return { date: toISO(date), time };
}
