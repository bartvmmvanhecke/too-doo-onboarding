"use client";

import { useState } from "react";
import { MeetingsOverviewPrototypeBar } from "@/components/prototype/meetings-overview-prototype-bar";
import { useStore } from "@/lib/store";
import { EmptyScreen } from "./empty-screen";
import { MeetingsList } from "./meetings-list";
import { StartScreen } from "./start-screen";

/**
 * /app: met vergaderingen de lijst; zonder de lege staat met de vijf startkeuzes. Prototype-optie
 * "Alternatief eerste scherm lege vergadering": het oude scherm "Zet je eerste vaste overleg klaar".
 */
export function VergaderingenScreen() {
  const [revision, setRevision] = useState(0);
  const hasMeetings = useStore((s) => s.meetings.length > 0);
  const alt = useStore((s) => !!s.demo.altEmpty);
  return (
    <>
      <MeetingsOverviewPrototypeBar onLoad={() => setRevision((value) => value + 1)} />
      {hasMeetings ? <MeetingsList key={revision} /> : alt ? <EmptyScreen /> : <StartScreen />}
    </>
  );
}
