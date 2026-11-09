"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { MeetingWrapUp } from "./meeting-wrap-up";
export function WrapUpPage() {
  const { id } = useParams<{ id: string }>();
  const meeting = useStore((s) => s.meetings.find((m) => m.id === id));
  if (!meeting)
    return (
      <div className="app-theme p-8">
        <p>Vergadering niet gevonden.</p>
        <Link href="/app">Vergaderingen</Link>
      </div>
    );
  if (!meeting.endedAt)
    return (
      <div className="app-theme p-8">
        <p>Deze vergadering is nog niet afgesloten.</p>
        <Link href={`/app/overleg/${id}`}>Terug naar de vergadering</Link>
      </div>
    );
  return <MeetingWrapUp meeting={meeting} />;
}
