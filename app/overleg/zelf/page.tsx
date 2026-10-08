import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { ManualScreen } from "./manual-screen";

export const metadata: Metadata = { title: "Overleg zelf invullen · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <ManualScreen />
    </Hydrated>
  );
}
