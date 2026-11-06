"use client";

import { useStore } from "@/lib/store";
import { EmptyScreen } from "./empty-screen";
import { MeetingsList } from "./meetings-list";
import { StartScreen } from "./start-screen";

/**
 * /app: met vergaderingen de lijst; zonder de lege staat met de vijf startkeuzes. Prototype-optie
 * "Alternatief eerste scherm lege vergadering": het oude scherm "Zet je eerste vaste overleg klaar".
 */
export function VergaderingenScreen() {
  const hasMeetings = useStore((s) => s.meetings.length > 0);
  const alt = useStore((s) => !!s.demo.altEmpty);
  if (hasMeetings) return <MeetingsList />;
  return alt ? <EmptyScreen /> : <StartScreen />;
}
