import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { ActionsScreen } from "./actions-screen";

export const metadata: Metadata = { title: "Openstaande acties · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <ActionsScreen />
    </Hydrated>
  );
}
