/** Tijden worden bewaard als minuten na middernacht (480 = 08:00). */
export type Minutes = number;

export function formatTime(m: Minutes): string {
  const n = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(n / 60);
  const mm = n % 60;
  return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

/** "08:00–09:00" */
export function formatTimeRange(start: Minutes, duration: Minutes): string {
  return formatTime(start) + "–" + formatTime(start + duration);
}

/**
 * Leest een getypt uur: "8u", "8h", "0800", "800", "8:30", "8.30", "8u30", "20".
 * Geeft null bij ongeldige invoer.
 */
export function parseTime(input: string): Minutes | null {
  const s = String(input ?? "")
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[uh.]/, ":");
  if (!s) return null;
  let h: number;
  let m: number;
  if (/^\d{1,2}:\d{0,2}$/.test(s)) {
    const [hh, mm] = s.split(":");
    h = parseInt(hh, 10);
    m = parseInt(mm || "0", 10);
  } else if (/^\d{3,4}$/.test(s)) {
    h = parseInt(s.slice(0, s.length - 2), 10);
    m = parseInt(s.slice(-2), 10);
  } else if (/^\d{1,2}$/.test(s)) {
    h = parseInt(s, 10);
    m = 0;
  } else {
    return null;
  }
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Uitklaplijst: 06:00 tot 20:00 per kwartier. */
export const TIME_SLOTS: Minutes[] = Array.from({ length: (1200 - 360) / 15 + 1 }, (_, i) => 360 + i * 15);

export function durationLabel(d: Minutes): string {
  if (d < 60) return `${d} min`;
  const h = Math.floor(d / 60);
  const m = d % 60;
  if (m === 0) return h === 1 ? "1 uur" : `${h} uur`;
  return `${h}u${String(m).padStart(2, "0")}`;
}
