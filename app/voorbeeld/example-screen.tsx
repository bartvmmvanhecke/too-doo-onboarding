"use client";

import { useEffect, useState } from "react";
import { MeetingDetail } from "@/components/meeting/meeting-detail";
import { newBlock, newItem, type AgendaBlock } from "@/lib/agenda";
import { nextWeekday, toISO, WEEKDAY } from "@/lib/date";
import { useStore, type Meeting } from "@/lib/store";

export const EXAMPLE_MEETING_ID = "voorbeeld";

function exampleBlocks(): AgendaBlock[] {
  return [
    newBlock("actions"),
    newBlock("topics", {
      title: "Resultaten & KPI's",
      items: [
        newItem("Commerciële resultaten", { duration: 10, ownerIds: ["sd"], purposes: ["inform"] }),
        newItem("Productieresultaten", { duration: 15, ownerIds: ["pv"], purposes: ["discuss"] }),
      ],
    }),
    newBlock("topics", {
      title: "Mensen & organisatie",
      items: [newItem("Personeelsbehoefte Q4", { duration: 15, ownerIds: ["lm"], purposes: ["decide"] })],
    }),
    newBlock("topics", {
      title: "Rondvraag",
      subtitle: "Wat onverwacht ter sprake komt",
      items: [newItem("Varia", { duration: 5, purposes: ["inform"] })],
    }),
  ];
}

function exampleMeeting(blocks: AgendaBlock[]): Meeting {
  return {
    id: EXAMPLE_MEETING_ID,
    name: "Managementoverleg",
    type: "Management",
    recurrence: "weekly",
    date: toISO(nextWeekday(WEEKDAY.ma)),
    time: 14 * 60,
    duration: 50,
    participants: ["jp", "sd", "pv", "lm"],
    location: "Gent",
    room: "Taurus",
    description: "Budgetafspraken",
    actions: [],
    blocks,
    example: true,
    showWelcome: false,
    invited: false,
    held: false,
  };
}

/**
 * Scherm 2d · Rondkijken met voorbeelddata: de echte detailpagina van een vergadering,
 * met een voorbeeldagenda, rondleiding en checklist. Niets hiervan wordt bewaard.
 */
export function ExampleScreen() {
  const [seed] = useState(exampleBlocks);
  const meeting = useStore((s) => s.meetings.find((m) => m.id === EXAMPLE_MEETING_ID));

  useEffect(() => {
    const { putMeeting, removeMeeting } = useStore.getState();
    putMeeting(exampleMeeting(seed));
    return () => removeMeeting(EXAMPLE_MEETING_ID);
  }, [seed]);

  if (!meeting) return null;
  return <MeetingDetail meeting={meeting} example={{ seed }} />;
}
