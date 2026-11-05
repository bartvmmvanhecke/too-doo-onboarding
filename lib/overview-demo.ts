import { addDays, toISO, today } from "@/lib/date";
import { SERIES, seriesSchedule } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

/**
 * Prototype-menu "Overzicht met vergaderingen": ingelogd, met een paar afgelopen en aankomende
 * vergaderingen, zodat /app meteen het overzicht toont (in plaats van de lege staat).
 */
export function seedMeetingOverview() {
  const { startFlow, createMeeting } = useStore.getState();
  startFlow(null, { demo: { login: "success", calendar: "series" }, signedIn: true, start: "/app" });
  const day = (n: number) => toISO(addDays(today(), n));
  const productie = SERIES[0];

  createMeeting(
    { name: "Operations", recurrence: "once", date: day(-14), time: 10 * 60, duration: 90 },
    { type: "Operationeel overleg", participants: ["jp"], showWelcome: false },
  );
  createMeeting(
    { name: "Managementoverleg", recurrence: "biweekly", date: day(-6), time: 14 * 60, duration: 90 },
    { type: "Managementoverleg", participants: ["jp", "lm", "kd", "sd"], showWelcome: false, held: true },
  );
  createMeeting(
    { name: "Sync Stijn", recurrence: "once", date: day(7), time: 10 * 60, duration: 30 },
    { type: "Flex vergadering", participants: ["jp", "sd"], showWelcome: false },
  );
  createMeeting(seriesSchedule(productie), {
    type: "Operationeel overleg",
    seriesId: productie.id,
    participants: productie.participants,
    showWelcome: false,
  });
}
