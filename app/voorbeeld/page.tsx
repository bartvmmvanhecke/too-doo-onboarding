import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { Hydrated } from "@/components/hydrated";
import { ExampleScreen } from "./example-screen";

export const metadata: Metadata = { title: "Rondkijken met voorbeelddata · too-doo" };

export default function Page() {
  return (
    <AppShell>
      <Hydrated>
        <ExampleScreen />
      </Hydrated>
    </AppShell>
  );
}
