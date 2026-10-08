import { Suspense } from "react";
import { Hydrated } from "@/components/hydrated";
import type { Metadata } from "next";
import { MeetingScreen } from "./meeting-screen";

export const metadata: Metadata = { title: "Overleg · too-doo" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Hydrated>
        <MeetingScreen />
      </Hydrated>
    </Suspense>
  );
}
