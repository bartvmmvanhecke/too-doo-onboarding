import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { Hydrated } from "@/components/hydrated";
import { OverviewScreen } from "./overview-screen";

export const metadata: Metadata = { title: "Overzicht · too-doo" };

export default function Page() {
  return (
    <AppShell>
      <Hydrated>
        <OverviewScreen />
      </Hydrated>
    </AppShell>
  );
}
